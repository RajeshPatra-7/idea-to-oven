import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
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
    'Return ONLY a single valid JSON object (no markdown, no code fences, no commentary) matching exactly this shape: {"name": string, "description": string, "prepTime": string, "cookTime": string, "totalTime": string, "difficulty": "Easy"|"Medium"|"Hard", "servings": number, "ingredients": [{"item": string, "quantity": string}], "steps": [string], "nutrition": {"calories": string, "protein": string, "carbs": string, "fat": string}}. All numeric values inside strings (e.g. "10 min", "320 kcal"). Nutrition is a per-serving estimate.',
  );
  return parts.join(" ");
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = s.search(/[\{\[]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    const repaired = s.replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001F]/g, " ");
    return JSON.parse(repaired);
  }
}

export const generateRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = createGateway();
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system:
        "You are a professional chef and recipe designer. You ALWAYS respond with ONLY a single raw JSON object matching the user's requested schema. No prose, no markdown, no code fences.",
      prompt: buildPrompt(data),
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch (e) {
      console.error("[generateRecipe] JSON parse failed. Raw model output:\n", text);
      throw new Error(
        `Model returned unparseable output. First 200 chars: ${text.slice(0, 200)}`,
      );
    }

    const result = RecipeSchema.safeParse(parsed);
    if (!result.success) {
      console.error(
        "[generateRecipe] Schema validation failed. Raw:\n",
        text,
        "\nIssues:",
        JSON.stringify(result.error.issues, null, 2),
      );
      throw new Error(
        `Recipe schema mismatch: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }
    return result.data;
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
