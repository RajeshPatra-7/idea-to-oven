import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Dices, Minus, Plus, Sparkles } from "lucide-react";

export type RecipeOptions = {
  dietary: string;
  cuisine: string;
  spice: "Mild" | "Medium" | "Hot";
  servings: number;
};

const DIETARY = ["None", "Vegan", "Vegetarian", "Keto", "Gluten-Free"];
const CUISINE = ["Any", "Italian", "Japanese", "Mexican", "Indian", "Thai", "French", "Mediterranean"];
const SPICE: RecipeOptions["spice"][] = ["Mild", "Medium", "Hot"];

const PLACEHOLDERS = [
  "spicy mango grilled cheese…",
  "healthy butter chicken…",
  "leftover rice and eggs…",
  "cozy autumn pasta with brown butter…",
  "10-minute breakfast with what's in the fridge…",
];

export function RecipeInput({
  onSubmit,
  onSurprise,
  loading,
}: {
  onSubmit: (prompt: string, options: RecipeOptions) => void;
  onSurprise: (options: RecipeOptions) => void;
  loading: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<RecipeOptions>({
    dietary: "None",
    cuisine: "Any",
    spice: "Medium",
    servings: 4,
  });
  const [placeholder, setPlaceholder] = useState("");
  const idxRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const full = PLACEHOLDERS[idxRef.current];
      if (!deletingRef.current) {
        charRef.current++;
        setPlaceholder(full.slice(0, charRef.current));
        if (charRef.current === full.length) {
          deletingRef.current = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charRef.current--;
        setPlaceholder(full.slice(0, charRef.current));
        if (charRef.current === 0) {
          deletingRef.current = false;
          idxRef.current = (idxRef.current + 1) % PLACEHOLDERS.length;
        }
      }
      setTimeout(tick, deletingRef.current ? 30 : 55);
    };
    const t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (prompt.trim()) onSubmit(prompt.trim(), options);
        }}
        className="glass rounded-3xl p-2 shadow-glow"
      >
        <div className="flex items-center gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder || "describe any dish…"}
            className="flex-1 bg-transparent px-5 py-4 text-lg outline-none placeholder:text-muted-foreground/70"
            disabled={loading}
          />
          <motion.button
            type="button"
            whileTap={{ rotate: 360, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            onClick={() => onSurprise(options)}
            disabled={loading}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
          >
            <Dices className="h-4 w-4" /> Surprise me
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            <Sparkles className="h-4 w-4" /> Cook it
          </motion.button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        <OptionRow label="Diet">
          {DIETARY.map((d) => (
            <Chip key={d} active={options.dietary === d} onClick={() => setOptions((o) => ({ ...o, dietary: d }))}>
              {d}
            </Chip>
          ))}
        </OptionRow>
        <OptionRow label="Cuisine">
          {CUISINE.map((c) => (
            <Chip key={c} active={options.cuisine === c} onClick={() => setOptions((o) => ({ ...o, cuisine: c }))}>
              {c}
            </Chip>
          ))}
        </OptionRow>
        <OptionRow label="Spice">
          {SPICE.map((s, i) => (
            <Chip key={s} active={options.spice === s} onClick={() => setOptions((o) => ({ ...o, spice: s }))}>
              <span className="flex items-center gap-1">
                {s}
                <span className="flex">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className={`text-xs ${n <= i && options.spice === s ? "text-[color:var(--ember)]" : "opacity-25"}`}
                    >
                      🌶
                    </span>
                  ))}
                </span>
              </span>
            </Chip>
          ))}
        </OptionRow>
        <OptionRow label="Serves">
          <div className="inline-flex items-center gap-3 rounded-full border border-border px-3 py-1.5">
            <button
              type="button"
              onClick={() => setOptions((o) => ({ ...o, servings: Math.max(1, o.servings - 1) }))}
              className="text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={options.servings}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                className="font-serif text-lg w-6 text-center"
              >
                {options.servings}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setOptions((o) => ({ ...o, servings: Math.min(12, o.servings + 1) }))}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </OptionRow>
      </div>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground min-w-[4.5rem]">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`relative rounded-full px-3.5 py-1.5 text-xs transition-colors ${
        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId={`chip-${(children as string) || Math.random()}`}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute inset-0 rounded-full bg-primary"
        />
      )}
      <span className="relative z-10 flex items-center">{children}</span>
      {!active && <span className="absolute inset-0 rounded-full border border-border pointer-events-none" />}
    </motion.button>
  );
}
