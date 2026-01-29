import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Projects</h1>
          <p className="text-construction-concrete">Manage construction projects</p>
        </div>
        <Button className="bg-gradient-hero hover:opacity-90 text-white">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="bg-gradient-card border-construction-steel/30 hover:shadow-construction transition">
            <CardHeader>
              <CardTitle className="text-white">{project.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{project.client_name}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Location:</span>
                <span className="text-white">{project.location}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Status:</span>
                <span className="text-construction-orange font-medium">{project.status}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Budget:</span>
                <span className="text-white">${Number(project.budget).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Projects;