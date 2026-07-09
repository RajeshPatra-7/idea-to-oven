import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";

export function LikeButton({
  initialLiked,
  count,
  onToggle,
}: {
  initialLiked: boolean;
  count: number;
  onToggle: () => Promise<void>;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setN((c) => c + (next ? 1 : -1));
    try {
      await onToggle();
    } catch {
      setLiked(!next);
      setN((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={click}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
    >
      <motion.span
        key={String(liked)}
        initial={{ scale: 1 }}
        animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={liked ? "text-[color:var(--ember)]" : ""}
      >
        <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
      </motion.span>
      <span>{n}</span>
    </button>
  );
}
