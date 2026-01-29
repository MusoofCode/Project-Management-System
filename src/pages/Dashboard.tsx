import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, DollarSign, Package, TrendingUp, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [projects, expenses, materials] = await Promise.all([
        supabase.from("projects").select("*").eq("status", "Active"),
        supabase.from("expenses").select("amount"),
        supabase.from("materials").select("*"),
      ]);

      const totalBudget = projects.data?.reduce((sum, p) => sum + Number(p.budget), 0) || 0;
      const totalSpent = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const lowStock = materials.data?.filter((m) => m.quantity <= m.low_stock_threshold).length || 0;

      setStats({
        activeProjects: projects.data?.length || 0,
        totalBudget,
        totalSpent,
        lowStockItems: lowStock,
      });
    };

    fetchStats();
  }, []);

  const cards = [
    { title: "Active Projects", value: stats.activeProjects, icon: FolderKanban, color: "text-construction-orange" },
    { title: "Total Budget", value: `$${stats.totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { title: "Total Spent", value: `$${stats.totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
    { title: "Low Stock Items", value: stats.lowStockItems, icon: AlertTriangle, color: "text-yellow-400" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-construction-concrete">Project overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="bg-gradient-card border-construction-steel/30 hover:shadow-construction transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-construction-concrete">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;