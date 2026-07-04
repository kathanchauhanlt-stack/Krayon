import React from "react";
import { Pillar } from "../types";

/* ── shared cloud SVG shape ─────────────────────────────────────── */
function Cloud({ x, y, scale = 1, opacity = 0.55, color = "#fff" }: {
  x: number; y: number; scale?: number; opacity?: number; color?: string;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={opacity}>
      <ellipse cx="60"  cy="60" rx="55" ry="42" fill={color} />
      <ellipse cx="115" cy="55" rx="45" ry="38" fill={color} />
      <ellipse cx="30"  cy="65" rx="35" ry="28" fill={color} />
      <ellipse cx="85"  cy="75" rx="60" ry="35" fill={color} />
    </g>
  );
}

/* ── smoke puff for Forge ───────────────────────────────────────── */
function Smoke({ x, y, r = 30, opacity = 0.3 }: { x:number;y:number;r?:number;opacity?:number }) {
  return <circle cx={x} cy={y} r={r} fill="#888" opacity={opacity} />;
}

/* ══════════════════════════════════════════════════════════════════
   INIT  — deep blue/teal, speed lines
══════════════════════════════════════════════════════════════════ */
function InitBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="ig" cx="50%" cy="55%" r="65%">
          <stop offset="0%"   stopColor="#0d4a56" />
          <stop offset="60%"  stopColor="#071d30" />
          <stop offset="100%" stopColor="#040d18" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#ig)" />
      {/* Speed lines */}
      {Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * 360;
        const rad   = (angle * Math.PI) / 180;
        return (
          <line key={i}
            x1={720} y1={450}
            x2={720 + Math.cos(rad) * 900}
            y2={450 + Math.sin(rad) * 700}
            stroke="rgba(26,159,170,0.12)" strokeWidth="1.5"
          />
        );
      })}
      {/* Ambient clouds */}
      <Cloud x={-40}  y={60}  scale={1.8} opacity={0.06} color="#1a9faa" />
      <Cloud x={1100} y={50}  scale={1.5} opacity={0.07} color="#f47c20" />
      <Cloud x={200}  y={720} scale={1.4} opacity={0.06} color="#1a9faa" />
      <Cloud x={900}  y={700} scale={1.6} opacity={0.06} color="#f5c518" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ABOUT  — teal/orange, comic explosion clouds
══════════════════════════════════════════════════════════════════ */
function AboutBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="abg" cx="35%" cy="45%" r="70%">
          <stop offset="0%"  stopColor="#0b3d4a" />
          <stop offset="55%" stopColor="#071e30" />
          <stop offset="100%" stopColor="#050e1a" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#abg)" />
      {/* Diagonal speed lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1={-200 + i * 90} y1={0} x2={-200 + i * 90 + 300} y2={900}
          stroke="rgba(244,124,32,0.07)" strokeWidth="22" />
      ))}
      {/* Big fluffy clouds */}
      <Cloud x={-80}  y={80}  scale={2.4} opacity={0.15} color="#1a9faa" />
      <Cloud x={1100} y={40}  scale={2.1} opacity={0.13} color="#f47c20" />
      <Cloud x={300}  y={650} scale={1.9} opacity={0.12} color="#1a9faa" />
      <Cloud x={950}  y={680} scale={2.2} opacity={0.14} color="#f5c518" />
      <Cloud x={580}  y={-30} scale={1.7} opacity={0.1}  color="#f47c20" />
      {/* Central radial burst */}
      <circle cx={720} cy={450} r={220} fill="none" stroke="rgba(245,197,24,0.06)" strokeWidth={40} />
      <circle cx={720} cy={450} r={380} fill="none" stroke="rgba(26,159,170,0.04)"  strokeWidth={30} />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FORGE  — fire/lava, clouds of smoke + hammer decorations
