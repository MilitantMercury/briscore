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

export const avatarOptions = Object.keys(symbols);

export function PlayerAvatar({
  avatar = "bastoni",
  name,
  rank,
  size = "normal",
}: {
  avatar?: string;
  name: string;
  rank?: number | null;
  size?: "small" | "normal" | "large";
}) {
  const badge = rank && rank <= 3 ? ["👑", "🥈", "🥉"][rank - 1] : null;
  return (
    <span className={`player-avatar avatar-${avatar} avatar-${size}`} aria-label={`Avatar di ${name}`}>
      {symbols[avatar] || name.slice(0, 1).toUpperCase()}
      {badge && <i className={`rank-badge rank-${rank}`}>{badge}</i>}
    </span>
  );
}
