/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, Player, Collectible, Obstacle, Particle, SaveState } from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  status: GameStatus;
  onGameFinished: (score: number) => void;
  onScoreChanged: (score: number) => void;
  onHealthChanged: (health: number) => void;
  onLevelChanged: (level: number) => void;
  savedStateToLoad: SaveState | null;
  onClearLoadState: () => void;
  saveTrigger: boolean;
  onSaveSuccess: (state: SaveState) => void;
  joystickVector: { x: number; y: number };
  activeSlot: string;
}

export default function GameCanvas({
  status,
  onGameFinished,
  onScoreChanged,
  onHealthChanged,
  onLevelChanged,
  savedStateToLoad,
  onClearLoadState,
  saveTrigger,
  onSaveSuccess,
  joystickVector,
  activeSlot,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // World space dimensions
  const WORLD_WIDTH = 2400;
  const WORLD_HEIGHT = 2400;

  // Game references
  const playerRef = useRef<Player>({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 12,
    angle: 0,
    health: 100,
    maxHealth: 100,
  });

  const scoreRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Camera tracking
  const cameraRef = useRef({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 });

  // Player state flags
  const invulnTimerRef = useRef<number>(0); // Frames invulnerable
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastSaveTimeRef = useRef<number>(0);
  const flashTextRef = useRef<{ text: string; timer: number; color: string } | null>(null);

  // Sound hum trigger throttle
  const engineSoundThrottle = useRef<number>(0);

  // Track trigger state for joystick-based saves
  const prevSaveTrigger = useRef(saveTrigger);

  // Setup Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key] = true;

      // Handle 'S' key for save state
      if ((e.key === 's' || e.key === 'S') && status === 'PLAYING') {
        triggerSaveState();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  // Handle Save State Loading
  useEffect(() => {
    if (savedStateToLoad && status === 'PLAYING') {
      const p = savedStateToLoad.player;
      playerRef.current = {
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        radius: 12,
        angle: p.angle,
        health: p.health,
        maxHealth: 100,
      };

      scoreRef.current = savedStateToLoad.score;
      levelRef.current = savedStateToLoad.level;
      
      onScoreChanged(savedStateToLoad.score);
      onHealthChanged(savedStateToLoad.player.health);
      onLevelChanged(savedStateToLoad.level);

      // Recreate or load collectibles / obstacles
      collectiblesRef.current = savedStateToLoad.collectibles.map((c, i) => ({
        id: `c_${Date.now()}_${i}`,
        x: c.x,
        y: c.y,
        radius: c.radius,
        pulseSpeed: 0.05 + Math.random() * 0.02,
        pulseTimer: Math.random() * Math.PI,
        color: '#facc15',
        value: 10,
      }));

      obstaclesRef.current = savedStateToLoad.obstacles.map((o, i) => ({
        id: `o_${Date.now()}_${i}`,
        x: o.x,
        y: o.y,
        vx: o.vx,
        vy: o.vy,
        radius: o.radius,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.06,
        color: o.type === 'comet' ? '#ff007f' : (o.type === 'sentinel' ? '#f43f5e' : '#a855f7'),
        type: o.type,
      }));

      particlesRef.current = [];
      cameraRef.current = { x: p.x, y: p.y };

      triggerFlashText('SESSION DATA LOADED', '#22d3ee');
      onClearLoadState();
    }
  }, [savedStateToLoad, status]);

  // Handle outside Save trigger (from Mobile Joystick button)
  useEffect(() => {
    if (saveTrigger !== prevSaveTrigger.current) {
      prevSaveTrigger.current = saveTrigger;
      if (status === 'PLAYING' && saveTrigger) {
        triggerSaveState();
      }
    }
  }, [saveTrigger, status]);

  // Save State Action
  const triggerSaveState = () => {
    const now = Date.now();
    // Throttle saves to once every 2 seconds
    if (now - lastSaveTimeRef.current < 2000) return;
    lastSaveTimeRef.current = now;

    const formattedDate = new Date().toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const state: SaveState = {
      player: {
        x: playerRef.current.x,
        y: playerRef.current.y,
        vx: playerRef.current.vx,
        vy: playerRef.current.vy,
        angle: playerRef.current.angle,
        health: playerRef.current.health,
      },
      score: scoreRef.current,
      highScore: Number(localStorage.getItem('neon_nomad_high_score_' + activeSlot) || 0),
      level: levelRef.current,
      obstacles: obstaclesRef.current.map(o => ({
        x: o.x,
        y: o.y,
        vx: o.vx,
        vy: o.vy,
        radius: o.radius,
        type: o.type,
      })),
      collectibles: collectiblesRef.current.map(c => ({
        x: c.x,
        y: c.y,
        radius: c.radius,
      })),
      timestamp: `Sauvegardé, ${formattedDate}`,
    };

    localStorage.setItem('neon_nomad_save_state_' + activeSlot, JSON.stringify(state));
    
    // Sync to legacy for alpha slot
    if (activeSlot === 'alpha') {
      localStorage.setItem('neon_nomad_save_state', JSON.stringify(state));
    }

    onSaveSuccess(state);
    audio.playSave();
    triggerFlashText('TIMELINE ENCRYPTED & SAVED', '#d946ef');
  };

  const triggerFlashText = (text: string, color: string) => {
    flashTextRef.current = {
      text,
      timer: 120, // 2 seconds at 60fps
      color,
    };
  };

  // Helper to spawn explosion particles
  const spawnExplosion = (x: number, y: number, color: string, count = 15, baseVelocity = 4) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 0.7) * baseVelocity;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 30,
      });
    }
  };

  // Core Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial Entity Population (if not loading one)
    if (!savedStateToLoad && collectiblesRef.current.length === 0) {
      spawnInitialCores();
    }

    function spawnInitialCores() {
      collectiblesRef.current = [];
      for (let i = 0; i < 15; i++) {
        collectiblesRef.current.push({
          id: `c_${i}_${Date.now()}`,
          x: Math.random() * (WORLD_WIDTH - 200) + 100,
          y: Math.random() * (WORLD_HEIGHT - 200) + 100,
          radius: 6,
          pulseSpeed: 0.04 + Math.random() * 0.03,
          pulseTimer: Math.random() * Math.PI * 2,
          color: '#eab308', // pure neon yellow
          value: 10,
        });
      }
    }

    // Core Frame Process
    const update = () => {
      if (status !== 'PLAYING') {
        render();
        animFrame = requestAnimationFrame(update);
        return;
      }

      const player = playerRef.current;

      // 1. Controls processing (Acceleration drift logic)
      let ax = 0;
      let ay = 0;
      const keyAcc = 0.28;

      // PC Keyboard movement (Arrow Keys)
      if (keysPressed.current['ArrowUp']) ay -= keyAcc;
      if (keysPressed.current['ArrowDown']) ay += keyAcc;
      if (keysPressed.current['ArrowLeft']) ax -= keyAcc;
      if (keysPressed.current['ArrowRight']) ax += keyAcc;

      // Apply Joystick overrides (if mobile or screen dragged joystick)
      if (Math.abs(joystickVector.x) > 0.01 || Math.abs(joystickVector.y) > 0.01) {
        ax = joystickVector.x * keyAcc * 1.2;
        ay = joystickVector.y * keyAcc * 1.2;
      }

      // Physics Integration
      player.vx += ax;
      player.vy += ay;

      // Limit max speed
      const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      const MAX_SPEED = 7.5;
      if (speed > MAX_SPEED) {
        player.vx = (player.vx / speed) * MAX_SPEED;
        player.vy = (player.vy / speed) * MAX_SPEED;
      }

      // Drift & Friction
      player.vx *= 0.965;
      player.vy *= 0.965;

      // Update positions
      player.x += player.vx;
      player.y += player.vy;

      // Update looking angle based on velocity vector
      const activeSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (activeSpeed > 0.25) {
        player.angle = Math.atan2(player.vy, player.vx);
        
        // Play engine hum periodically with volume reflecting current propulsion
        engineSoundThrottle.current++;
        if (engineSoundThrottle.current % 7 === 0) {
          audio.playEngineHum(player.vx, player.vy);
        }
      }

      // Bound collisions with elastic bumper bounce
      const margin = player.radius + 15;
      if (player.x < margin) { player.x = margin; player.vx *= -0.4; }
      if (player.x > WORLD_WIDTH - margin) { player.x = WORLD_WIDTH - margin; player.vx *= -0.4; }
      if (player.y < margin) { player.y = margin; player.vy *= -0.4; }
      if (player.y > WORLD_HEIGHT - margin) { player.y = WORLD_HEIGHT - margin; player.vy *= -0.4; }

      // 2. Invulnerability frames processing
      if (invulnTimerRef.current > 0) {
        invulnTimerRef.current--;
      }

      // 3. Camera Tracking (Centering player smoothly with Lerp)
      cameraRef.current.x += (player.x - cameraRef.current.x) * 0.08;
      cameraRef.current.y += (player.y - cameraRef.current.y) * 0.08;

      // Clamp camera boundary edges to respect world aspect
      const halfW = canvas.width / 2;
      const halfH = canvas.height / 2;
      cameraRef.current.x = Math.max(halfW, Math.min(WORLD_WIDTH - halfW, cameraRef.current.x));
      cameraRef.current.y = Math.max(halfH, Math.min(WORLD_HEIGHT - halfH, cameraRef.current.y));

      // 4. Trail Particle spawning
      if (activeSpeed > 1) {
        const opposingAngle = player.angle + Math.PI + (Math.random() - 0.5) * 0.4;
        const trailSpeed = 1.5;
        // Cyan rocket sparks
        particlesRef.current.push({
          x: player.x - Math.cos(player.angle) * 10,
          y: player.y - Math.sin(player.angle) * 10,
          vx: Math.cos(opposingAngle) * trailSpeed + player.vx * 0.2,
          vy: Math.sin(opposingAngle) * trailSpeed + player.vy * 0.2,
          radius: 1 + Math.random() * 1.5,
          color: 'rgba(34, 211, 238, 0.45)', // Cyan tint
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }

      // 5. Update Collectible Items (Cores)
      collectiblesRef.current.forEach(c => {
        c.pulseTimer += c.pulseSpeed;
        
        // Collide check or magnetic attract
        const dx = c.x - player.x;
        const dy = c.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Core Attraction (Magnetic pull when close!)
        if (dist < 120) {
          const pull = (120 - dist) / 120 * 1.2;
          c.x -= (dx / dist) * pull;
          c.y -= (dy / dist) * pull;
        }
      });

      // Collision Check: Player gather Cores
      collectiblesRef.current = collectiblesRef.current.filter(c => {
        const dx = c.x - player.x;
        const dy = c.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + c.radius) {
          // GATHERED!
          scoreRef.current += 10;
          onScoreChanged(scoreRef.current);
          
          player.health = Math.min(player.health + 4, player.maxHealth);
          onHealthChanged(Math.round(player.health));

          audio.playCollect();
          
          // Spawn sparkle particles
          spawnExplosion(c.x, c.y, '#facc15', 10, 3);

          // Leveling thresholds check (+100 increments)
          const currentTresholdLevel = Math.floor(scoreRef.current / 100) + 1;
          if (currentTresholdLevel > levelRef.current) {
            levelRef.current = currentTresholdLevel;
            onLevelChanged(levelRef.current);
            audio.playLevelUp();
            triggerFlashText(`SECTOR SECURED: LEVEL ${levelRef.current}`, '#cbd5e1');
            // Spawn some fancy sparks around the Nomad
            spawnExplosion(player.x, player.y, '#38bdf8', 30, 6);
          }

          return false; // delete gathered item
        }
        return true;
      });

      // Refill Cores if density drops
      while (collectiblesRef.current.length < 15) {
        collectiblesRef.current.push({
          id: `c_refill_${Date.now()}_${Math.random()}`,
          x: Math.random() * (WORLD_WIDTH - 200) + 100,
          y: Math.random() * (WORLD_HEIGHT - 200) + 100,
          radius: 6,
          pulseSpeed: 0.04 + Math.random() * 0.03,
          pulseTimer: Math.random() * Math.PI * 2,
          color: '#eab308',
          value: 10,
        });
      }

      // 6. Spawn and track Obstacles (Asteroids and Sentinels)
      const obstacleSpawnLimit = 5 + levelRef.current * 2;
      while (obstaclesRef.current.length < obstacleSpawnLimit) {
        // Spawn slightly outside camera view box but safely inside coordinate space
        const left = cameraRef.current.x - canvas.width;
        const right = cameraRef.current.x + canvas.width;
        const top = cameraRef.current.y - canvas.height;
        const bottom = cameraRef.current.y + canvas.height;

        let ox = Math.random() * WORLD_WIDTH;
        let oy = Math.random() * WORLD_HEIGHT;

        // Ensure we don't spawn it directly on top of screen or player
        while (ox > left && ox < right && oy > top && oy < bottom) {
          ox = Math.random() * WORLD_WIDTH;
          oy = Math.random() * WORLD_HEIGHT;
        }

        const angle = Math.random() * Math.PI * 2;
        const obstacleBaseSpeed = 1.2 + levelRef.current * 0.35;
        const obsType = Math.random() > 0.4 ? 'asteroid' : (Math.random() > 0.5 ? 'sentinel' : 'comet');

        obstaclesRef.current.push({
          id: `o_${Date.now()}_${Math.random()}`,
          x: ox,
          y: oy,
          vx: Math.cos(angle) * obstacleBaseSpeed * (obsType === 'comet' ? 1.6 : 1),
          vy: Math.sin(angle) * obstacleBaseSpeed * (obsType === 'comet' ? 1.6 : 1),
          radius: obsType === 'asteroid' ? (15 + Math.random() * 18) : (obsType === 'comet' ? 10 : 12),
          angle: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.04,
          color: obsType === 'comet' ? '#f43f5e' : (obsType === 'sentinel' ? '#fda4af' : '#d946ef'),
          type: obsType,
        });
      }

      // Update Obstacle paths
      obstaclesRef.current.forEach(o => {
        o.x += o.vx;
        o.y += o.vy;
        o.angle += o.rotationSpeed;

        // Bounce obstacles back robustly off world grid edges
        const rMargin = o.radius;
        if (o.x < rMargin || o.x > WORLD_WIDTH - rMargin) o.vx *= -1;
        if (o.y < rMargin || o.y > WORLD_HEIGHT - rMargin) o.vy *= -1;

        // Comet specific: leaves glowing fire trails
        if (o.type === 'comet' && Math.random() > 0.4) {
          particlesRef.current.push({
            x: o.x,
            y: o.y,
            vx: -o.vx * 0.2 + (Math.random() - 0.5) * 0.5,
            vy: -o.vy * 0.2 + (Math.random() - 0.5) * 0.5,
            radius: 1 + Math.random() * 2,
            color: 'rgba(244, 63, 94, 0.4)', // Rose trail
            alpha: 0.8,
            life: 0,
            maxLife: 25,
          });
        }
      });

      // Player Collision Checks with Obstacles
      obstaclesRef.current.forEach(o => {
        const dx = o.x - player.x;
        const dy = o.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + o.radius) {
          // Collision impact!
          if (invulnTimerRef.current === 0) {
            // Apply damage
            const forceDamage = Math.round(o.type === 'asteroid' ? 24 : 16);
            player.health = Math.max(0, player.health - forceDamage);
            onHealthChanged(Math.round(player.health));
            audio.playHit();

            // Screen/Camera impact rattle offset sparks
            spawnExplosion(player.x, player.y, '#ef4444', 18, 5);

            // Backoff force bounce
            const angleBump = Math.atan2(player.y - o.y, player.x - o.x);
            player.vx += Math.cos(angleBump) * 6;
            player.vy += Math.sin(angleBump) * 6;

            // Trigger invulnerability frame buffers (1.2 seconds)
            invulnTimerRef.current = 75;

            // Health check
            if (player.health === 0) {
              // Game Over
              audio.playGameOver();
              spawnExplosion(player.x, player.y, '#06b6d4', 35, 7);
              onGameFinished(scoreRef.current);
            }
          }
        }
      });

      // 7. Process particles decay
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
      });

      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      // Decrement flash text timer state
      if (flashTextRef.current) {
        flashTextRef.current.timer--;
        if (flashTextRef.current.timer <= 0) {
          flashTextRef.current = null;
        }
      }

      render();
      animFrame = requestAnimationFrame(update);
    };

    // Rendering pipeline (Absolute Screen coordinates based on camera offsets)
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Space back plate fill
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera coordinates offset
      const camX = cameraRef.current.x - canvas.width / 2;
      const camY = cameraRef.current.y - canvas.height / 2;

      // Draw starry parallax dust layer
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      for (let i = 0; i < 60; i++) {
        // Calculate stars aligned, with simple modulo wrap for seamless camera parallax effect
        const starX = ((i * 1234.567) % (canvas.width + 100)) - (camX * 0.15) % (canvas.width + 100);
        const starY = ((i * 7654.321) % (canvas.height + 100)) - (camY * 0.15) % (canvas.height + 100);
        ctx.fillRect(starX < 0 ? starX + canvas.width : starX, starY < 0 ? starY + canvas.height : starY, 1.5, 1.5);
      }
      ctx.restore();

      // Start world space drawings translates
      ctx.save();
      ctx.translate(-camX, -camY);

      // Draw Grid Coordinate Lines
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      
      // Vertical grid coordinates
      const startGridX = Math.floor(camX / gridSize) * gridSize;
      const endGridX = startGridX + canvas.width + gridSize * 2;
      for (let x = startGridX; x <= endGridX; x += gridSize) {
        if (x >= 0 && x <= WORLD_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(x, Math.max(0, camY));
          ctx.lineTo(x, Math.min(WORLD_HEIGHT, camY + canvas.height + gridSize));
          ctx.stroke();
        }
      }

      // Horizontal grid coordinates
      const startGridY = Math.floor(camY / gridSize) * gridSize;
      const endGridY = startGridY + canvas.height + gridSize * 2;
      for (let y = startGridY; y <= endGridY; y += gridSize) {
        if (y >= 0 && y <= WORLD_HEIGHT) {
          ctx.beginPath();
          ctx.moveTo(Math.max(0, camX), y);
          ctx.lineTo(Math.min(WORLD_WIDTH, camX + canvas.width + gridSize), y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw World Borders
      ctx.save();
      ctx.strokeStyle = '#f43f5e'; // Crimson Pink border line
      ctx.lineWidth = 4;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.restore();

      // Draw Cores (Yellow glowing elements)
      collectiblesRef.current.forEach(c => {
        // Only draw on screen items to protect rendering cycle
        if (c.x > camX - 30 && c.x < camX + canvas.width + 30 && c.y > camY - 30 && c.y < camY + canvas.height + 30) {
          ctx.save();
          const rOffset = Math.sin(c.pulseTimer) * 1.5;
          const currentR = c.radius + rOffset;

          // Glowing shadow
          ctx.shadowBlur = 12 + rOffset * 2;
          ctx.shadowColor = c.color;

          // Outer glowing loop
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c.x, c.y, currentR + 3, 0, Math.PI * 2);
          ctx.stroke();

          // Core Sphere fill
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(c.x, c.y, currentR, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Obstacles (Asteroids or Sentinels)
      obstaclesRef.current.forEach(o => {
        if (o.x > camX - 40 && o.x < camX + canvas.width + 40 && o.y > camY - 40 && o.y < camY + canvas.height + 40) {
          ctx.save();
          ctx.shadowBlur = o.type === 'comet' ? 14 : 8;
          ctx.shadowColor = o.color;
          ctx.strokeStyle = o.color;
          ctx.lineWidth = 2;

          if (o.type === 'asteroid') {
            // Jagged asteroid polygons
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
              const angle = o.angle + (i * Math.PI * 2) / points;
              // Make radius slightly uneven to look rock-like
              const multiplier = 0.82 + Math.sin(i * 3 + o.angle) * 0.12;
              const r = o.radius * multiplier;
              const px = o.x + Math.cos(angle) * r;
              const py = o.y + Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(120, 113, 108, 0.15)'; // Stone tint
            ctx.fill();
            ctx.stroke();
          } else if (o.type === 'sentinel') {
            // Spherical grid layout for sentinels
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
            ctx.fill();
            ctx.stroke();

            // Inner spikes orb
            ctx.strokeStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.radius * 0.5, 0, Math.PI * 2);
            ctx.stroke();
          } else if (o.type === 'comet') {
            // Dynamic spiky heading arrow shape
            ctx.beginPath();
            const backX = o.x - Math.cos(o.angle) * o.radius;
            const backY = o.y - Math.sin(o.angle) * o.radius;
            const wingAngle1 = o.angle + Math.PI * 0.8;
            const wingAngle2 = o.angle - Math.PI * 0.8;

            ctx.moveTo(o.x + Math.cos(o.angle) * o.radius * 1.5, o.y + Math.sin(o.angle) * o.radius * 1.5);
            ctx.lineTo(o.x + Math.cos(wingAngle1) * o.radius, o.y + Math.sin(wingAngle1) * o.radius);
            ctx.lineTo(backX, backY);
            ctx.lineTo(o.x + Math.cos(wingAngle2) * o.radius, o.y + Math.sin(wingAngle2) * o.radius);
            ctx.closePath();
            ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }
      });

      // Draw active particles list
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player (The Glowing Nomad)
      const player = playerRef.current;
      const isInvuln = invulnTimerRef.current > 0;
      
      // Blinking animation if invulnerable
      if (!isInvuln || Math.floor(invulnTimerRef.current / 4) % 2 === 0) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#06b6d4'; // Cyan primary accent
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;

        // Render sleek fighter jet starship
        ctx.beginPath();
        const headX = player.x + Math.cos(player.angle) * (player.radius * 1.35);
        const headY = player.y + Math.sin(player.angle) * (player.radius * 1.35);

        const wingAngle1 = player.angle + Math.PI * 0.78;
        const wingAngle2 = player.angle - Math.PI * 0.78;

        const leftWingX = player.x + Math.cos(wingAngle1) * player.radius;
        const leftWingY = player.y + Math.sin(wingAngle1) * player.radius;

        const rightWingX = player.x + Math.cos(wingAngle2) * player.radius;
        const rightWingY = player.y + Math.sin(wingAngle2) * player.radius;

        const tailX = player.x - Math.cos(player.angle) * (player.radius * 0.5);
        const tailY = player.y - Math.sin(player.angle) * (player.radius * 0.5);

        ctx.moveTo(headX, headY);
        ctx.lineTo(leftWingX, leftWingY);
        ctx.quadraticCurveTo(tailX, tailY, rightWingX, rightWingY);
        ctx.closePath();

        // Ship fill
        ctx.fillStyle = 'rgba(8, 47, 73, 0.6)'; // deep sky blue
        ctx.fill();
        ctx.stroke();

        // Inner core cockpit drawing
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(player.x + Math.cos(player.angle) * 3, player.y + Math.sin(player.angle) * 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore(); // end world space drawings coordinate system translations

      // HUD & Canvas overlays (Screen relative coordinates mapping)
      if (flashTextRef.current) {
        ctx.save();
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = flashTextRef.current.color;
        
        ctx.shadowColor = flashTextRef.current.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        
        // Fades in and out
        const alph = Math.min(1, flashTextRef.current.timer / 30);
        ctx.globalAlpha = alph;
        ctx.fillText(flashTextRef.current.text, canvas.width / 2, canvas.height * 0.28);
        ctx.restore();
      }
    };

    // Begin looping
    animFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [status, joystickVector]);

  return (
    <div id="canvas-wrapper" className="w-full h-full relative overflow-hidden select-none touch-none">
      <canvas
        id="neon-game-canvas"
        ref={canvasRef}
        className="w-full h-full block touch-none select-none"
      />
    </div>
  );
}