══════════════════════════════════════════════════════════════════ */
function ForgeBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="fg" cx="50%" cy="70%" r="75%">
          <stop offset="0%"   stopColor="#8b2a00" />
          <stop offset="40%"  stopColor="#3d0c02" />
          <stop offset="100%" stopColor="#1a0400" />
        </radialGradient>
        <radialGradient id="fire" cx="50%" cy="80%" r="60%">
          <stop offset="0%"  stopColor="rgba(245,197,24,0.5)" />
          <stop offset="40%" stopColor="rgba(244,124,32,0.3)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#fg)" />
      <rect width="1440" height="900" fill="url(#fire)" />

      {/* Lava cracks */}
      {[100,350,600,850,1100,1300].map((x, i) => (
        <path key={i} d={`M${x},900 Q${x+40},${700-i*20} ${x+20},${500+i*15}`}
          stroke="rgba(245,197,24,0.18)" strokeWidth="3" fill="none" />
      ))}

      {/* Smoke clouds rising */}
      <Cloud x={60}   y={450} scale={2.2} opacity={0.18} color="#555" />
      <Cloud x={300}  y={300} scale={1.8} opacity={0.15} color="#666" />
      <Cloud x={1000} y={380} scale={2.0} opacity={0.17} color="#555" />
      <Cloud x={1200} y={500} scale={1.6} opacity={0.14} color="#666" />
      <Cloud x={550}  y={200} scale={1.5} opacity={0.12} color="#888" />

      {/* Hammer icon decorations (outline) */}
      {[
        { cx:120,  cy:200, s:0.9 },
        { cx:1320, cy:180, s:0.8 },
        { cx:700,  cy:820, s:0.7 },
        { cx:280,  cy:760, s:0.75},
        { cx:1100, cy:780, s:0.85},
      ].map(({ cx, cy, s }, i) => (
        <g key={i} transform={`translate(${cx},${cy}) scale(${s}) rotate(${i % 2 === 0 ? -30 : 20})`}
           opacity={0.12} fill="rgba(244,124,32,0.8)">
          {/* Hammer head */}
          <rect x={-20} y={-50} width={60} height={35} rx={4} />
          {/* Handle */}
          <rect x={8} y={-15} width={14} height={80} rx={4} />
        </g>
      ))}

      {/* Ember sparks */}
      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={i}
          cx={200 + i * 65} cy={500 + Math.sin(i * 1.4) * 200}
          r={3 + (i % 3)} fill="#f5c518" opacity={0.25 + (i % 4) * 0.06}
        />
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REALM  — mystical blue, cloud wisps + stars
══════════════════════════════════════════════════════════════════ */
function RealmBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="rg" cx="50%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#0d3060" />
          <stop offset="55%"  stopColor="#071830" />
          <stop offset="100%" stopColor="#030a18" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#rg)" />

      {/* Stars */}
      {Array.from({ length: 60 }).map((_, i) => (
        <circle key={i}
          cx={Math.round(14.4 * ((i * 137 + 50) % 100))}
          cy={Math.round(9    * ((i * 113 + 30) % 100))}
          r={1 + (i % 3) * 0.5}
          fill="#fff" opacity={0.2 + (i % 5) * 0.08}
        />
      ))}

      {/* Misty cloud wisps */}
      <Cloud x={-60}  y={120} scale={2.5} opacity={0.13} color="#1a4a80" />
      <Cloud x={1100} y={80}  scale={2.2} opacity={0.12} color="#1a4a80" />
      <Cloud x={400}  y={700} scale={2.0} opacity={0.14} color="#1a2a60" />
      <Cloud x={900}  y={720} scale={2.3} opacity={0.13} color="#1a3070" />
      <Cloud x={600}  y={-40} scale={1.8} opacity={0.1}  color="#2a5090" />

      {/* Mystical circle rings */}
      {[120, 240, 360].map((r, i) => (
        <circle key={i} cx={720} cy={450} r={r}
          fill="none" stroke="rgba(26,100,180,0.07)" strokeWidth={2}
          strokeDasharray="8 6"
        />
      ))}

      {/* Compass rose hint */}
      <g transform="translate(720,450)" opacity={0.05} stroke="#1a9faa" strokeWidth="1.5" fill="none">
        <line x1="0" y1="-360" x2="0"    y2="360" />
        <line x1="-360" y1="0" x2="360" y2="0"    />
        <line x1="-255" y1="-255" x2="255" y2="255" />
        <line x1="255"  y1="-255" x2="-255" y2="255" />
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VAULT  — golden, treasure clouds + lock decorations
══════════════════════════════════════════════════════════════════ */
function VaultBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="vg" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="#5a3800" />
          <stop offset="50%"  stopColor="#2a1800" />
          <stop offset="100%" stopColor="#100900" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#vg)" />

      {/* Gold shimmer diagonal lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={i * 140} y1={0} x2={i * 140 - 400} y2={900}
          stroke="rgba(245,197,24,0.07)" strokeWidth="30" />
      ))}

      {/* Treasure clouds (golden-tinted) */}
      <Cloud x={-80}  y={60}  scale={2.3} opacity={0.14} color="#c8860a" />
      <Cloud x={1100} y={50}  scale={2.0} opacity={0.13} color="#c8860a" />
      <Cloud x={250}  y={680} scale={1.9} opacity={0.12} color="#a06208" />
      <Cloud x={960}  y={700} scale={2.1} opacity={0.14} color="#c8860a" />

      {/* Lock icon outlines */}
      {[
        { cx: 160,  cy: 200 },
        { cx: 1280, cy: 220 },
        { cx: 720,  cy: 760 },
        { cx: 360,  cy: 760 },
        { cx: 1080, cy: 740 },
      ].map(({ cx, cy }, i) => (
        <g key={i} transform={`translate(${cx},${cy})`} opacity={0.1} fill="rgba(245,197,24,0.8)">
          <rect x={-18} y={0}   width={36} height={28} rx={4} />
          <path d="M-10,-2 Q-10,-26 0,-26 Q10,-26 10,-2" fill="none" stroke="rgba(245,197,24,0.8)" strokeWidth="5" />
          <circle cx={0} cy={14} r={5} fill="#111" />
        </g>
      ))}

      {/* Concentric vault rings */}
      {[80,160,240].map((r, i) => (
        <circle key={i} cx={720} cy={450} r={r}
          fill="none" stroke="rgba(245,197,24,0.06)" strokeWidth={3}
        />
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GUILD  — purple/indigo, shield + banner decorations
══════════════════════════════════════════════════════════════════ */
function GuildBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="gg" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stopColor="#3a1060" />
          <stop offset="55%"  stopColor="#1a0838" />
          <stop offset="100%" stopColor="#0a0418" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#gg)" />

      {/* Clouds */}
      <Cloud x={-60}  y={80}  scale={2.2} opacity={0.12} color="#5a208a" />
      <Cloud x={1100} y={60}  scale={1.9} opacity={0.11} color="#5a208a" />
      <Cloud x={300}  y={680} scale={2.0} opacity={0.13} color="#3a1060" />
      <Cloud x={950}  y={720} scale={2.1} opacity={0.12} color="#5a208a" />

      {/* Shield decorations */}
      {[
        { cx: 140,  cy: 180 },
        { cx: 1300, cy: 200 },
        { cx: 700,  cy: 800 },
        { cx: 320,  cy: 780 },
        { cx: 1100, cy: 760 },
      ].map(({ cx, cy }, i) => (
        <g key={i} transform={`translate(${cx},${cy})`} opacity={0.1}>
          <path d="M0,-40 L30,0 L20,35 L0,45 L-20,35 L-30,0 Z" fill="rgba(244,124,32,0.7)" />
          <path d="M0,-25 L18,0 L12,22 L0,28 L-12,22 L-18,0 Z" fill="none" stroke="rgba(245,197,24,0.5)" strokeWidth="2" />
        </g>
      ))}

      {/* Rank star field */}
      {Array.from({ length: 30 }).map((_, i) => (
        <circle key={i}
          cx={Math.round(14.4 * ((i * 157) % 100))}
          cy={Math.round(9    * ((i * 103) % 100))}
          r={1.5} fill="#f5c518" opacity={0.1 + (i % 4) * 0.05}
        />
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VISIONS  — cinematic red/dark, eye motifs + sparkles
══════════════════════════════════════════════════════════════════ */
function VisionsBG() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="visbg" cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#4a0a0a" />
          <stop offset="50%"  stopColor="#200404" />
          <stop offset="100%" stopColor="#0a0202" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#visbg)" />

      {/* Dark clouds */}
      <Cloud x={-60}  y={60}  scale={2.1} opacity={0.1}  color="#2a0808" />
      <Cloud x={1100} y={50}  scale={1.9} opacity={0.09} color="#2a0808" />
      <Cloud x={300}  y={700} scale={1.8} opacity={0.1}  color="#1a0404" />
      <Cloud x={950}  y={720} scale={2.0} opacity={0.1}  color="#2a0808" />

      {/* Eye decorations */}
      {[
        { cx:200,  cy:200 },
        { cx:1240, cy:180 },
        { cx:720,  cy:780 },
      ].map(({ cx, cy }, i) => (
        <g key={i} transform={`translate(${cx},${cy})`} opacity={0.12}>
          <ellipse cx={0} cy={0} rx={35} ry={20} fill="none" stroke="rgba(192,57,43,0.8)" strokeWidth="3" />
          <circle  cx={0} cy={0} r={10} fill="rgba(192,57,43,0.5)" />
          <circle  cx={0} cy={0} r={5}  fill="rgba(192,57,43,0.8)" />
        </g>
      ))}

      {/* Sparkle dots */}
      {Array.from({ length: 40 }).map((_, i) => (
        <circle key={i}
          cx={Math.round(14.4 * ((i * 131) % 100))}
          cy={Math.round(9    * ((i * 97)  % 100))}
          r={1 + (i % 3) * 0.7}
          fill="rgba(192,57,43,0.6)" opacity={0.15 + (i % 5) * 0.06}
        />
      ))}

      {/* Concentric vision rings */}
      {[100, 200, 320].map((r, i) => (
        <circle key={i} cx={720} cy={450} r={r}
          fill="none" stroke="rgba(192,57,43,0.06)" strokeWidth={3}
        />
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════════════════ */
export default function PageBackground({ pillar }: { pillar: Pillar | string }) {
  const BG: Record<string, React.ReactElement> = {
    init:    <InitBG />,
    about:   <AboutBG />,
    forge:   <ForgeBG />,
    realm:   <RealmBG />,
    vault:   <VaultBG />,
    guild:   <GuildBG />,
    visions: <VisionsBG />,
  };

  return (
    <div className="absolute inset-0 z-[0] overflow-hidden pointer-events-none">
      {BG[pillar] ?? <InitBG />}
    </div>
  );
}
