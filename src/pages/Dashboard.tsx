import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {user?.email}
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
            Your account is all set up and ready to go.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
