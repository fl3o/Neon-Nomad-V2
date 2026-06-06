/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  health: number;
  maxHealth: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  radius: number;
  pulseSpeed: number;
  pulseTimer: number;
  color: string;
  value: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  rotationSpeed: number;
  color: string;
  type: 'asteroid' | 'sentinel' | 'comet';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SaveState {
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    health: number;
  };
  score: number;
  highScore: number;
  level: number;
  obstacles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    type: 'asteroid' | 'sentinel' | 'comet';
  }>;
  collectibles: Array<{
    x: number;
    y: number;
    radius: number;
  }>;
  timestamp: string;
}

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';
