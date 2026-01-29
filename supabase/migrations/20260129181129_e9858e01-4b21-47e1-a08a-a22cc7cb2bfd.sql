-- Notifications + rules + feedback messages

-- 1) Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Notification rules (per-user)
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'low_stock' | 'project_deadline' | 'maintenance'
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notification rules"
ON public.notification_rules
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their notification rules"
ON public.notification_rules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notification rules"
ON public.notification_rules
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notification rules"
ON public.notification_rules
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notification_rules_updated_at ON public.notification_rules;
CREATE TRIGGER update_notification_rules_updated_at
BEFORE UPDATE ON public.notification_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id ON public.notification_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON public.notification_rules (type);

-- 3) Notifications (per-user)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'low_stock' | 'project_deadline' | 'maintenance' | 'system'
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info'|'warning'|'critical' (UI only)
  entity_table TEXT,
  entity_id UUID,
  dedupe_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedupe (best-effort)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
ON public.notifications (user_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON public.notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_archived_at ON public.notifications (user_id, archived_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- no direct inserts/deletes from client; created via triggers/system

-- 4) Feedback / communication messages (per-user)
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open'|'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their feedback messages"
ON public.feedback_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their feedback messages"
ON public.feedback_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5) Helper: create notifications for all admins (user_roles.role='admin')
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  _type TEXT,
  _title TEXT,
  _body TEXT,
  _severity TEXT,
  _entity_table TEXT,
  _entity_id UUID,
  _dedupe_key TEXT,
  _metadata JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, severity, entity_table, entity_id, dedupe_key, metadata)
  SELECT ur.user_id, _type, _title, _body, COALESCE(_severity, 'info'), _entity_table, _entity_id,
         CASE WHEN _dedupe_key IS NULL THEN NULL ELSE _dedupe_key END,
         COALESCE(_metadata, '{}'::jsonb)
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6) Low stock trigger on materials
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  _threshold NUMERIC;
  _qty NUMERIC;
  _dedupe TEXT;
BEGIN
  _threshold := COALESCE(NEW.low_stock_threshold, NULL);
  _qty := COALESCE(NEW.quantity, 0);

  IF _threshold IS NULL THEN
    RETURN NEW;
  END IF;

  IF _qty <= _threshold THEN
    _dedupe := 'low_stock:' || NEW.id::text || ':' || _qty::text || ':' || _threshold::text;

    PERFORM public.create_admin_notification(
      'low_stock',
      'Low stock: ' || NEW.name,
      'Quantity is ' || _qty::text || ' (threshold ' || _threshold::text || ').',
      'warning',
      'materials',
      NEW.id,
      _dedupe,
      jsonb_build_object('material_id', NEW.id, 'quantity', _qty, 'threshold', _threshold)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.materials;
CREATE TRIGGER trg_notify_low_stock
AFTER INSERT OR UPDATE OF quantity, low_stock_threshold ON public.materials
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_stock();

-- 7) Project deadline trigger on projects (within 7 days)
CREATE OR REPLACE FUNCTION public.notify_project_deadline()
RETURNS TRIGGER AS $$
DECLARE
  _days INTEGER;
  _dedupe TEXT;
BEGIN
  -- Only when end_date is within next 7 days (and not in the past)
  _days := (NEW.end_date::date - now()::date);

  IF _days >= 0 AND _days <= 7 THEN
    _dedupe := 'project_deadline:' || NEW.id::text || ':' || NEW.end_date::text;

    PERFORM public.create_admin_notification(
      'project_deadline',
      'Upcoming deadline: ' || NEW.name,
      'Ends in ' || _days::text || ' day(s) on ' || NEW.end_date::text || '.',
      CASE WHEN _days <= 2 THEN 'critical' ELSE 'warning' END,
      'projects',
      NEW.id,
      _dedupe,
      jsonb_build_object('project_id', NEW.id, 'end_date', NEW.end_date, 'days_remaining', _days)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_project_deadline ON public.projects;
CREATE TRIGGER trg_notify_project_deadline
AFTER INSERT OR UPDATE OF end_date ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.notify_project_deadline();

-- 8) Realtime: enable notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;