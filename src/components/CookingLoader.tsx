import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChefHat, Flame, Utensils } from "lucide-react";

const stages = [
  { text: "Chopping ideas…", icon: Utensils },
  { text: "Simmering your recipe…", icon: Flame },
  { text: "Plating it up…", icon: ChefHat },
];

export function CookingLoader() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % stages.length), 1400);
    return () => clearInterval(t);
  }, []);
  const Icon = stages[idx].icon;
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
            transition={{ duration: 0.4 }}
            className="relative flex h-24 w-24 items-center justify-center rounded-full glass text-primary"
          >
            <Icon className="h-10 w-10" />
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-6 font-serif text-xl text-muted-foreground"
        >
          {stages[idx].text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
