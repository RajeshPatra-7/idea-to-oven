import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "@/components/LikeButton";
import { useAuth } from "@/hooks/use-auth";
import { toggleLike } from "@/lib/recipes.functions";

export const Route = createFileRoute("/community")({ component: Community });

type Row = {
  id: string;
  dish_name: string;
  description: string | null;
  dietary: string | null;
  cuisine: string | null;
  difficulty: string | null;
  total_time: string | null;
  likes_count: number;
  created_at: string;
  user_id: string;
};

function Community() {
  const [sort, setSort] = useState<"new" | "top">("new");
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const like = useServerFn(toggleLike);

  const { data, isLoading } = useQuery({
    queryKey: ["community", sort],
    queryFn: async (): Promise<{ rows: Row[]; likedSet: Set<string> }> => {
      const query = supabase
        .from("recipes")
        .select("id,dish_name,description,dietary,cuisine,difficulty,total_time,likes_count,created_at,user_id")
        .eq("is_public", true)
        .limit(60);
      const { data, error } =
        sort === "new"
          ? await query.order("created_at", { ascending: false })
          : await query.order("likes_count", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      let likedSet = new Set<string>();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && rows.length) {
        const { data: likes } = await supabase
          .from("recipe_likes")
          .select("recipe_id")
          .eq("user_id", user.id)
          .in("recipe_id", rows.map((r) => r.id));
        likedSet = new Set((likes ?? []).map((l) => l.recipe_id));
      }
      return { rows, likedSet };
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-4xl md:text-5xl"><span className="text-gradient">Community</span> Feed</h1>
        <p className="mt-2 text-muted-foreground">Recipes people are cooking right now.</p>
      </motion.div>

      <div className="mt-8 inline-flex rounded-full border border-border p-1">
        {(["new", "top"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`relative px-4 py-1.5 text-xs rounded-full transition ${sort === s ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            {sort === s && (
              <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-full bg-primary" />
            )}
            <span className="relative z-10">{s === "new" ? "Newest" : "Most Liked"}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-16 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">Nothing published yet. Be the first!</div>
      ) : (
        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {data.rows.map((r) => (
            <motion.div
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-5 flex flex-col"
            >
              <Link to="/recipe/$id" params={{ id: r.id }} className="flex-1 block">
                <h3 className="font-serif text-xl leading-tight">{r.dish_name}</h3>
                {r.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{r.description}</p>}
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                  {r.dietary && r.dietary !== "None" && <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-muted-foreground">{r.dietary}</span>}
                  {r.cuisine && r.cuisine !== "Any" && <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-muted-foreground">{r.cuisine}</span>}
                </div>
              </Link>
              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                <LikeButton
                  initialLiked={data.likedSet.has(r.id)}
                  count={r.likes_count}
                  onToggle={async () => {
                    if (!user) { navigate({ to: "/auth" }); throw new Error("auth"); }
                    await like({ data: { recipeId: r.id } });
                    qc.invalidateQueries({ queryKey: ["community", sort] });
                  }}
                />
                <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
