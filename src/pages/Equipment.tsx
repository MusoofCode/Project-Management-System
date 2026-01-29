import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Equipment = () => {
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    const fetchEquipment = async () => {
      const { data } = await supabase.from("equipment").select("*").order("name");
      setEquipment(data || []);
    };
    fetchEquipment();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Equipment</h1>
      <p className="text-construction-concrete">Manage equipment and tools</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <Card key={item.id} className="bg-gradient-card border-construction-steel/30">
            <CardHeader>
              <CardTitle className="text-white">{item.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{item.type}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Condition:</span>
                <span className="text-white font-medium">{item.condition}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Status:</span>
                <span className={item.available ? "text-green-400" : "text-yellow-400"}>
                  {item.available ? "Available" : "In Use"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Equipment;