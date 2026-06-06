/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Keyboard, Flame, HelpCircle, Trophy, Play, Radio, User, Edit2, Trash2, Database } from 'lucide-react';
import { SaveState } from '../types';
import { audio } from '../utils/audio';

interface MainMenuProps {
  onStartNewGame: (slotId: string) => void;
  onLoadSavedGame: (savedState: SaveState, slotId: string) => void;
  activeSlot: string;
  onSelectSlot: (slotId: string) => void;
}

export default function MainMenu({ onStartNewGame, onLoadSavedGame, activeSlot, onSelectSlot }: MainMenuProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.getMutedState());
  
  // Slot details state to render directly on the dashboard
  const [slotData, setSlotData] = useState<{
    [key: string]: {
      pilotName: string;
      highScore: number;
      savedGame: SaveState | null;
    }
  }>({
    alpha: { pilotName: 'COBALT', highScore: 0, savedGame: null },
    beta: { pilotName: 'SPECTRE', highScore: 0, savedGame: null },
    gamma: { pilotName: 'PHANTOM', highScore: 0, savedGame: null },
  });

  const [isEditingPilot, setIsEditingPilot] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [wipeConfirmSlot, setWipeConfirmSlot] = useState<string | null>(null);

  // Load all slot data on mount and whenever activeSlot changes
  const loadAllSlots = () => {
    // Legacy migration check to keep previous scores
    const legacyHighScore = localStorage.getItem('neon_nomad_high_score');
    if (legacyHighScore && !localStorage.getItem('neon_nomad_high_score_alpha')) {
      localStorage.setItem('neon_nomad_high_score_alpha', legacyHighScore);
    }
    const legacySave = localStorage.getItem('neon_nomad_save_state');
    if (legacySave && !localStorage.getItem('neon_nomad_save_state_alpha')) {
      localStorage.setItem('neon_nomad_save_state_alpha', legacySave);
    }

    const slots = ['alpha', 'beta', 'gamma'];
    const freshData: typeof slotData = {};

    slots.forEach((slot) => {
      // Pilot Sign
      const defaultName = slot === 'alpha' ? 'COBALT' : slot === 'beta' ? 'SPECTRE' : 'PHANTOM';
      const name = localStorage.getItem(`neon_nomad_pilot_${slot}`) || defaultName;
      if (!localStorage.getItem(`neon_nomad_pilot_${slot}`)) {
        localStorage.setItem(`neon_nomad_pilot_${slot}`, defaultName);
      }

      // High Score
      const hi = Number(localStorage.getItem(`neon_nomad_high_score_${slot}`) || 0);

      // Save State
      let save: SaveState | null = null;
      const cached = localStorage.getItem(`neon_nomad_save_state_${slot}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as SaveState;
          if (parsed && typeof parsed.score === 'number') {
            save = parsed;
          }
        } catch (e) {
          // ignore
        }
      }

      freshData[slot] = {
        pilotName: name,
        highScore: hi,
        savedGame: save,
      };
    });

    setSlotData(freshData);
  };

  useEffect(() => {
    loadAllSlots();
  }, [activeSlot]);

  // Set initial pilot name edit value when editing opens
  useEffect(() => {
    if (isEditingPilot && slotData[activeSlot]) {
      setEditNameVal(slotData[activeSlot].pilotName);
    }
  }, [isEditingPilot, activeSlot, slotData]);

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audio.playCollect();
    }
  };

  const savePilotName = () => {
    const trimmed = editNameVal.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    const finalName = trimmed || (activeSlot === 'alpha' ? 'COBALT' : activeSlot === 'beta' ? 'SPECTRE' : 'PHANTOM');
    
    localStorage.setItem(`neon_nomad_pilot_${activeSlot}`, finalName);
    setIsEditingPilot(false);
    loadAllSlots();
    audio.playSave();
  };

  const handleWipeSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the slot on wipe click
    if (wipeConfirmSlot === slotId) {
      // Execute the wipe
      localStorage.removeItem(`neon_nomad_save_state_${slotId}`);
      localStorage.removeItem(`neon_nomad_high_score_${slotId}`);
      // Clear legacy as well if wiping alpha
      if (slotId === 'alpha') {
        localStorage.removeItem('neon_nomad_save_state');
        localStorage.removeItem('neon_nomad_high_score');
      }
      setWipeConfirmSlot(null);
      loadAllSlots();
      audio.playHit();
    } else {
      setWipeConfirmSlot(slotId);
      audio.playSave();
      // Auto cancel safety after 3 seconds
      setTimeout(() => setWipeConfirmSlot(prev => prev === slotId ? null : prev), 3000);
    }
  };

  const activePilot = slotData[activeSlot]?.pilotName || 'NOMAD';
  const activeHi = slotData[activeSlot]?.highScore || 0;
  const activeSaveState = slotData[activeSlot]?.savedGame || null;

  // Maximum high score overall
  const overallHighest = Math.max(
    slotData.alpha?.highScore || 0,
    slotData.beta?.highScore || 0,
    slotData.gamma?.highScore || 0
  );

  return (
    <div 
      id="main-menu" 
      className="w-full min-h-screen bg-[#050505] text-[#00FF41] font-mono flex flex-col p-6 md:p-12 overflow-hidden relative select-none crt-scanlines"
    >
      {/* Absolute background matrix grid overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#00ff41_1px,transparent_1px),linear-gradient(to_bottom,#00ff41_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00FF41]/15 animate-pulse" />

      {/* Top Header Navigation Line */}
      <nav id="menu-nav" className="flex justify-between items-start border-b border-[#00FF41]/30 pb-6 z-10">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.3em] text-[#00FF41]/60">System Status</span>
          <span className="text-base md:text-lg font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF41] animate-ping" />
            OPERATIONAL // LNY.84
          </span>
        </div>
        <div className="flex gap-6 md:gap-12 text-right">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[#00FF41]/60">SUPREME OVERALL LOG</span>
            <div className="text-xl md:text-2xl font-black tracking-wider text-white tabular-nums">
              {overallHighest.toString().padStart(6, '0')}
            </div>
          </div>
          {/* Sound Control Toggle */}
          <button
            id="btn-sound-toggle"
            onClick={handleToggleMute}
            className="p-2 border border-[#00FF41]/30 text-[#00FF41]/80 hover:text-[#00FF41] hover:border-[#00FF41] hover:bg-[#00FF41]/10 transition-colors cursor-pointer self-center"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-[#00FF41]" />}
          </button>
        </div>
      </nav>

      {/* Central Hero Column */}
      <main className="flex-1 flex flex-col justify-center items-center relative z-10 py-12">
        <div className="text-center select-none mb-6">
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.85] font-black italic tracking-tighter uppercase mb-2 text-[#00FF41] drop-shadow-[0_0_15px_rgba(0,255,65,0.45)]">
            NEON<br/><span className="text-white">NOMAD</span>
          </h1>
          <p className="text-xs sm:text-sm tracking-[0.4em] uppercase text-[#00FF41]/80 mt-1 font-mono">
            // A MINIMALIST CANON ESCAPE VECTOR //
          </p>
        </div>

        {/* PROFILE SLOT SELECTOR GRID */}
        <div className="w-full max-w-lg mb-6">
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] mb-2 text-center font-bold">
            ⚡ SELECT GAME CORE PROFILE
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {(['alpha', 'beta', 'gamma'] as const).map((slotId) => {
              const isSelected = activeSlot === slotId;
              const slotInfo = slotData[slotId];
              const scoreText = slotInfo.highScore > 0 ? `${slotInfo.highScore} PTS` : 'ZERO LOG';
              
              return (
                <div
                  key={slotId}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectSlot(slotId);
                    if (wipeConfirmSlot) setWipeConfirmSlot(null);
                    setIsEditingPilot(false);
                    audio.playCollect();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSlot(slotId);
                      if (wipeConfirmSlot) setWipeConfirmSlot(null);
                      setIsEditingPilot(false);
                      audio.playCollect();
                    }
                  }}
                  className={`relative p-3 border text-left cursor-pointer transition-all flex flex-col justify-between select-none outline-hidden ${
                    isSelected 
                      ? 'border-[#00FF41] bg-[#00FF41]/10 shadow-[0_0_10px_rgba(0,255,65,0.25)]' 
                      : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                  }`}
                >
                  {/* Active Indicator Bracket */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-[#00FF41] shadow-[0_0_5px_#00FF41]" />
                  )}

                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                      CORE 0{slotId === 'alpha' ? '1' : slotId === 'beta' ? '2' : '3'} // {slotId.toUpperCase()}
                    </div>
                    
                    <div className={`text-xs md:text-sm font-black tracking-wide mt-1 uppercase ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                      {slotInfo.pilotName}
                    </div>

                    <div className="text-[10px] text-yellow-500/80 font-mono mt-2 tabular-nums">
                      🏆 {scoreText}
                    </div>

                    <div className="text-[8px] uppercase text-zinc-500 font-mono mt-1">
                      {slotInfo.savedGame ? `LVL ${slotInfo.savedGame.level} TIMELINE` : 'VACANT STORAGE'}
                    </div>
                  </div>

                  {/* Wipe Slot Sub-button */}
                  {(slotInfo.highScore > 0 || slotInfo.savedGame) && (
                    <button
                      onClick={(e) => handleWipeSlot(slotId, e)}
                      className={`mt-3 self-end px-1.5 py-0.5 text-[8px] font-black border uppercase transition-colors rounded ${
                        wipeConfirmSlot === slotId
                          ? 'border-red-500 text-white bg-red-600 animate-pulse'
                          : 'border-red-500/20 text-red-500/60 hover:border-red-500 hover:text-red-500'
                      }`}
                      title="Wipe slot's timeline storage"
                    >
                      {wipeConfirmSlot === slotId ? 'WIPE?' : 'WIPE'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SLOT PILOT NAME MODIFICATION DRAWER */}
        <div className="w-full max-w-sm mb-6 bg-zinc-950/60 border border-zinc-800 p-3.5 flex flex-col gap-2 relative">
          <div className="absolute top-1 right-2 text-[8px] text-[#00FF41]/30">ACTIVE CORE</div>

          {isEditingPilot ? (
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">RE-ROUTE PILOT COG-SIGN (A-Z, 0-9):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={10}
                  value={editNameVal}
                  onChange={(e) => setEditNameVal(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  className="flex-1 bg-black text-[#00FF41] border-2 border-[#00FF41] p-2 text-xs font-bold outline-none uppercase character-tracking-wide font-mono"
                  placeholder="NEW NOMAD KEY"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') savePilotName();
                    if (e.key === 'Escape') setIsEditingPilot(false);
                  }}
                />
                <button
                  onClick={savePilotName}
                  className="bg-[#00FF41] text-black px-4 font-black text-xs hover:bg-white transition-all cursor-pointer"
                >
                  SAVE
                </button>
                <button
                  onClick={() => setIsEditingPilot(false)}
                  className="border border-zinc-700 px-3 text-zinc-400 font-bold text-xs hover:text-white transition-all cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#00FF41]" />
                <span className="text-xs uppercase text-zinc-400">HOST SIGN:</span>
                <span className="font-extrabold text-white tracking-widest">{activePilot}</span>
              </div>
              
              <button
                onClick={() => setIsEditingPilot(true)}
                className="text-[9px] text-[#00FF41]/80 hover:text-white border border-[#00FF41]/30 hover:border-white px-2 py-0.5 tracking-widest transition-all cursor-pointer uppercase font-bold"
              >
                [MODIFY CALLSIGN]
              </button>
            </div>
          )}
        </div>

        {/* Operational buttons list */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          
          {/* Start New Commute */}
          <button
            id="btn-new-game"
            onClick={() => onStartNewGame(activeSlot)}
            className="w-full py-4 border-2 border-[#00FF41] bg-transparent text-[#00FF41] hover:bg-[#00FF41] hover:text-black hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all cursor-pointer text-center group font-black uppercase tracking-widest text-lg flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START REBOOT</span>
          </button>

          {/* Load Game session */}
          {activeSaveState ? (
            <button
              id="btn-resume-game"
              onClick={() => onLoadSavedGame(activeSaveState, activeSlot)}
              className="w-full py-4 px-6 border border-white bg-transparent text-white hover:bg-white hover:text-black transition-all cursor-pointer text-center font-bold uppercase tracking-wider flex items-center justify-between shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                <span>RESUME VECTOR TIMELINE</span>
              </span>
              <span className="text-[10px] opacity-80 font-bold">
                Lvl {activeSaveState.level} • {activeSaveState.score} PTS
              </span>
            </button>
          ) : (
            <div className="py-3 border border-dotted border-zinc-800 text-center text-[10px] text-zinc-600 uppercase tracking-widest bg-zinc-950/20">
              No saved session decrypted in {activeSlot.toUpperCase()} slot
            </div>
          )}

          {/* Guidelines */}
          <button
            id="btn-open-guide"
            onClick={() => setShowGuide(true)}
            className="w-full py-3 border border-[#00FF41]/40 text-[#00FF41]/80 hover:text-white hover:border-white transition-all text-xs uppercase tracking-widest cursor-pointer font-bold flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            <span>HOW TO ESCAPE</span>
          </button>

        </div>
      </main>

      {/* Cyber Footer Info Section */}
      <footer className="flex flex-col md:flex-row justify-between items-center md:items-end border-t border-[#00FF41]/30 pt-6 z-10 gap-6">
        {/* Controls guide */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 select-none">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center border border-[#00FF41] text-[10px] font-bold">▲/▼</span>
            <span className="text-[10px] uppercase opacity-70">Thrust</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center border border-[#00FF41] text-[10px] font-bold">S</span>
            <span className="text-[10px] uppercase opacity-70">Save Time</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center border border-[#00FF41] text-[10px] font-bold">◄/►</span>
            <span className="text-[10px] uppercase opacity-70">Steer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center border border-[#00FF41] text-[10px] font-bold">P</span>
            <span className="text-[10px] uppercase opacity-70">Pause</span>
          </div>
        </div>

        {/* Warning & copyright info */}
        <div className="text-center md:text-right">
          <p className="text-[9px] leading-tight opacity-50 uppercase max-w-[280px]">
            WARNING: High impact physical vector drift simulation loaded. Keep ship boundaries clean at all costs.
          </p>
          <p className="mt-2 font-bold text-white text-[11px] tracking-widest">© 1984 NEON NOMAD SYNDICATE</p>
        </div>
      </footer>

      {/* Guide Modals layout in Cyber theme */}
      {showGuide && (
        <div id="guide-modal" className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in crt-scanlines">
          <div className="w-full max-w-md bg-[#050505] border-2 border-[#00FF41] p-6 shadow-[0_0_30px_rgba(0,255,65,0.3)] relative">
            
            {/* Corner retro cyber brackets deco */}
            <div className="absolute top-2 left-2 text-[#00FF41]/50 text-xs">//</div>
            <div className="absolute top-2 right-2 text-[#00FF41]/50 text-xs">\\</div>

            <h2 className="text-xl font-bold tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#00FF41]/30 pb-3">
              <Keyboard className="w-5 h-5 text-[#00FF41]" /> DECIPHERED OPERATIONS
            </h2>

            <div className="space-y-4 text-xs font-mono text-[#00FF41]/80">
              <p className="leading-relaxed">
                You are a <strong className="text-white">Nomad fighter</strong> drifting through chaotic radioactive vector grids. Dodge obstacles, extract energy cores, and maintain vital capacitor fields.
              </p>

              {/* Items grid */}
              <div className="border border-[#00FF41]/30 bg-black/60 p-3 rounded-none flex flex-col gap-2">
                <span className="text-[10px] text-[#00FF41]/50 tracking-widest uppercase">// VECTOR ENTITIES</span>
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_#facc15]" />
                  <span><strong className="text-white">Neon Cores:</strong> +10 Pts, replenishes shields. Highly magnetic.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rotate-45 border-2 border-red-500 bg-red-500/10 shadow-[0_0_8px_#f43f5e]" />
                  <span><strong className="text-white">Rogue Obstacles:</strong> Depletes shield matrices on encounter. Bounces off grid.</span>
                </div>
              </div>

              {/* Real time preservation explanation */}
              <div className="p-3 bg-white/5 border border-white/10 text-slate-300">
                ⚡ <strong className="text-white">TIMELINE BACKUP (SAVE):</strong> Pressing the <strong className="text-[#00FF41]">S / SAVE</strong> triggers immediate preservation of coordinates, score, sector parameters and shield capacities directly to your local registry. Return whenever needed!
              </div>
            </div>

            <button
              id="btn-close-guide"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full py-3 border-2 border-[#00FF41] bg-[#00FF41] text-black hover:bg-black hover:text-[#00FF41] font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer"
            >
              ENGAGE SYSTEMS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
