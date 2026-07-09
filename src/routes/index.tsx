import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CookingLoader } from "@/components/CookingLoader";
import { RecipeInput, type RecipeOptions } from "@/components/RecipeInput";
import { RecipeDetailView } from "@/components/RecipeDetailView";
import { generateRecipe, saveRecipe, type GeneratedRecipe } from "@/lib/recipes.functions";
import { useAuth } from "@/hooks/use-auth";
import { RefreshCw, BookmarkPlus, Share2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gen = useServerFn(generateRecipe);
  const save = useServerFn(saveRecipe);

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [lastOptions, setLastOptions] = useState<RecipeOptions | null>(null);
  const [surprise, setSurprise] = useState(false);

  const run = async (prompt: string, options: RecipeOptions, isSurprise = false) => {
    setLoading(true);
    setError(null);
    setLastPrompt(prompt);
    setLastOptions(options);
    setSurprise(isSurprise);
    try {
      const r = await gen({
        data: {
          prompt,
          dietary: options.dietary,
          cuisine: options.cuisine,
          spice: options.spice,
          servings: options.servings,
          surprise: isSurprise,
        },
      });
      setRecipe(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => {
    if (lastOptions) run(lastPrompt || "a delicious dish", lastOptions, surprise);
  };

  const doSave = async () => {
    if (!user) {
      toast("Sign in to save recipes");
      navigate({ to: "/auth" });
      return;
    }
    if (!recipe || !lastOptions) return;
    try {
      const { id } = await save({
        data: {
          prompt: lastPrompt,
          recipe,
          dietary: lastOptions.dietary,
          cuisine: lastOptions.cuisine,
          spice: lastOptions.spice,
          isPublic: false,
        },
      });
      toast.success("Saved to your cookbook");
      navigate({ to: "/recipe/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const doShare = async () => {
    if (!recipe) return;
    const text = formatRecipeText(recipe);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Recipe copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      {!recipe && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          >
            AI-powered recipes
          </motion.div>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.02]">
            Describe it.<br />
            <span className="text-gradient">Cook it.</span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
            A craving, a leftover, a wild idea. Type anything — we'll write the recipe.
          </p>
        </motion.div>
      )}

      {loading ? (
        <CookingLoader />
      ) : recipe ? (
        <div>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => { setRecipe(null); setError(null); }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← New recipe
            </button>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileTap={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                onClick={regenerate}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-primary/50 transition"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate
              </motion.button>
              <button
                onClick={doShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-primary/50 transition"
              >
                <Share2 className="h-4 w-4" /> Copy
              </button>
              <button
                onClick={doSave}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition"
              >
                <BookmarkPlus className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
          <RecipeDetailView recipe={recipe} />
        </div>
      ) : (
        <>
          <RecipeInput onSubmit={(p, o) => run(p, o, false)} onSurprise={(o) => run("", o, true)} loading={loading} />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 max-w-3xl mx-auto rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
            >
              {error}
              <button onClick={regenerate} className="ml-3 underline">Retry</button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export function formatRecipeText(r: GeneratedRecipe) {
  return `${r.name}\n\n${r.description}\n\nPrep: ${r.prepTime} · Cook: ${r.cookTime} · Serves ${r.servings}\n\nIngredients:\n${r.ingredients.map((i) => `- ${i.quantity} ${i.item}`).join("\n")}\n\nSteps:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nNutrition (est.): ${r.nutrition.calories} cal · ${r.nutrition.protein} protein · ${r.nutrition.carbs} carbs · ${r.nutrition.fat} fat`;
}
