import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const Inventory = () => {
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      const { data } = await supabase.from("materials").select("*").order("name");
      setMaterials(data || []);
    };
    fetchMaterials();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Materials Inventory</h1>
      <p className="text-construction-concrete">Manage construction materials</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material) => {
          const isLowStock = material.quantity <= material.low_stock_threshold;
          return (
            <Card key={material.id} className="bg-gradient-card border-construction-steel/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  {material.name}
                  {isLowStock && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                </CardTitle>
                <p className="text-construction-concrete text-sm">{material.category}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-construction-concrete">
                  <span>Quantity:</span>
                  <span className={`font-medium ${isLowStock ? "text-yellow-400" : "text-white"}`}>
                    {material.quantity}
                  </span>
                </div>
                <div className="flex justify-between text-construction-concrete">
                  <span>Unit Cost:</span>
                  <span className="text-white">${Number(material.unit_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-construction-concrete">
                  <span>Supplier:</span>
                  <span className="text-white">{material.supplier || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Inventory;