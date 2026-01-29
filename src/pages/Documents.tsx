import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Documents = () => {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data } = await supabase.from("documents").select("*, projects(name)").order("uploaded_at", { ascending: false });
      setDocuments(data || []);
    };
    fetchDocuments();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Documents</h1>
      <p className="text-construction-concrete">Manage project files</p>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-white">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-construction-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-construction-orange" />
                  <div>
                    <p className="text-white font-medium">{doc.name}</p>
                    <p className="text-construction-concrete text-sm">{doc.file_type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;