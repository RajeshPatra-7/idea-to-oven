import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChefHat, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/" });
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 glass"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div whileHover={{ rotate: -12 }} className="rounded-full bg-primary/20 p-2 text-primary">
            <ChefHat className="h-5 w-5" />
          </motion.div>
          <span className="font-serif text-lg tracking-tight">
            Describe It, <span className="text-gradient">Cook It</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/community">Community</NavLink>
          {user ? (
            <>
              <NavLink to="/cookbook">Cookbook</NavLink>
              <button
                onClick={signOut}
                className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
                aria-label="Sign out"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="ml-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </motion.header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
      activeProps={{ className: "px-3 py-1.5 text-foreground" }}
    >
      {children}
    </Link>
  );
}
