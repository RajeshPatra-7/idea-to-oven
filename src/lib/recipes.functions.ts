import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createGateway } from "./ai-gateway.server";

const RecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  difficulty: z.string(),
  servings: z.number(),
  ingredients: z.array(z.object({ item: z.string(), quantity: z.string() })),
  steps: z.array(z.string()),
  nutrition: z.object({
    calories: z.string(),
    protein: z.string(),
    carbs: z.string(),
    fat: z.string(),
  }),
});

export type GeneratedRecipe = z.infer<typeof RecipeSchema>;

const GenerateInput = z.object({
  prompt: z.string().min(1).max(500),
  dietary: z.string().optional(),
  cuisine: z.string().optional(),
  spice: z.string().optional(),
  servings: z.number().min(1).max(12).optional(),
  surprise: z.boolean().optional(),
});

function buildPrompt(input: z.infer<typeof GenerateInput>) {
  const parts: string[] = [];
  if (input.surprise) {
    parts.push(
      "Invent a surprising, creative, delicious dish concept and generate a full recipe for it. Be adventurous but keep it actually cookable.",
    );
  } else {
    parts.push(`User request: "${input.prompt}"`);
  }
  if (input.dietary && input.dietary !== "None") parts.push(`Dietary requirement: ${input.dietary}.`);
  if (input.cuisine && input.cuisine !== "Any") parts.push(`Cuisine style: ${input.cuisine}.`);
  if (input.spice) parts.push(`Spice level: ${input.spice}.`);
  if (input.servings) parts.push(`Servings: ${input.servings}.`);
  parts.push(
    "Return a complete recipe with precise quantities, numbered steps, and an estimated nutritional summary per serving (label it as an estimate).",
  );
  return parts.join(" ");
}

export const generateRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = createGateway();
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: RecipeSchema }),
        system:
          "You are a professional chef and recipe designer. Always return realistic, well-tested recipes with precise ingredient measurements and clear cooking steps.",
        prompt: buildPrompt(data),
      });
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          return RecipeSchema.parse(JSON.parse(error.text ?? ""));
        } catch {
          throw new Error("Recipe generation failed. Try again with a slightly different idea.");
        }
      }
      throw error;
    }
  });

const SaveInput = z.object({
  prompt: z.string(),
  recipe: RecipeSchema,
  dietary: z.string().optional(),
  cuisine: z.string().optional(),
  spice: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { recipe } = data;
    const { data: row, error } = await context.supabase
      .from("recipes")
      .insert({
        user_id: context.userId,
        prompt: data.prompt,
        dish_name: recipe.name,
        description: recipe.description,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        total_time: recipe.totalTime,
        difficulty: recipe.difficulty,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        nutrition: recipe.nutrition,
        dietary: data.dietary ?? null,
        cuisine: data.cuisine ?? null,
        spice_level: data.spice ?? null,
        is_public: data.isPublic ?? false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("recipe_likes")
      .select("recipe_id")
      .eq("recipe_id", data.recipeId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase
        .from("recipe_likes")
        .delete()
        .eq("recipe_id", data.recipeId)
        .eq("user_id", context.userId);
      return { liked: false };
    }
    await context.supabase.from("recipe_likes").insert({ recipe_id: data.recipeId, user_id: context.userId });
    return { liked: true };
  });

export const togglePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipeId: z.string().uuid(), isPublic: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recipes")
      .update({ is_public: data.isPublic })
      .eq("id", data.recipeId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recipes")
      .delete()
      .eq("id", data.recipeId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
