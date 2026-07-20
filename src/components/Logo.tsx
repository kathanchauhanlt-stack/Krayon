/**
 * KrayonLogo — The KRAYON wordmark.
 * Matches image 1: bold, teal-cyan text on dark bg, sharp and HD.
 * Used in the Layout header.
 */
export default function Logo({
  className = "",
  scale = 1,
}: {
  className?: string;
  scale?: number;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        fontFamily: "'Anybody', sans-serif",
        fontWeight: 900,
        fontSize: `${scale * 32}px`,
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: "#c3f5ff",
        textShadow:
          "0 0 24px rgba(195,245,255,0.35), 2px 2px 0 rgba(0,0,0,0.9)",
        userSelect: "none",
        textTransform: "uppercase",
        transform: `scale(${scale === 1 ? 1 : 1})`,   // kept for compat
      }}
    >
      KRAYON
    </span>
  );
}
