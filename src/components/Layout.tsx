import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, LogOut, Loader2, User } from "lucide-react";

const NAV_ITEMS = [
  { id: "stream",  path: "/stream",  icon: "play_circle",  label: "STREAM"  },
  { id: "studio",  path: "/studio",  icon: "edit_note",    label: "STUDIO"  },
  { id: "reader",  path: "/reader",  icon: "menu_book",    label: "READER"  },
  { id: "vault",   path: "/vault",   icon: "inventory_2",  label: "VAULT"   },
  { id: "profile", path: "/profile", icon: "person",       label: "PROFILE" },
];

// Comic-burst header background (public CDN)
const HEADER_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBTCHkvfOmGepfYCCAbAWysxEaYAB2I-LJ2iSr9E39SrEseQ1tszc7ckyMTDCC7MsGEBkQIS5Mcy_F_OZOQMmAapmFUIJ9z5FZatEfKqZXf2b0zT76_SpqVKe1tNchBvSlPYDP9yePmLfQbsM-UNFYl11-jL4tuKzcYId7ftN5PrIYv6fwxRGRhaz-Kb4UFOiFkaK6RUIQm4ZQAUM5mAB2hkuh5eGifXfRtLtGDGrehmyoiw1AeBQjtIIXPgZyY2JMVRw";
const NAV_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC9uScC6OcWnWQKXODGnk_IjlW9t8zgCvhOs379_gZhHz_by3lZ_zCDZ8LGpKm21WlkmrAmde8tpQabcHaaW3v0kg4lqwnbJ41IMBaKu-_2asUaEKACxkTgDpGs90ZeqxcFaF5EQcxuPQNgn8RXExM9aIcC5ayxJYmhIjcIiCfjWixh49lfd3xmZaU5Lky8HwLm3n_Vax11h62KcPbWRL9C7IRTOVP8V-oub7OfM0ObpZ35Qh66HMp2hXNhoghgG4p9pA";

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, profile, loading, signInWithGoogle, signInAnonymously, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isInit  = location.pathname === "/";
  const showUI  = !isInit;

  const activeNav = NAV_ITEMS.find(
    (n) => location.pathname === n.path || location.pathname.startsWith(n.path + "/")
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#111317", fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* ── FILM GRAIN ── */}
      <div
        className="fixed inset-0 pointer-events-none z-[999] opacity-[0.025] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* ── TOP HEADER ── */}
      <AnimatePresence>
        {showUI && (
          <motion.header
            initial={{ y: -96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="relative flex items-center justify-between w-full z-[200] flex-shrink-0 overflow-hidden"
            style={{
              height: "100px",
              borderBottom: "4px solid #000",
              boxShadow: "0 4px 0 0 #000, 0 8px 32px rgba(0,0,0,0.7)",
              background: "#0c0e12",
            }}
          >
            {/* Comic burst texture — crisp, saturated, no blur */}
            <img
              src={HEADER_BG}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ opacity: 0.22, filter: "saturate(2) contrast(1.3) brightness(1.4)" }}
            />
            {/* Cyan left-edge accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none"
              style={{ width: 4, background: "linear-gradient(to bottom, #c3f5ff, #00daf3)" }}
            />

            <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 md:px-6 flex justify-between items-center">
              {/* Logo */}
              <button
                onClick={() => navigate("/")}
                className="select-none"
                style={{
                  fontFamily: "'Anybody', sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(28px, 4vw, 38px)",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: "#c3f5ff",
                  textShadow: "0 0 20px rgba(195,245,255,0.5), 2px 3px 0 rgba(0,0,0,1), 0 0 40px rgba(0,218,243,0.3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textTransform: "uppercase",
                }}
              >
                KRAYON
              </button>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-[#c3f5ff]" />
                ) : user ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#1e2024] border border-[#3b494c]/50 px-3 py-1.5 rounded-xl">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={14} className="text-[#c3f5ff]" />
                      )}
                      <span className="text-xs font-bold font-mono tracking-wider text-[#e2e2e8] max-w-[100px] truncate">
                        {profile?.username || "Guest"}
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 rounded-xl text-[#bac9cc] hover:text-[#ffb1c3] hover:bg-[#1e2024] transition-all cursor-pointer"
                      title="Sign Out"
                      style={{ background: "none", border: "none" }}
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 bg-[#c3f5ff] text-[#00363d] px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-[#9cf0ff] transition-all cursor-pointer"
                    style={{ border: "none", boxShadow: "2px 2px 0 #000" }}
                  >
                    <LogIn size={14} /> Sign In
                  </button>
                )}

                <button
                  className="hover:scale-110 transition-transform"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c3f5ff", filter: "drop-shadow(0 0 6px rgba(195,245,255,0.5)) drop-shadow(2px 2px 0 rgba(0,0,0,0.8))" }}
                  title="Notifications"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'wght' 600" }}>notifications</span>
                </button>
                <button
                  className="hover:scale-110 transition-transform"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c3f5ff", filter: "drop-shadow(0 0 6px rgba(195,245,255,0.5)) drop-shadow(2px 2px 0 rgba(0,0,0,0.8))" }}
                  title="Search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'wght' 600" }}>search</span>
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-sm p-8 z-10 flex flex-col gap-6 text-center"
              style={{
                background: "#1e2024",
                border: "1px solid #3b494c",
                borderRadius: "1rem",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              }}
            >
              <div>
                <h3 className="text-2xl font-display text-[#c3f5ff] tracking-tight uppercase leading-none mb-2" style={{ fontWeight: 900 }}>
                  ENTER THE SANCTUM
                </h3>
                <p className="text-xs uppercase font-bold tracking-widest text-[#bac9cc]">
                  Choose your path to start forging
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => { await signInWithGoogle(); setShowLoginModal(false); }}
                  className="w-full text-white py-3 rounded-xl font-bold uppercase tracking-wider text-sm cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "#EA4335", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 12px rgba(234,67,53,0.3)" }}
                >
                  Sign In with Google
                </button>
                <button
                  onClick={async () => { await signInAnonymously(); setShowLoginModal(false); }}
                  className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "#c3f5ff", color: "#00363d", border: "none", boxShadow: "0 4px 12px rgba(195,245,255,0.2)" }}
                >
                  Enter as Guest
                </button>
              </div>

              <button
                onClick={() => setShowLoginModal(false)}
                className="text-xs uppercase font-bold tracking-widest text-[#bac9cc] hover:text-[#e2e2e8] transition-colors cursor-pointer"
                style={{ background: "none", border: "none" }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 relative overflow-hidden z-[10]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full overflow-y-auto custom-scrollbar"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── FLOATING BOTTOM NAV ── */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]"
          >
            <nav
              className="relative flex items-center justify-center px-4 py-3 overflow-hidden"
              style={{
                borderRadius: 9999,
                border: "2px solid #000",
                boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
                background: "#111317",
              }}
            >
              {/* Comic burst texture */}
              <img
                src={NAV_BG}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ mixBlendMode: "screen", opacity: 0.7 }}
              />

              {/* Nav items */}
              <div
                className="relative z-10 flex items-center gap-1"
                style={{
                  background: "rgba(28, 30, 34, 0.95)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 9999,
                  padding: "6px 8px",
                  border: "1px solid rgba(0,0,0,0.8)",
                }}
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = activeNav?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      title={item.label}
                      className="flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                      style={{
                        padding: "10px 14px",
                        borderRadius: isActive ? "1rem" : 9999,
                        background: isActive ? "#f5cd00" : "transparent",
                        color: isActive ? "#3a3000" : "#bac9cc",
                        border: isActive ? "2px solid #000" : "2px solid transparent",
                        boxShadow: isActive ? "2px 2px 0px 0px rgba(0,0,0,1)" : "none",
                        transition: "all 0.2s ease",
                        minWidth: 56,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 22,
                          fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                          lineHeight: 1,
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          lineHeight: 1,
                          opacity: isActive ? 1 : 0.75,
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
