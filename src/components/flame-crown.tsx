export function FlameCrown() {
  return <svg className="flame-crown" viewBox="0 0 180 118" aria-hidden="true">
    <defs>
      <linearGradient id="outer-flame" x1="0" y1="1" x2="0.5" y2="0"><stop stopColor="#d71920"/><stop offset=".48" stopColor="#ff5a1f"/><stop offset="1" stopColor="#ffb02e"/></linearGradient>
      <linearGradient id="inner-flame" x1="0" y1="1" x2="0.5" y2="0"><stop stopColor="#ff7d22"/><stop offset=".55" stopColor="#ffd34a"/><stop offset="1" stopColor="#fff8b0"/></linearGradient>
    </defs>
    <path className="flame-outer" fill="url(#outer-flame)" d="M10 111C2 82 22 66 28 48c4 19 11 25 16 30C41 50 57 35 59 9c20 22 21 47 20 59 11-15 21-28 19-47 24 21 27 49 21 65 13-12 22-26 18-45 26 29 24 62 2 70Z"/>
    <path className="flame-inner" fill="url(#inner-flame)" d="M32 109c-4-19 15-28 17-44 9 12 12 21 11 29 9-10 17-20 16-38 15 18 15 35 10 47 11-9 17-20 16-31 13 17 12 32 3 37Z"/>
  </svg>;
}
