import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Wand2, Type, Music, X, BookOpen, Loader2 } from "lucide-react";
import { generateDialogue, enhanceScenePrompt } from "../services/gemini";

interface HallOfVisionsProps { onClose: () => void; }

const PAGES = [
  {
    id: 1,
    panels: [
      {
        id: 'p1-main',
        img: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=900&auto=format&fit=crop',
        dialogue: "It's quiet.",
        dialoguePos: 'top-left',
        size: 'large',
      },
      {
        id: 'p1-b',
        img: '',
        text: 'TOO QUIET.',
        size: 'accent',
      },
      {
        id: 'p1-c',
        img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=500&auto=format&fit=crop',
        size: 'small',
      },
    ],
  },
  {
    id: 2,
    panels: [
      {
        id: 'p2-main',
        img: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=900&auto=format&fit=crop',
        dialogue: "They were here.",
        dialoguePos: 'bottom-right',
        size: 'large',
      },
      {
        id: 'p2-b',
        img: '',
        text: 'DANGER!',
        size: 'accent',
      },
      {
        id: 'p2-c',
        img: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=500&auto=format&fit=crop',
        size: 'small',
      },
    ],
  },
];

export default function HallOfVisions({ onClose }: HallOfVisionsProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = PAGES.length;
  const currentPage = PAGES[pageIndex];

  // AI state
  const [refineResult, setRefineResult] = useState('');
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [generatedDialogue, setGeneratedDialogue] = useState('');
  const [isRefineLoading, setIsRefineLoading] = useState(false);
  const [isDialogueLoading, setIsDialogueLoading] = useState(false);

  const goNext = () => setPageIndex(i => Math.min(i + 1, totalPages - 1));
  const goPrev = () => setPageIndex(i => Math.max(i - 1, 0));

  const handleRefine = async () => {
    setIsRefineLoading(true);
    try {
      const result = await enhanceScenePrompt(
        "A figure stands in shadow, the city glows behind them"
      );
      setRefineResult(result);
      setShowRefinePanel(true);
    } catch {
      setRefineResult("Unable to refine scene. Please try again.");
      setShowRefinePanel(true);
    } finally {
      setIsRefineLoading(false);
    }
  };

  const handleDialogue = async () => {
    setIsDialogueLoading(true);
    try {
      const dialogue = await generateDialogue(
        "A tense confrontation in neon-lit alley",
        "Detective Ryuu"
      );
      setGeneratedDialogue(dialogue);
    } catch {
      setGeneratedDialogue("The shadows remember everything.");
    } finally {
      setIsDialogueLoading(false);
    }
  };

  const tools = [
    {
      label: 'Refine',
      Icon: Wand2,
      color: 'bg-fantasy-gold',
      isLoading: isRefineLoading,
      onClick: handleRefine,
    },
    {
      label: 'Dialogue',
      Icon: Type,
      color: 'bg-fantasy-ice',
      isLoading: isDialogueLoading,
      onClick: handleDialogue,
    },
    {
      label: 'Aura',
      Icon: Music,
      color: 'bg-fantasy-crimson',
      isLoading: false,
      onClick: () => {},
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full bg-transparent flex items-center justify-center overflow-hidden relative"
    >
      {/* Halftone bg */}
      <div className="absolute inset-0 bg-halftone-white opacity-[0.05] pointer-events-none" />
      {/* Ambient glows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-fantasy-crimson/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-fantasy-ice/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Close button ── */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 w-12 h-12 bg-obsidian border border-fantasy-gold/50 flex items-center justify-center
          hover:bg-fantasy-crimson hover:text-white transition-all shadow-fantasy-glow"
      >
        <X size={22} strokeWidth={3} className="text-white" />
      </button>

      {/* ── HUD: Title + page counter ── */}
      <div className="absolute top-6 inset-x-0 flex flex-col items-center justify-center z-40 pointer-events-none">
        <div className="bg-obsidian border border-fantasy-gold/50 px-6 py-2 shadow-[6px_6px_0_#FFFF00] rotate-1 flex items-center gap-4">
          <BookOpen size={20} strokeWidth={3} className="text-white" />
          <h2 className="text-2xl font-fantasy tracking-widest uppercase text-white">HALL OF VISIONS</h2>
          <span className="font-mono text-sm font-bold text-white border-l-4 border-fantasy-gold pl-4">
            {pageIndex + 1} / {totalPages}
          </span>
        </div>
      </div>

      {/* ── Main comic panel viewer ── */}
      <div className="relative w-full max-w-4xl px-16 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage.id}
            initial={{ opacity: 0, scale: 0.93, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.93, x: -40 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full h-[65vh] bg-obsidian border-8 border-fantasy-gold shadow-[16px_16px_0_#FF007F] p-3 flex flex-col gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none mix-blend-multiply" />

            <div className="flex-1 flex flex-col md:flex-row gap-3 h-full">
              {/* Large main panel */}
              <div className="w-full md:w-2/3 h-1/2 md:h-full bg-black border border-fantasy-gold/50 relative overflow-hidden group cursor-pointer">
                <img
                  src={currentPage.panels[0].img}
                  className="absolute inset-0 w-full h-full object-cover contrast-150 grayscale group-hover:grayscale-0 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-fantasy-crimson/20 mix-blend-color pointer-events-none" />

                {/* Speech bubble — AI or fallback */}
                {currentPage.panels[0].dialogue && (
                  <div className="absolute top-6 left-6 bg-obsidian border border-fantasy-gold/50 rounded-[45%]
                    px-5 py-3 max-w-[180px] text-center font-fantasy text-lg text-white shadow-[4px_4px_0_#000] rotate-2 z-20">
                    {generatedDialogue || currentPage.panels[0].dialogue}
                    {/* Tail */}
                    <div className="absolute -bottom-4 right-8 w-5 h-5 bg-obsidian border-l-4 border-b-4 border-fantasy-gold rotate-45 -z-10" />
                  </div>
                )}
              </div>

              {/* Side panels */}
              <div className="flex-1 flex flex-row md:flex-col gap-3 h-1/2 md:h-full">
                {/* Accent text panel */}
                <div className="flex-1 bg-fantasy-gold border border-fantasy-gold/50 relative overflow-hidden flex items-center justify-center p-3">
                  <span className="font-fantasy text-3xl md:text-4xl text-white tracking-widest text-shadow-fantasy transform -rotate-12 text-center leading-none">
                    {currentPage.panels[1].text}
                  </span>
                </div>

                {/* Smaller image panel */}
                <div className="flex-1 md:h-2/3 bg-black border border-fantasy-gold/50 relative overflow-hidden group cursor-pointer">
                  <img
                    src={currentPage.panels[2].img}
                    className="absolute inset-0 w-full h-full object-cover contrast-200 saturate-200 group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Chevron navigation — OUTSIDE the overflow-hidden container ── */}
        <button
          onClick={goPrev}
          disabled={pageIndex === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-obsidian border border-fantasy-gold/50
            flex items-center justify-center hover:bg-fantasy-gold active:translate-y-1 transition-all
            shadow-[4px_4px_0_#000] hover:shadow-none z-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={28} className="text-white" strokeWidth={3} />
        </button>
        <button
          onClick={goNext}
          disabled={pageIndex === totalPages - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-obsidian border border-fantasy-gold/50
            flex items-center justify-center hover:bg-fantasy-crimson hover:text-white active:translate-y-1 transition-all
            shadow-[4px_4px_0_#000] hover:shadow-none z-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={28} className="text-white" strokeWidth={3} />
        </button>
      </div>

      {/* ── AI Refine result panel ── */}
      <AnimatePresence>
        {showRefinePanel && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-auto px-4"
          >
            <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0_#000] relative">
              <button
                onClick={() => setShowRefinePanel(false)}
                className="absolute top-2 right-2 w-7 h-7 bg-black flex items-center justify-center hover:bg-fantasy-crimson transition-colors"
              >
                <X size={14} className="text-white" strokeWidth={3} />
              </button>
              <p className="font-bold text-black text-sm pr-8 leading-snug">{refineResult}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating tools ── */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-6 z-50">
        {tools.map(({ label, Icon, color, isLoading, onClick }) => (
          <button key={label} onClick={onClick} className="flex flex-col items-center gap-2 group">
            <div className={`w-14 h-14 ${color} border border-fantasy-gold/50 flex items-center justify-center
              group-hover:-translate-y-2 transition-transform shadow-[4px_4px_0_#000] group-hover:shadow-none`}>
              {isLoading
                ? <Loader2 size={28} className="text-white animate-spin" strokeWidth={3} />
                : <Icon size={28} className="text-white" strokeWidth={3} />
              }
            </div>
            <span className="text-xs font-fantasy uppercase tracking-wider text-white bg-obsidian px-2 border-2 border-fantasy-gold shadow-[2px_2px_0_#000]">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Page dots */}
      <div className="absolute bottom-32 right-8 flex gap-2 z-50">
        {PAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setPageIndex(i)}
            className={`w-3 h-3 border-2 border-fantasy-gold transition-all
              ${i === pageIndex ? 'bg-fantasy-crimson scale-125' : 'bg-obsidian'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
