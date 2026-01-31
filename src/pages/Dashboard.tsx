import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban, DollarSign, Package, TrendingUp, AlertTriangle, Wrench, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO, subDays } from "date-fns";

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    lowStockItems: 0,
    equipmentInUse: 0,
    totalWorkers: 0,
  });
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);
  const [expensesByDay, setExpensesByDay] = useState<Array<{ day: string; amount: number }>>([]);
  const [materialsByCategory, setMaterialsByCategory] = useState<Array<{ category: string; quantity: number }>>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const fromDate = subDays(new Date(), 29);

    try {
      const [projects, expenses, materials, equipment, workers, allProjects] = await Promise.all([
        supabase.from("projects").select("*").eq("status", "Active"),
        supabase.from("expenses").select("amount,date,category").gte("date", format(fromDate, "yyyy-MM-dd")),
        supabase.from("materials").select("category,quantity,low_stock_threshold"),
        supabase.from("equipment").select("*").eq("available", false),
        supabase.from("workers").select("role"),
        supabase.from("projects").select("status"),
      ]);

      const firstError =
        projects.error || expenses.error || materials.error || equipment.error || workers.error || allProjects.error;
      if (firstError) throw firstError;

      const totalBudget = projects.data?.reduce((sum, p) => sum + Number(p.budget), 0) || 0;
      const totalSpent = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const lowStock = materials.data?.filter((m) => m.quantity <= m.low_stock_threshold).length || 0;

      setStats({
        activeProjects: projects.data?.length || 0,
        totalBudget,
        totalSpent,
        lowStockItems: lowStock,
        equipmentInUse: equipment.data?.length || 0,
        totalWorkers: workers.data?.length || 0,
      });

      // Project status chart
      const statusCounts: Record<string, number> = {};
      allProjects.data?.forEach((p) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });

      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count,
      }));
      setProjectsByStatus(chartData);

      // Expenses (last 30 days) line chart
      const expenseTotalsByDay = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = subDays(new Date(), 29 - i);
        expenseTotalsByDay.set(format(d, "MMM d"), 0);
      }
      expenses.data?.forEach((e) => {
        const dayKey = format(parseISO(e.date), "MMM d");
        expenseTotalsByDay.set(dayKey, (expenseTotalsByDay.get(dayKey) || 0) + Number(e.amount || 0));
      });
      setExpensesByDay(Array.from(expenseTotalsByDay.entries()).map(([day, amount]) => ({ day, amount })));

      // Materials by category bar chart
      const matTotals = new Map<string, number>();
      materials.data?.forEach((m) => {
        const key = m.category || "Uncategorized";
        matTotals.set(key, (matTotals.get(key) || 0) + Number(m.quantity || 0));
      });
      setMaterialsByCategory(Array.from(matTotals.entries()).map(([category, quantity]) => ({ category, quantity })));
    } catch (e: any) {
      toast({ title: "Dashboard", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: "Active Projects", value: stats.activeProjects, icon: FolderKanban, color: "text-construction-orange" },
    { title: "Total Budget", value: `$${stats.totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { title: "Total Spent", value: `$${stats.totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
    { title: "Low Stock Items", value: stats.lowStockItems, icon: AlertTriangle, color: "text-yellow-400" },
    { title: "Equipment In Use", value: stats.equipmentInUse, icon: Wrench, color: "text-purple-400" },
    { title: "Total Workers", value: stats.totalWorkers, icon: Users, color: "text-cyan-400" },
  ];

  const COLORS = [
    "hsl(var(--construction-orange))",
    "hsl(var(--construction-amber))",
    "hsl(var(--sidebar-primary))",
    "hsl(var(--muted-foreground))",
  ];

  return (
    <div className="p-8 space-y-8 page-enter">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-construction-concrete">Project overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="bg-gradient-card border-construction-steel/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-36" />
                </CardContent>
              </Card>
            ))
          : cards.map((card) => (
              <Card
                key={card.title}
                className="bg-gradient-card border-construction-steel/30 hover:shadow-construction transition-all duration-300 hover:scale-105 active:scale-[1.02]"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-construction-concrete">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground animate-fade-in">{card.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Project Status Chart */}
      {!loading && projectsByStatus.length > 0 && (
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                value: { label: "Projects", color: "hsl(var(--construction-orange))" },
              }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Pie
                  data={projectsByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  isAnimationActive
                >
                  {projectsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Over Time */}
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Expenses (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[260px] w-full" />
              </div>
            ) : (
              <ChartContainer
                className="h-[300px] w-full"
                config={{
                  amount: { label: "Spent", color: "hsl(var(--construction-orange))" },
                }}
              >
                <LineChart data={expensesByDay} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid stroke="#ccc" strokeDasharray="4 4" />
                  <XAxis dataKey="day" interval={4} />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Spent"]}
                        indicator="line"
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-amount)"
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Materials by Category */}
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Materials by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[260px] w-full" />
              </div>
            ) : (
              <ChartContainer
                className="h-[300px] w-full"
                config={{
                  quantity: { label: "Qty", color: "hsl(var(--construction-amber))" },
                }}
              >
                <BarChart data={materialsByCategory} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid stroke="#ccc" strokeDasharray="4 4" />
                  <XAxis dataKey="category" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: any) => [Number(value).toLocaleString(), "Qty"]}
                        indicator="dot"
                      />
                    }
                  />
                  <Bar dataKey="quantity" radius={[10, 10, 2, 2]} isAnimationActive>
                    {materialsByCategory.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;