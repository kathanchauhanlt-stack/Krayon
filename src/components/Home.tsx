import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      
      {/* Splash Copy */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-0 right-0 flex flex-col items-center gap-5 pointer-events-none z-[50]"
          style={{ bottom: "15%" }}
        >
          <motion.p
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ fontFamily: "'Bangers',cursive", fontSize: "clamp(1.1rem,2.8vw,1.9rem)", letterSpacing: "0.14em", color: "#f8f4e8", textShadow: "2px 2px 0 #111, 0 0 28px rgba(255,107,0,0.6)", textAlign: "center", padding: "0 24px" }}
          >
            AI-POWERED FANTASY COMIC CREATION
          </motion.p>

          <div className="flex gap-4">
            {(["FORGE","EXPLORE","PUBLISH"] as const).map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.12, type: "spring" }}
                style={{
                  fontFamily: "'Bangers',cursive", fontSize: "1rem", letterSpacing: "0.1em",
                  background: i === 0 ? "linear-gradient(135deg, #FF6B00, #FF3D00)" : i === 1 ? "linear-gradient(135deg, #00F0FF, #0080FF)" : "linear-gradient(135deg, #FFD700, #FF8C00)",
                  color: "#111", border: "2px solid #111", boxShadow: "3px 3px 0 #111", padding: "4px 16px",
                  borderRadius: "8px"
                }}
              >
                {w}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action Words */}
      <AnimatePresence>
        {[
          { word: "POW!",    pct: { left:"15%", top:"25%" }, rot: -13, color:"#FF6B00", sz:"2.5rem" },
          { word: "ZAP!",    pct: { left:"75%", top:"20%" }, rot:  8,  color:"#00F0FF", sz:"2.2rem" },
          { word: "BOOM!",   pct: { left:"80%", top:"65%" }, rot: -6,  color:"#FFD700", sz:"2.4rem" },
          { word: "KA-POW!", pct: { left:"10%", top:"60%" }, rot: 11,  color:"#B026FF", sz:"1.8rem" },
        ].map(({ word, pct, rot, color, sz }) => (
          <motion.div
            key={word}
            className="absolute pointer-events-none z-[60]"
            style={pct}
            initial={{ scale: 0, rotate: rot - 12, opacity: 0 }}
            animate={{ scale: 1, rotate: rot,      opacity: 1 }}
            exit={{    scale: 0,                   opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.3 }}
          >
            <span style={{ fontFamily:"'Bangers',cursive", fontSize: sz, color, WebkitTextStroke:"1px #111", textShadow:"3px 3px 0 #111", letterSpacing:"0.05em", display:"block" }}>
              {word}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Center Logo CTA */}
      <motion.div
        className="absolute z-[300] cursor-pointer"
        style={{ top: "45%", left: "50%", x: "-50%", y: "-50%" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/realm")}
      >
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ inset: -30, background: "radial-gradient(circle, rgba(255,107,0,0.45) 0%, rgba(255,215,0,0.25) 50%, transparent 72%)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        />
        <div
          className="relative flex flex-col items-center justify-center rounded-full"
          style={{
            width: 180, height: 180,
            background: "linear-gradient(135deg,#FFD700 0%,#FF6B00 50%,#C0392B 100%)",
            border: "5px solid #111",
            boxShadow: "0 0 0 4px #FFD700, 10px 10px 0 #111",
          }}
        >
          <div className="absolute inset-0 rounded-full bg-halftone opacity-25 mix-blend-multiply pointer-events-none" />
          <Logo scale={0.65} />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "4px solid #FFD700" }}
            animate={{ scale: [1, 1.3], opacity: [0.85, 0] }}
            transition={{ duration: 1.7, repeat: Infinity }}
          />
        </div>
        <motion.div
          className="absolute whitespace-nowrap"
          style={{ bottom: -60, left: "50%", transform: "translateX(-50%)" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <span className="speech-bubble" style={{ fontFamily: "'Bangers',cursive", fontSize: "1.2rem", letterSpacing: "0.08em", padding: "10px 24px", display: "block", background: "#fff", color: "#111", border: "3px solid #111", borderRadius: "16px", boxShadow: "4px 4px 0 #111" }}>
            ENTER THE REALM! ⚡
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
