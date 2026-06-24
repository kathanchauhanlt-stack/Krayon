import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Hammer, User, Library, Zap, Crown } from "lucide-react";

const NAV_ITEMS = [
  { id: 'realm',   path: '/realm',   label: 'Realm',   icon: Sparkles, color: "from-[#00F0FF] to-[#0080FF]" },
  { id: 'forge',   path: '/forge',   label: 'Forge',   icon: Hammer,   color: "from-[#FF6B00] to-[#FF3D00]" },
  { id: 'vault',   path: '/vault',   label: 'Vault',   icon: Library,  color: "from-[#FFD700] to-[#FF8C00]" },
  { id: 'guild',   path: '/guild',   label: 'Guild',   icon: User,     color: "from-[#10B981] to-[#047857]" },
  { id: 'visions', path: '/visions', label: 'Visions', icon: Zap,      color: "from-[#B026FF] to-[#6A00FF]" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isInit = location.pathname === "/";
  const isAbout = location.pathname === "/about";

  // If we are on the init screen or about screen, we might want to hide the standard layout dock
  // or show it differently. The user wanted the init screen to be retained but better structured.
  // We will keep the dock hidden on init.
  const showDock = !isInit && !isAbout;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a1014] text-[#f8f4e8] overflow-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      
      {/* ── GLOBAL HALFTONE & FILM GRAIN ── */}
      <div className="fixed inset-0 pointer-events-none z-[2] bg-halftone opacity-[0.18]" />
      <div
        className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* ── HEADER ── */}
      <AnimatePresence>
        {showDock && (
          <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0,   opacity: 1 }}
            exit={{    y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="flex items-center justify-between px-6 py-4 z-[200] relative border-b border-[#111]"
            style={{
              background: "linear-gradient(to bottom, rgba(10,16,20,0.95), rgba(10,16,20,0.8))",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            {/* Logo Area */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#FF6B00] to-[#C0392B] flex items-center justify-center border-2 border-[#111] shadow-[2px_2px_0_#111] transition-transform group-hover:scale-105 group-hover:rotate-3">
                <Crown size={20} className="text-white drop-shadow-md" />
              </div>
              <span style={{ fontFamily: "'Bangers',cursive", fontSize: "1.75rem", letterSpacing: "0.12em", WebkitTextStroke: "1px rgba(0,0,0,0.6)", textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }} className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFD700] to-[#FF6B00]">
                KRAYON
              </span>
            </div>

            {/* Path Indicator */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-widest uppercase opacity-70">
                {location.pathname.substring(1) || 'Nexus'}
              </span>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT OUTLET ── */}
      <main className="flex-1 relative overflow-hidden z-[10] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full overflow-y-auto custom-scrollbar"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── DOCK NAVIGATION ── */}
      <AnimatePresence>
        {showDock && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-2 sm:px-4 py-2 w-[95vw] sm:w-auto flex justify-center"
          >
            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 bg-[#111820]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl w-full sm:w-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="relative group flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300"
                  >
                    {/* Background Active State */}
                    {isActive && (
                      <motion.div
                        layoutId="active-dock-bg"
                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-20`}
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <div className={`relative z-10 transition-colors duration-300 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/80"}`}>
                      <item.icon size={22} className={isActive ? "drop-shadow-[0_0_8px_currentColor]" : ""} />
                    </div>
                    
                    {isActive && (
                      <motion.div
                        layoutId="active-dock-indicator"
                        className={`absolute -bottom-1 w-8 h-1 rounded-full bg-gradient-to-r ${item.color}`}
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
