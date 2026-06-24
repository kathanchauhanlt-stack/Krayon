import { motion } from "motion/react";
import { Sparkles, Hammer, User, Library, Zap } from "lucide-react";
import { Pillar } from "../types";

interface NavigationProps {
  activePillar: Pillar;
  setActivePillar: (pillar: Pillar) => void;
}

export default function Navigation({ activePillar, setActivePillar }: NavigationProps) {
  const items = [
    { id: 'realm', label: 'Realm', icon: Sparkles },
    { id: 'forge', label: 'Forge', icon: Hammer },
    { id: 'guild', label: 'Guild', icon: User },
    { id: 'vault', label: 'Vault', icon: Library },
  ];

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-slab px-6 py-3 rounded-full flex items-center gap-8 border-violet-vibrant/20 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePillar(item.id as Pillar)}
            className={`relative group flex flex-col items-center gap-1 transition-all duration-300 ${
              activePillar === item.id ? 'text-violet-vibrant' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <item.icon size={20} className={activePillar === item.id ? 'drop-shadow-[0_0_8px_rgba(159,122,234,0.8)]' : ''} />
            <span className="text-[10px] uppercase tracking-widest font-medium">{item.label}</span>
            {activePillar === item.id && (
              <motion.div
                layoutId="pill-active"
                className="absolute -top-12 px-3 py-1 rounded-md bg-violet-vibrant text-white text-[9px] font-bold uppercase tracking-tighter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Active
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-violet-vibrant rotate-45" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
