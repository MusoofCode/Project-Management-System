import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Budget = () => {
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data } = await supabase.from("expenses").select("*, projects(name)").order("date", { ascending: false });
      setExpenses(data || []);
    };
    fetchExpenses();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Budget & Costs</h1>
      <p className="text-construction-concrete">Track project expenses</p>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-white">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-construction-dark rounded-lg">
                <div>
                  <p className="text-white font-medium">{expense.category}</p>
                  <p className="text-construction-concrete text-sm">{expense.description}</p>
                </div>
                <p className="text-construction-orange font-bold">${Number(expense.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Budget;