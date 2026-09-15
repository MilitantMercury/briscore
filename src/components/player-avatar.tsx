"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
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
  previewUrl,
  effect,
  name,
  rank,
  size = "normal",
}: {
  avatar?: string;
  imagePath?: string;
  previewUrl?: string;
  effect?: string;
  name: string;
  rank?: number | null;
  size?: "small" | "normal" | "large";
}) {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!imagePath) return;
    void supabase.storage.from("avatars").download(imagePath).then(({ data }) => {
      if (data && active) {
        objectUrl = URL.createObjectURL(data);
        setImage({ path: imagePath, url: objectUrl });
      }
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imagePath]);
  const badge = rank && rank <= 3 ? ["👑", "🥈", "🥉"][rank - 1] : null;
  const displayedImage = previewUrl || (image?.path === imagePath ? image?.url : "");
  return (
    <span className={`avatar-stage avatar-stage-${size}`}><span className={`player-avatar avatar-${avatar} avatar-${size} ${displayedImage ? "has-image" : ""} ${effect ? `avatar-effect-${effect}` : ""}`} aria-label={`Avatar di ${name}`}>
      {effect && effectFrames[effect] && <Image className={`effect-frame effect-frame-${effect}`} src={effectFrames[effect]} alt="" fill sizes="150px" />}
      {displayedImage ? <Image src={displayedImage} alt="" fill unoptimized sizes="150px" /> : symbols[avatar] || name.slice(0, 1).toUpperCase()}
      {badge && <i className={`rank-badge rank-${rank}`}>{badge}</i>}
    </span></span>
  );
}
