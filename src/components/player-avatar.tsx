"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
const symbols: Record<string, string> = {
  bastoni: "♣",
  coppe: "♥",
  denari: "♦",
  spade: "♠",
  sole: "☀",
  luna: "☾",
  stella: "✦",
  asso: "A",
};

const effectFrames: Record<string, string> = {
  fire: "/effects/fire-frame-v1.png",
  water: "/effects/water-frame-v1.png",
  sparkles: "/effects/sparkles-frame-v2.png",
};

export const avatarOptions = Object.keys(symbols);

export function PlayerAvatar({
  avatar = "bastoni",
  imagePath,
  effect,
  name,
  rank,
  size = "normal",
}: {
  avatar?: string;
  imagePath?: string;
  effect?: string;
  name: string;
  rank?: number | null;
  size?: "small" | "normal" | "large";
}) {
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!imagePath) { setImageUrl(""); return; }
    void supabase.storage.from("avatars").download(imagePath).then(({ data }) => {
      if (data && active) { objectUrl = URL.createObjectURL(data); setImageUrl(objectUrl); }
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imagePath]);
  const badge = rank && rank <= 3 ? ["👑", "🥈", "🥉"][rank - 1] : null;
  return (
    <span className={`player-avatar avatar-${avatar} avatar-${size} ${imageUrl ? "has-image" : ""} ${effect ? `avatar-effect-${effect}` : ""}`} aria-label={`Avatar di ${name}`}>
      {effect && effectFrames[effect] && <img className={`effect-frame effect-frame-${effect}`} src={effectFrames[effect]} alt="" />}
      {imageUrl ? <img src={imageUrl} alt="" /> : symbols[avatar] || name.slice(0, 1).toUpperCase()}
      {badge && <i className={`rank-badge rank-${rank}`}>{badge}</i>}
    </span>
  );
}
