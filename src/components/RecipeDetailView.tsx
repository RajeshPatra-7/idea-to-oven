import { motion } from "framer-motion";
import { Clock, Flame, Users, ChefHat } from "lucide-react";
import type { GeneratedRecipe } from "@/lib/recipes.functions";

export function RecipeDetailView({ recipe }: { recipe: GeneratedRecipe }) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] text-gradient">{recipe.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{recipe.description}</p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-3">
        <Meta icon={<Clock className="h-4 w-4" />} label="Prep" value={recipe.prepTime} />
        <Meta icon={<Flame className="h-4 w-4" />} label="Cook" value={recipe.cookTime} />
        <Meta icon={<ChefHat className="h-4 w-4" />} label="Difficulty" value={recipe.difficulty} />
        <Meta icon={<Users className="h-4 w-4" />} label="Serves" value={String(recipe.servings)} />
      </motion.div>

      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <motion.section variants={item} className="glass rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Ingredients</h2>
          <motion.ul variants={container} initial="hidden" animate="show" className="space-y-2.5">
            {recipe.ingredients.map((ing, i) => (
              <motion.li
                key={i}
                variants={item}
                className="flex items-baseline gap-3 border-b border-border/50 pb-2 last:border-0"
              >
                <span className="text-sm font-medium text-primary min-w-[6rem]">{ing.quantity}</span>
                <span className="text-sm">{ing.item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>

        <motion.section variants={item} className="glass rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Method</h2>
          <motion.ol variants={container} initial="hidden" animate="show" className="space-y-4">
            {recipe.steps.map((step, i) => (
              <motion.li key={i} variants={item} className="flex gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/15 text-primary font-serif">
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed pt-1">{step}</p>
              </motion.li>
            ))}
          </motion.ol>
        </motion.section>
      </div>

      <motion.section variants={item} className="glass rounded-2xl p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-2xl">Nutrition</h2>
          <span className="text-xs text-muted-foreground italic">estimate per serving</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NutritionCell label="Calories" value={recipe.nutrition.calories} />
          <NutritionCell label="Protein" value={recipe.nutrition.protein} />
          <NutritionCell label="Carbs" value={recipe.nutrition.carbs} />
          <NutritionCell label="Fat" value={recipe.nutrition.fat} />
        </div>
      </motion.section>
    </motion.div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function NutritionCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-serif text-xl mt-1 text-[color:var(--ember)]">{value}</div>
    </div>
  );
}
