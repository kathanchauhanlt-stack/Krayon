import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Wand2, ArrowRight, Sparkles, X,
  LayoutGrid, Check, ArrowLeft, Zap
} from "lucide-react";
import { Pillar } from "../types";

const GENRES   = ['Cyberpunk', 'Fantasy', 'Noir', 'Sci-Fi', 'Horror', 'Slice of Life'];
const STYLES   = ['Manga', 'American Comic', 'Noir', 'Webtoon', 'Painted', 'Pixel Art'];
const STEP_LABELS = ['Title & Genre', 'Characters & Style', 'Scene Prompt'];

interface Character {
  id: number;
  name: string;
  img: string;
}

type MobileTab = 'wizard' | 'canvas';

export default function Forge() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [title, setTitle]           = useState('');
  const [concept, setConcept]       = useState('');
  const [selectedGenre, setGenre]   = useState('Cyberpunk');
  const [selectedStyle, setStyle]   = useState('American Comic');
  const [prompt, setPrompt]         = useState('');
  const [isGenerating, setGenerating] = useState(false);
  const [isAiLoading, setAiLoading] = useState(false);
  const [mobileTab, setMobileTab]   = useState<MobileTab>('wizard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [characters, setCharacters] = useState<Character[]>([
    { id: 1, name: 'Protagonist', img: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=200&auto=format&fit=crop' },
  ]);

  const handleAddCharacter = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCharacters(prev => [
      ...prev,
      { id: Date.now(), name: `Character ${prev.length + 1}`, img: url },
    ]);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const removeCharacter = (id: number) =>
    setCharacters(prev => prev.filter(c => c.id !== id));

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setAiLoading(true);
    // Stub — replace with real Gemini call
    await new Promise(r => setTimeout(r, 1200));
    setPrompt(prev => prev + '\n\n[AI Enhanced]: The neon-lit alley hums with electric tension as rain sheets down in curtains of silver light...');
    setAiLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden relative">

      {/* ════════════════════════════════════════
          LEFT PANEL — Wizard
          On mobile: full-width, hidden when mobileTab==='canvas'
          On md+: always visible, fixed width
      ════════════════════════════════════════ */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`
          w-full md:w-[440px] xl:w-[480px] flex flex-col shrink-0 relative overflow-hidden
          ${mobileTab === 'canvas' ? 'hidden md:flex' : 'flex'}
        `}
        style={{ background: 'rgba(42,9,5,0.95)', borderRight: '5px solid #111' }}
      >
        {/* halftone overlay */}
        <div className="absolute inset-0 bg-halftone opacity-[0.08] pointer-events-none" />

        {/* pb-16 on mobile to account for bottom tab bar */}
        <div className="relative z-10 flex flex-col h-full p-7 pt-20 pb-16 md:pb-7">

          {/* Panel header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-black border border-black flex items-center justify-center shadow-fantasy-ice rotate-3 shrink-0">
              <LayoutGrid className="text-white" size={28} />
            </div>
            <div className="-rotate-1">
              <h2 className="text-4xl font-fantasy tracking-wider uppercase text-black">THE FORGE</h2>
              <p className="text-[10px] uppercase tracking-widest text-white font-black bg-black inline-block px-1 border-2 border-black">
                Construct your reality
              </p>
            </div>
          </div>

          {/* Progress stepper */}
          <div className="flex items-start justify-between mb-6 border border-fantasy-gold/50 p-3 bg-obsidian shadow-fantasy-glow">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`
                    w-9 h-9 flex items-center justify-center font-fantasy font-bold border border-fantasy-gold/50 transition-all
                    ${step === i ? 'bg-fantasy-crimson text-white scale-110 shadow-[2px_2px_0_#000]'
                      : step > i  ? 'bg-fantasy-steel text-white'
                      : 'bg-gray-200 text-gray-500'}
                  `}>
                    {step > i ? <Check size={16} strokeWidth={4} /> : i}
                  </div>
                  {/* Step labels — hidden on mobile */}
                  <span className={`hidden sm:block text-[9px] uppercase font-bold tracking-wider whitespace-nowrap
                    ${step >= i ? 'text-white' : 'text-gray-400'}`}>
                    {STEP_LABELS[i - 1]}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`w-10 xl:w-16 h-2 border-y-2 border-fantasy-gold mx-2 mb-4
                    ${step > i ? 'bg-fantasy-steel' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content — scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
            <AnimatePresence mode="wait">

              {/* ── Step 1 ── */}
              {step === 1 && (
                <motion.section
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Comic Title</span>
                    </label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Enter title…"
                      className="w-full bg-white text-black border-[4px] border-black shadow-[4px_4px_0_#000] focus:bg-comic-yellow"
                    />
                  </div>

                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Select Genre</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button
                          key={g}
                          onClick={() => setGenre(g)}
                          className={`px-3 py-2 border border-fantasy-gold/50 font-fantasy uppercase text-xs
                            shadow-[2px_2px_0_#000] hover:translate-y-px hover:shadow-none transition-all
                            ${selectedGenre === g ? 'bg-fantasy-crimson text-white' : 'bg-obsidian text-white'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Core Concept</span>
                    </label>
                    <textarea
                      value={concept}
                      onChange={e => setConcept(e.target.value)}
                      placeholder="Summarize the plot…"
                      className="w-full h-28 bg-white text-black border-[4px] border-black shadow-[4px_4px_0_#000] focus:bg-comic-yellow"
                    />
                  </div>
                </motion.section>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <motion.section
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Character Manifest</span>
                    </label>
                    <p className="text-xs font-bold uppercase mb-3 text-white/70">Establish the heroes and villains of your narrative.</p>
                    <div className="flex flex-wrap gap-3">
                      {characters.map(char => (
                        <div key={char.id} className="relative group/char">
                          <div className="w-20 h-20 overflow-hidden border border-fantasy-gold/50 bg-obsidian cursor-pointer
                            shadow-fantasy-ice transform transition-all hover:-translate-y-1 hover:-translate-x-1">
                            <img src={char.img} alt={char.name}
                              className="w-full h-full object-cover grayscale contrast-125"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <button
                            onClick={() => removeCharacter(char.id)}
                            className="absolute -top-2 -right-2 bg-fantasy-crimson border border-fantasy-gold/50 rounded-full p-0.5
                              text-white hover:bg-obsidian hover:text-white transition-all z-10 shadow-fantasy-glow
                              opacity-0 group-hover/char:opacity-100"
                          >
                            <X size={12} strokeWidth={4} />
                          </button>
                          <p className="text-[9px] font-bold uppercase text-center mt-1 truncate w-20">{char.name}</p>
                        </div>
                      ))}

                      <button
                        onClick={handleAddCharacter}
                        className="w-20 h-20 border-4 border-dashed border-fantasy-gold bg-obsidian flex flex-col items-center justify-center
                          hover:bg-fantasy-ice transition-all gap-1 shadow-fantasy-glow cursor-pointer"
                      >
                        <Plus size={28} className="text-white" strokeWidth={3} />
                        <span className="font-fantasy text-xs uppercase tracking-wide text-white">Add Art</span>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                  </div>

                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Art Style</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map(style => (
                        <button
                          key={style}
                          onClick={() => setStyle(style)}
                          className={`px-2 py-3 border border-fantasy-gold/50 font-fantasy uppercase text-xs
                            shadow-[2px_2px_0_#000] transition-all text-center hover:translate-y-px hover:shadow-none
                            ${selectedStyle === style ? 'bg-fantasy-ice text-white' : 'bg-obsidian text-white hover:bg-gray-100'}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* ── Step 3 ── */}
              {step === 3 && (
                <motion.section
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2">
                    {title && (
                      <span className="bg-fantasy-crimson border-2 border-fantasy-gold px-2 py-1 font-fantasy text-xs text-white uppercase">
                        {title}
                      </span>
                    )}
                    <span className="bg-fantasy-ice border-2 border-fantasy-gold px-2 py-1 font-fantasy text-xs text-white uppercase">
                      {selectedGenre}
                    </span>
                    <span className="bg-obsidian border-2 border-fantasy-gold px-2 py-1 font-fantasy text-xs text-white uppercase">
                      {selectedStyle}
                    </span>
                  </div>

                  <div>
                    <label className="bg-black text-white px-2 py-1 inline-block border-2 border-fantasy-gold mb-2">
                      <span className="font-fantasy text-base tracking-wider">Scene Description</span>
                    </label>
                    <p className="text-xs font-bold uppercase mb-2 text-white/70">Describe the action, dialogue, and framing. Let the AI visualize it.</p>
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Neon lights reflect off the wet pavement. A cyborg assassin drops from the rooftop…"
                        className="w-full h-48 bg-obsidian border border-fantasy-gold/50 p-4 text-white focus:outline-none
                          focus:bg-fantasy-ice/10 transition-all font-sans font-bold resize-none shadow-fantasy-glow text-sm"
                      />
                      <button
                        onClick={handleAskAI}
                        disabled={isAiLoading || !prompt.trim()}
                        className="absolute bottom-4 right-4 p-2 bg-fantasy-gold border border-fantasy-gold/50 shadow-fantasy-glow text-white
                          hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all flex items-center gap-2 font-fantasy uppercase text-xs
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAiLoading
                          ? <><Zap size={16} strokeWidth={3} className="animate-spin" /> Thinking…</>
                          : <><Wand2 size={16} strokeWidth={3} /> Ask AI</>
                        }
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-5 pt-5 border-t-4 border-fantasy-gold shrink-0">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="py-3 px-5 bg-obsidian border border-fantasy-gold/50 text-white font-fantasy tracking-widest text-lg
                  shadow-[4px_4px_0_#000] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <ArrowLeft size={22} strokeWidth={3} />
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 bg-fantasy-steel border border-fantasy-gold/50 text-white font-fantasy tracking-widest text-xl
                  shadow-[6px_6px_0_#000] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_#000] transition-all
                  flex items-center justify-center gap-2"
              >
                NEXT <ArrowRight size={24} strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 py-3 bg-fantasy-crimson border border-fantasy-gold/50 text-white font-fantasy tracking-widest text-xl
                  shadow-[6px_6px_0_#000] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_#000] transition-all
                  flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating
                  ? <><Sparkles size={22} className="animate-spin" /> FORGING…</>
                  : <>GENERATE <Sparkles size={22} /></>
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Comic Canvas
          On mobile: only visible when mobileTab==='canvas'
          On md+: always visible
      ════════════════════════════════════════ */}
      <div className={`
        flex-1 bg-transparent relative p-6 flex items-center justify-center overflow-auto
        ${mobileTab === 'wizard' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Halftone texture */}
        <div className="absolute inset-0 bg-halftone-white opacity-[0.05] pointer-events-none" />
        {/* Pink ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-fantasy-crimson/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="relative w-full max-w-lg xl:max-w-xl aspect-[2/3] bg-obsidian border-8 border-fantasy-gold
            shadow-[16px_16px_0px_rgba(0,0,0,1)] p-3 flex flex-col gap-3 overflow-hidden group z-10"
        >
          {/* Top panel — establishing shot */}
          <div className="w-full flex-[2] bg-black relative border border-fantasy-gold/50 overflow-hidden hover:scale-[1.01] transition-transform">
            <img
              src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop"
              className="absolute inset-0 w-full h-full object-cover contrast-150 saturate-150"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-fantasy-gold border border-fantasy-gold/50 px-3 py-1 text-white font-fantasy text-lg -rotate-2 z-20 shadow-[3px_3px_0_rgba(0,0,0,1)] uppercase">
              "Neo-Kyoto, 2145."
            </div>
            {isGenerating && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                <span className="font-fantasy text-2xl text-fantasy-gold text-shadow-fantasy animate-pulse">
                  FORGING…
                </span>
              </div>
            )}
          </div>

          {/* Middle row — split action */}
          <div className="flex gap-3 flex-[1.2]">
            <div
              className="w-2/5 bg-fantasy-crimson border border-fantasy-gold/50 relative overflow-hidden"
              style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0% 100%)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=600&auto=format&fit=crop"
                className="absolute inset-0 w-full h-full object-cover contrast-200 mix-blend-luminosity grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-fantasy-crimson/50 mix-blend-color" />
            </div>
            <div
              className="flex-1 bg-obsidian border border-fantasy-gold/50 relative overflow-hidden flex items-center justify-center"
              style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0% 100%)' }}
            >
              <div className="absolute inset-0 bg-halftone opacity-40" />
              <div className="bg-black text-white font-fantasy text-4xl px-5 py-1 border border-fantasy-gold/50 -rotate-6 shadow-[5px_5px_0px_#FF007F]">
                BOOM!
              </div>
            </div>
          </div>

          {/* Bottom panel — dialogue */}
          <div className="w-full flex-[1] bg-black border border-fantasy-gold/50 relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop"
              className="absolute inset-0 w-full h-full object-cover object-top contrast-125 saturate-200"
              referrerPolicy="no-referrer"
            />
            {/* Speech bubble */}
            <div className="absolute right-8 top-4 bg-obsidian border border-fantasy-gold/50 rounded-[40%] px-5 py-3 text-white font-fantasy text-lg z-20 shadow-[5px_5px_0_rgba(0,0,0,1)] max-w-[180px] text-center leading-tight">
              Who's tracking us?
              {/* Tail */}
              <div className="absolute -bottom-4 left-8 w-6 h-6 bg-obsidian border-r-4 border-b-4 border-fantasy-gold rotate-45 -z-10" />
            </div>
          </div>
        </motion.div>

        {/* Floating action buttons */}
        <div className="absolute bottom-32 right-6 flex gap-3 z-30">
          <button className="fantasy-button-primary px-5 py-3 text-base">
            Refine Dialogues
          </button>
          <button className="fantasy-button-primary px-5 py-3 text-base">
            Finalize Strip
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM TAB BAR — only on < md
      ════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t-4 border-black">
        <button
          onClick={() => setMobileTab('wizard')}
          className={`flex-1 py-3 font-comic uppercase text-sm border-r-4 border-black
            ${mobileTab === 'wizard' ? 'bg-comic-orange text-white' : 'bg-white text-black'}`}
        >
          ✏️ Wizard
        </button>
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-3 font-comic uppercase text-sm
            ${mobileTab === 'canvas' ? 'bg-comic-teal text-black' : 'bg-white text-black'}`}
        >
          🎨 Canvas
        </button>
      </div>
    </div>
  );
}
