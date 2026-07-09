import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RecipeDetailView } from "@/components/RecipeDetailView";
import { LikeButton } from "@/components/LikeButton";
import { useAuth } from "@/hooks/use-auth";
import { deleteRecipe, togglePublish, toggleLike, type GeneratedRecipe } from "@/lib/recipes.functions";
import { formatRecipeText } from "./index";
import { Globe, Lock, Share2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/recipe/$id")({ component: RecipePage });

async function fetchRecipe(id: string) {
  const { data, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  const { data: { user } } = await supabase.auth.getUser();
  let liked = false;
  if (user) {
    const { data: like } = await supabase
      .from("recipe_likes")
      .select("recipe_id")
      .eq("recipe_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    liked = !!like;
  }
  return { row: data, liked };
}

function RecipePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const like = useServerFn(toggleLike);
  const publish = useServerFn(togglePublish);
  const del = useServerFn(deleteRecipe);

  const { data, isLoading, error } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetchRecipe(id),
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="p-12 text-center text-muted-foreground">Recipe not found.</div>;

  const { row, liked } = data;
  const isOwner = user?.id === row.user_id;
  const recipe: GeneratedRecipe = {
    name: row.dish_name,
    description: row.description ?? "",
    prepTime: row.prep_time ?? "—",
    cookTime: row.cook_time ?? "—",
    totalTime: row.total_time ?? "—",
    difficulty: row.difficulty ?? "—",
    servings: row.servings ?? 4,
    ingredients: (row.ingredients as GeneratedRecipe["ingredients"]) ?? [],
    steps: (row.steps as string[]) ?? [],
    nutrition: (row.nutrition as GeneratedRecipe["nutrition"]) ?? { calories: "—", protein: "—", carbs: "—", fat: "—" },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate({ to: "/" })} className="text-sm text-muted-foreground hover:text-foreground">← Home</button>
        <div className="flex items-center gap-3">
          <LikeButton
            initialLiked={liked}
            count={row.likes_count}
            onToggle={async () => {
              if (!user) { navigate({ to: "/auth" }); throw new Error("auth"); }
              await like({ data: { recipeId: id } });
              qc.invalidateQueries({ queryKey: ["recipe", id] });
            }}
          />
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(formatRecipeText(recipe));
              toast.success("Copied");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50"
          >
            <Share2 className="h-3.5 w-3.5" /> Copy
          </button>
          {isOwner && (
            <>
              <button
                onClick={async () => {
                  await publish({ data: { recipeId: id, isPublic: !row.is_public } });
                  toast.success(row.is_public ? "Made private" : "Published to community");
                  qc.invalidateQueries({ queryKey: ["recipe", id] });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50"
              >
                {row.is_public ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {row.is_public ? "Make private" : "Publish"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this recipe?")) return;
                  await del({ data: { recipeId: id } });
                  toast.success("Deleted");
                  navigate({ to: "/cookbook" });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 text-destructive-foreground/70 px-3 py-1.5 text-xs hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </motion.div>
      <RecipeDetailView recipe={recipe} />
    </div>
  );
}
