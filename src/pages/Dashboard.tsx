import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const portalViews = [
  { label: "Admin", value: "admin" },
  { label: "Agent", value: "agent" },
  { label: "Parent", value: "parent" },
  { label: "Athlete", value: "athlete" },
] as const;

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-0 text-xl font-bold hover:bg-transparent" style={{ fontFamily: "var(--font-heading)" }}>
                Dashboard
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {portalViews.map((view) => (
                <DropdownMenuItem key={view.value} onClick={() => navigate(`/portal?view=${view.value}`)}>
                  {view.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-8">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Welcome! 🎉
          </h2>
          <p className="text-muted-foreground">
            You're signed in as <span className="font-medium text-foreground">{user?.email}</span>. 
            Tap <span className="font-medium text-foreground">Dashboard</span> above to switch portal views.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
