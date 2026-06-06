/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Timer, Volume2, VolumeX, Pause, RefreshCw, LogOut, Disc, LayoutGrid, Smartphone, ArrowRight } from 'lucide-react';
import { GameStatus, SaveState } from './types';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import Joystick from './components/Joystick';
import { audio } from './utils/audio';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('MENU');
  
  // HUD variables
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  
  // Storage profile slot: alpha, beta, gamma
  const [activeSlot, setActiveSlot] = useState<string>('alpha');
  
  // Game session states
  const [savedStateToLoad, setSavedStateToLoad] = useState<SaveState | null>(null);
  const [saveTrigger, setSaveTrigger] = useState(false);
  const [lastSavedSummary, setLastSavedSummary] = useState<string | null>(null);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  
  // Controller setup
  const [isMuted, setIsMuted] = useState(audio.getMutedState());
  const [forceShowJoystick, setForceShowJoystick] = useState(false);
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Initialize high score from localStorage for the active slot
  useEffect(() => {
    // Legacy migration check
    const legacyHighScore = localStorage.getItem('neon_nomad_high_score');
    if (legacyHighScore && !localStorage.getItem(`neon_nomad_high_score_${activeSlot}`)) {
      localStorage.setItem(`neon_nomad_high_score_${activeSlot}`, legacyHighScore);
    }
    const cachedHighScore = localStorage.getItem(`neon_nomad_high_score_${activeSlot}`);
    if (cachedHighScore) {
      setHighScore(Number(cachedHighScore));
    } else {
      setHighScore(0);
    }
  }, [activeSlot, status]);

  // Timer logic during gameplay
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (status === 'PLAYING') {
      timerInterval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [status]);

  // Handle Pause shortcut key 'P'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (status === 'PLAYING') {
          setStatus('PAUSED');
        } else if (status === 'PAUSED') {
          setStatus('PLAYING');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Start new game freshly
  const handleStartNewGame = (slotId: string) => {
    setActiveSlot(slotId);
    setScore(0);
    setHealth(100);
    setLevel(1);
    setTimeElapsed(0);
    setSavedStateToLoad(null);
    setStatus('PLAYING');
    
    // Play sound on click to wake audio standard
    if (!isMuted) {
      audio.playCollect();
    }
  };

  // Load a previously saved game state
  const handleLoadSavedGame = (state: SaveState, slotId: string) => {
    setActiveSlot(slotId);
    setSavedStateToLoad(state);
    setStatus('PLAYING');
  };

  const handleGameFinished = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem(`neon_nomad_high_score_${activeSlot}`, String(finalScore));

      if (activeSlot === 'alpha') {
        localStorage.setItem('neon_nomad_high_score', String(finalScore));
      }
    }
    setStatus('GAME_OVER');
  };

  const handleSaveSuccess = (state: SaveState) => {
    setScore(state.score);
    setLevel(state.level);
    
    // Update menu cached game state implicitly
    setLastSavedSummary(state.timestamp);
    setShowSaveAlert(true);
    setTimeout(() => setShowSaveAlert(false), 2200);
  };

  const handleToggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-[#00FF41] flex flex-col overflow-hidden relative font-mono select-none crt-scanlines">
      
      {/* Absolute high-voltage wire deco */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00FF41] z-50 shadow-[0_0_10px_#00FF41]" />

      {/* Main Landing Screen */}
      <AnimatePresence mode="wait">
        {status === 'MENU' && (
          <motion.div
            key="main-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 animate-fade-in"
          >
            <MainMenu
              onStartNewGame={handleStartNewGame}
              onLoadSavedGame={handleLoadSavedGame}
              activeSlot={activeSlot}
              onSelectSlot={setActiveSlot}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Video Screen (Gameplay & overlays) */}
      <div className="w-full h-full flex flex-col relative z-10">
        
        {/* HUD Overlay Bar in High Contrast terminal mode */}
        {status !== 'MENU' && (
          <div id="hud-top-bar" className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-linear-to-b from-[#050505]/95 via-[#050505]/60 to-transparent flex flex-wrap items-center justify-between gap-4 z-30 pointer-events-none">
            
            {/* Status indicators */}
            <div className="flex items-center gap-4 pointer-events-auto bg-[#050505] border-2 border-[#00FF41] px-4 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,255,65,0.15)]">
              <div className="flex items-center gap-2 text-sm text-white">
                <Target className="w-4 h-4 text-[#00FF41] animate-pulse" />
                <span className="text-[#00FF41]/60 font-medium">SCORE:</span>
                <span className="font-extrabold tracking-wider tabular-nums">{score.toString().padStart(5, '0')}</span>
              </div>
              <div className="h-4 w-[2px] bg-[#00FF41]/30" />
              <div className="flex items-center gap-2 text-sm text-[#00FF41]">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[#00FF41]/60 font-medium">GRID:</span>
                <span className="font-extrabold">{level}</span>
              </div>
              <div className="h-4 w-[2px] bg-[#00FF41]/30" />
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <Timer className="w-4 h-4" />
                <span className="font-bold tracking-widest tabular-nums">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            {/* Health / Shield Bar widgets */}
            <div className="flex items-center gap-3 pointer-events-auto bg-[#050505] border-2 border-[#00FF41] px-4 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,255,65,0.15)] w-full max-w-[250px] md:max-w-[300px]">
              <Shield className="w-4.5 h-4.5 text-[#00FF41] shrink-0" />
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between text-[10px] text-white mb-1.5 font-bold tracking-wide">
                  <span>SHIELD CAPACITOR</span>
                  <span className={health < 30 ? "text-red-500 animate-pulse font-extrabold" : "text-[#00FF41]"}>
                    {health}%
                  </span>
                </div>
                <div className="w-full h-3 bg-black p-[2px] border border-[#00FF41]/50">
                  <div
                    className="h-full bg-[#00FF41] transition-all duration-300"
                    style={{
                      width: `${health}%`,
                      backgroundColor: health < 30 ? '#ff3b30' : '#00FF41',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Control buttons widget */}
            <div className="flex items-center gap-2 pointer-events-auto">
              
              {/* Force Toggle virtual joystick */}
              <button
                id="btn-joystick-override"
                onClick={() => setForceShowJoystick(!forceShowJoystick)}
                className={`p-2.5 border-2 transition-all cursor-pointer bg-[#050505] hover:bg-[#00FF41] hover:text-black ${
                  forceShowJoystick 
                    ? 'border-[#00FF41] text-black bg-[#00FF41]' 
                    : 'border-[#00FF41]/60 text-[#00FF41]'
                }`}
                title="Toggle Virtual Joystick"
              >
                <Smartphone className="w-4.5 h-4.5" />
              </button>

              {/* Sound toggle button */}
              <button
                id="btn-hud-sound"
                onClick={handleToggleSound}
                className="p-2.5 bg-[#050505] border-2 border-[#00FF41]/60 text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition-all cursor-pointer"
                title={isMuted ? "Unmute sounds" : "Mute sounds"}
              >
                {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-500" /> : <Volume2 className="w-4.5 h-4.5" />}
              </button>

              {/* Pause Trigger */}
              <button
                id="btn-pause-trigger"
                onClick={() => setStatus('PAUSED')}
                className="p-2.5 bg-[#050505] border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black active:scale-95 transition-all cursor-pointer font-bold"
              >
                <Pause className="w-4.5 h-4.5" />
              </button>
            </div>

          </div>
        )}

        {/* Canvas Render Panel Container */}
        {status !== 'MENU' && (
          <div className="flex-1 w-full h-full relative z-10">
            <GameCanvas
              status={status}
              onGameFinished={handleGameFinished}
              onScoreChanged={setScore}
              onHealthChanged={setHealth}
              onLevelChanged={setLevel}
              savedStateToLoad={savedStateToLoad}
              onClearLoadState={() => setSavedStateToLoad(null)}
              saveTrigger={saveTrigger}
              onSaveSuccess={handleSaveSuccess}
              joystickVector={joystickVector}
              activeSlot={activeSlot}
            />
          </div>
        )}

        {/* Saved Pop-Up Alert */}
        <AnimatePresence>
          {showSaveAlert && (
            <motion.div
              initial={{ top: -42, opacity: 0 }}
              animate={{ top: 100, opacity: 1 }}
              exit={{ top: -42, opacity: 0 }}
              className="absolute left-1/2 -translate-x-1/2 px-6 py-3 bg-[#050505] border-2 border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.4)] z-50 flex items-center gap-3"
            >
              <Disc className="w-4 h-4 text-[#00FF41] animate-spin" />
              <span className="font-mono text-xs text-white font-extrabold tracking-wider">
                COGNITIVE REGISTRY SECURED // OK
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* On-screen virtual joystick overlay */}
        {status === 'PLAYING' && (forceShowJoystick || (typeof window !== 'undefined' && window.innerWidth <= 1024)) && (
          <Joystick
            onChange={setJoystickVector}
            onSavePress={() => setSaveTrigger(!saveTrigger)}
          />
        )}

        {/* PAUSE MENU OVERLAY DISPLAY */}
        <AnimatePresence>
          {status === 'PAUSED' && (
            <motion.div
              id="pause-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 z-40 crt-scanlines"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm bg-[#050505] border-2 border-[#00FF41] p-8 shadow-[0_0_30px_rgba(0,255,65,0.3)] flex flex-col items-center"
              >
                <div className="w-12 h-12 border-2 border-[#00FF41] flex items-center justify-center text-[#00FF41] mb-4">
                  <Pause className="w-5 h-5 fill-current" />
                </div>
                
                <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 text-center">
                  SUSPENDED
                </h2>
                <p className="font-mono text-[10px] text-[#00FF41]/70 tracking-widest mb-8 text-center uppercase">
                  ACTIVE MATRIX CAPTURE // SECTOR: {level}
                </p>

                <div className="w-full flex flex-col gap-3 font-mono">
                  {/* Resume Game */}
                  <button
                    id="btn-resume-from-pause"
                    onClick={() => setStatus('PLAYING')}
                    className="w-full py-3.5 border-2 border-[#00FF41] bg-[#00FF41] text-black hover:bg-black hover:text-[#00FF41] font-black tracking-widest uppercase transition-all duration-150 cursor-pointer text-center"
                  >
                    RESUME VECTOR
                  </button>

                  {/* Manual Save Game */}
                  <button
                    id="btn-save-from-pause"
                    onClick={() => {
                      setSaveTrigger(!saveTrigger);
                    }}
                    className="w-full py-3 border border-white text-white hover:bg-white hover:text-black font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer text-center"
                  >
                    SAVE TIMELINE
                  </button>

                  {/* Return to Main Menu */}
                  <button
                    id="btn-abort-to-menu"
                    onClick={() => {
                      setStatus('MENU');
                      setJoystickVector({ x: 0, y: 0 });
                    }}
                    className="w-full py-2.5 border border-red-500/40 text-red-500 hover:bg-red-500 hover:text-black font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer text-center"
                  >
                    ABORT VESSEL
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME OVER MENU OVERLAY */}
        <AnimatePresence>
          {status === 'GAME_OVER' && (
            <motion.div
              id="game-over-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-40 crt-scanlines"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm bg-[#050505] border-2 border-red-500 p-8 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex flex-col items-center"
              >
                <div className="w-14 h-14 border-2 border-red-500 flex items-center justify-center text-red-500 mb-5 text-xl font-bold">
                  ☠
                </div>

                <h2 className="text-[44px] tracking-tighter leading-[0.8] font-black italic text-white uppercase mb-2 text-center drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  CONDUIT<br/><span className="text-red-500">SEVERED</span>
                </h2>
                <p className="font-mono text-[10px] text-red-500/60 tracking-widest uppercase mb-6 text-center">
                  INTEGRITY AT ZERO // FLIGHT TERMINATED
                </p>

                {/* Score Summary Box */}
                <div className="w-full grid grid-cols-2 gap-3 p-4 bg-black border border-red-500/30 font-mono text-center mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">RECORDED LOGS</span>
                    <span className="text-xl font-bold text-white tracking-wider tabular-nums">
                      {score.toString().padStart(5, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-red-500/20">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">SUPREME INDEX</span>
                    <span className="text-xl font-bold text-yellow-400 tracking-wider tabular-nums">
                      {highScore.toString().padStart(5, '0')}
                    </span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-3 font-mono">
                  {/* Restart */}
                  <button
                    id="btn-game-over-retry"
                    onClick={handleStartNewGame}
                    className="w-full py-3.5 border-2 border-red-500 bg-red-500 text-black hover:bg-black hover:text-red-500 font-black tracking-widest uppercase transition-all duration-150 cursor-pointer text-center"
                  >
                    FORCE REBOOT
                  </button>

                  {/* Return Menu */}
                  <button
                    id="btn-game-over-exit"
                    onClick={() => {
                      setStatus('MENU');
                      setJoystickVector({ x: 0, y: 0 });
                    }}
                    className="w-full py-2.5 border border-white/40 text-white/80 hover:bg-white hover:text-black font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer text-center"
                  >
                    DEPART DOCK
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
