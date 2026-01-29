import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Keep the latest session in state so we can react safely without calling Supabase inside the auth callback.
  // undefined = not initialized yet; null = initialized but not logged in
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Subscribe FIRST (sync-only callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    // THEN read current session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSessionUserId(session?.user?.id ?? null);
        setAuthReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setSessionUserId(null);
        setAuthReady(true);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Critical: don't redirect until we know whether a session exists.
      if (!authReady) return;

      if (!sessionUserId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionUserId)
        .eq("role", "admin")
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, sessionUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-construction-dark flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-construction-orange animate-spin" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
