import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat } from "lucide-react";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Login successful" });
        navigate("/dashboard");
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        
        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
        }
        
        toast({ title: "Account created! Please log in." });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-construction-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-construction-slate border border-construction-steel/30 rounded-xl p-8 shadow-construction">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="SOMPROPERTY" className="h-20 w-20 mb-4" />
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <HardHat className="text-construction-orange" />
              SOMPROPERTY
            </h1>
            <p className="text-construction-concrete mt-2">Project Management System</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-construction-dark border-construction-steel text-white"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-construction-dark border-construction-steel text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-hero hover:opacity-90 text-white font-bold"
            >
              {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-4 text-construction-concrete hover:text-construction-orange transition"
          >
            {isLogin ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;