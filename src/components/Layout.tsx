import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Hammer, User, Library, Zap, Crown, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

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
  const { user, profile, loading, signInWithGoogle, signInAnonymously, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isInit = location.pathname === "/";
  const isAbout = location.pathname === "/about";
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
              className="flex items-center cursor-pointer group"
              onClick={() => navigate("/")}
            >
              <Logo scale={0.4} className="group-hover:scale-105 transition-transform" />
            </div>

            {/* Auth Actions & Path */}
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm tracking-widest uppercase opacity-75 hidden sm:inline border-r border-white/10 pr-4">
                {location.pathname.substring(1) || 'Nexus'}
              </span>

              {loading ? (
                <Loader2 size={20} className="animate-spin text-comic-yellow" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#111] border border-white/15 px-3 py-1.5 rounded-xl">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-6 h-6 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={14} className="text-comic-orange" />
                    )}
                    <span className="text-xs font-bold font-mono tracking-wider max-w-[100px] truncate">
                      {profile?.username || "Guest"}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl hover:bg-comic-red/10 border border-transparent hover:border-comic-red/20 text-white/60 hover:text-comic-red transition-all cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B00] to-[#FF3D00] text-white px-4 py-2 rounded-xl border border-black shadow-[2px_2px_0_#000] font-bold text-xs uppercase hover:translate-y-px hover:shadow-none transition-all cursor-pointer"
                >
                  <LogIn size={14} /> Sign In
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── AUTH MODAL OVERLAY ── */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#111820] border-4 border-black p-8 shadow-[8px_8px_0_#000] z-10 flex flex-col gap-6 text-center text-[#f8f4e8]"
            >
              <div>
                <h3 className="text-3xl font-comic text-comic-yellow tracking-wider text-shadow-comic leading-none mb-2">
                  ENTER THE SANCTUM
                </h3>
                <p className="text-xs uppercase font-bold tracking-widest text-[#f8f4e8]/60">
                  Choose your path to start forging
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    await signInWithGoogle();
                    setShowLoginModal(false);
                  }}
                  className="w-full bg-[#EA4335] text-white border-4 border-black py-3 rounded-xl font-comic uppercase tracking-wider text-sm shadow-[4px_4px_0_#000] hover:translate-y-px hover:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Sign In with Google
                </button>
                <button
                  onClick={async () => {
                    await signInAnonymously();
                    setShowLoginModal(false);
                  }}
                  className="w-full bg-comic-teal text-[#111] border-4 border-black py-3 rounded-xl font-comic uppercase tracking-wider text-sm shadow-[4px_4px_0_#000] hover:translate-y-px hover:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Enter as Guest
                </button>
              </div>

              <button
                onClick={() => setShowLoginModal(false)}
                className="text-xs uppercase font-bold tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
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
