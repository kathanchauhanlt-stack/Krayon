import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

// Comic art background
const COMIC_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBTCHkvfOmGepfYCCAbAWysxEaYAB2I-LJ2iSr9E39SrEseQ1tszc7ckyMTDCC7MsGEBkQIS5Mcy_F_OZOQMmAapmFUIJ9z5FZatEfKqZXf2b0zT76_SpqVKe1tNchBvSlPYDP9yePmLfQbsM-UNFYl11-jL4tuKzcYId7ftN5PrIYv6fwxRGRhaz-Kb4UFOiFkaK6RUIQm4ZQAUM5mAB2hkuh5eGifXfRtLtGDGrehmyoiw1AeBQjtIIXPgZyY2JMVRw";

// Each letter's scatter start position (YouTube-style: letters fly in from far)
const SCATTER = [
  { x: -380, y: -220, rotate: -35 }, // K
  { x: -140, y:  300, rotate:  20 }, // R
  { x:  250, y: -310, rotate: -18 }, // A
  { x:  400, y:  180, rotate:  28 }, // Y
  { x: -280, y:  200, rotate: -22 }, // O
  { x:  160, y:  320, rotate:  15 }, // N
];

export default function Home() {
  const navigate  = useNavigate();
  const [phase, setPhase]     = useState<"idle" | "assemble" | "pulse" | "exit">("idle");
  const [exiting, setExiting] = useState(false);

  // Start assembling after a short pause
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("assemble"), 200);
    const t2 = setTimeout(() => setPhase("pulse"), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleClick = () => {
    if (exiting) return;
    setExiting(true);
    setPhase("exit");
    setTimeout(() => navigate("/stream"), 700);
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center">

      {/* ── Full-screen comic art background ── */}
      <motion.img
        src={COMIC_BG}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ filter: "saturate(1.1) contrast(1.05)" }}
        animate={exiting ? { scale: 1.12, filter: "blur(8px) saturate(0.5)" } : { scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.52) 100%), linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.68) 100%)",
        }}
      />

      {/* Exit black overlay */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            className="absolute inset-0 z-[500] pointer-events-none"
            style={{ background: "#000" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.65, ease: "easeIn" }}
          />
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <motion.div
        className="relative z-10 flex flex-col items-center select-none"
        animate={exiting ? { scale: 1.1, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >

        {/* ── KRAYON — animated letter assembly ── */}
        <motion.button
          onClick={handleClick}
          className="flex items-end justify-center cursor-pointer relative"
          style={{ background: "none", border: "none", padding: "0 8px", lineHeight: 1 }}
          whileHover={phase === "pulse" ? { scale: 1.04 } : {}}
          whileTap={{ scale: 0.97 }}
        >
          {/* Hover glow ring */}
          {phase === "pulse" && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ boxShadow: "0 0 60px rgba(255,255,255,0.08)" }}
              animate={{ boxShadow: ["0 0 40px rgba(255,255,255,0.04)", "0 0 80px rgba(255,255,255,0.14)", "0 0 40px rgba(255,255,255,0.04)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {"KRAYON".split("").map((letter, i) => (
            <motion.span
              key={i}
              initial={{
                x: SCATTER[i].x,
                y: SCATTER[i].y,
                rotate: SCATTER[i].rotate,
                opacity: 0,
              }}
              animate={
                phase === "idle"
                  ? { x: SCATTER[i].x, y: SCATTER[i].y, rotate: SCATTER[i].rotate, opacity: 0 }
                  : phase === "exit"
                  ? {
                      x: SCATTER[i].x * 0.4,
                      y: SCATTER[i].y * 0.4,
                      rotate: SCATTER[i].rotate * 0.5,
                      opacity: 0,
                    }
                  : { x: 0, y: 0, rotate: 0, opacity: 1 }
              }
              transition={{
                type: "spring",
                stiffness: 130,
                damping: 16,
                delay: i * 0.085,
              }}
              style={{
                fontFamily: "'Anybody', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(72px, 13vw, 148px)",
                letterSpacing: "-0.02em",
                lineHeight: 0.9,
                display: "inline-block",
                // Elegant warm white — blends with comic art background
                color: "#F5F0E8",
                textShadow:
                  "0 2px 0 rgba(0,0,0,0.5), 4px 4px 0 rgba(0,0,0,0.3), 0 0 40px rgba(245,240,232,0.08)",
                WebkitTextStroke: "1px rgba(0,0,0,0.25)",
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.button>

        {/* ── CREATION subtitle ── */}
        <motion.div
          initial={{ opacity: 0, y: 20, letterSpacing: "0.5em" }}
          animate={
            phase === "idle" || phase === "assemble"
              ? { opacity: 0, y: 20, letterSpacing: "0.5em" }
              : phase === "exit"
              ? { opacity: 0, y: -10 }
              : { opacity: 1, y: 0, letterSpacing: "0.3em" }
          }
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Anybody', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(13px, 2.2vw, 22px)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#F5F0E8",
            textShadow: "0 1px 8px rgba(0,0,0,0.7), 2px 2px 0 rgba(0,0,0,0.4)",
            marginTop: 6,
          }}
        >
          CREATION
        </motion.div>

        {/* Tap hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={phase === "pulse" ? { opacity: [0, 0.7, 0.4] } : { opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.6, repeat: phase === "pulse" ? Infinity : 0, repeatType: "reverse" }}
          style={{
            marginTop: 32,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,240,232,0.65)",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          TAP TO ENTER
        </motion.div>
      </motion.div>

      {/* ── Bottom copyright ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none"
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,240,232,0.55)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        © 2024 KRAYON STUDIOS · UNLEASH THE NOISE
      </motion.div>
    </div>
  );
}
