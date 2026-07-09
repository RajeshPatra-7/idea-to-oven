import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const SITE = "https://idea-to-oven.lovable.app";

export const Route = createFileRoute("/cookbook")({
  component: Cookbook,
  head: () => ({
    meta: [
      { title: "Your Cookbook — Describe It, Cook It" },
      { name: "description", content: "Your personal collection of saved AI-generated recipes. Search, filter by diet, and revisit anytime." },
      { property: "og:title", content: "Your Cookbook — Describe It, Cook It" },
      { property: "og:description", content: "Your personal collection of saved AI-generated recipes." },
      { property: "og:url", content: `${SITE}/cookbook` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/cookbook` }],
  }),
});

type Row = {
  id: string;
  dish_name: string;
  description: string | null;
  dietary: string | null;
  cuisine: string | null;
  difficulty: string | null;
  total_time: string | null;
  is_public: boolean;
  created_at: string;
};

const DIET_FILTERS = ["All", "Vegan", "Vegetarian", "Keto", "Gluten-Free"];

function Cookbook() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["cookbook", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,dish_name,description,dietary,cuisine,difficulty,total_time,is_public,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtered = (data ?? []).filter((r) => {
    const matchQ = !q || r.dish_name.toLowerCase().includes(q.toLowerCase());
    const matchF = filter === "All" || r.dietary === filter;
    return matchQ && matchF;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-4xl md:text-5xl">Your <span className="text-gradient">Cookbook</span></h1>
        <p className="mt-2 text-muted-foreground">Recipes you've saved.</p>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-3 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="rounded-full bg-input px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 min-w-[220px]"
        />
        <div className="flex flex-wrap gap-2">
          {DIET_FILTERS.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                filter === d ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-16 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">No recipes yet.</p>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
            Create your first
          </Link>
        </div>
      ) : (
        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {filtered.map((r) => (
            <motion.div
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <Link to="/recipe/$id" params={{ id: r.id }} className="block glass rounded-2xl p-5 h-full hover:shadow-glow transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-xl leading-tight">{r.dish_name}</h3>
                  {r.is_public && <span className="text-[10px] uppercase tracking-wider text-[color:var(--sage)]">Public</span>}
                </div>
                {r.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  {r.dietary && r.dietary !== "None" && <Tag>{r.dietary}</Tag>}
                  {r.cuisine && r.cuisine !== "Any" && <Tag>{r.cuisine}</Tag>}
                  {r.difficulty && <Tag>{r.difficulty}</Tag>}
                  {r.total_time && <Tag>{r.total_time}</Tag>}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-muted-foreground">{children}</span>;
}
