import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Workers = () => {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    const fetchWorkers = async () => {
      const { data } = await supabase.from("workers").select("*").order("name");
      setWorkers(data || []);
    };
    fetchWorkers();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Workers & Contractors</h1>
      <p className="text-construction-concrete">Manage workforce</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id} className="bg-gradient-card border-construction-steel/30">
            <CardHeader>
              <CardTitle className="text-white">{worker.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{worker.role}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Daily Rate:</span>
                <span className="text-white font-medium">${Number(worker.daily_rate).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Workers;