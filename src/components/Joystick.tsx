/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';

interface JoystickProps {
  onChange: (vector: { x: number; y: number }) => void;
  onSavePress: () => void;
}

export default function Joystick({ onChange, onSavePress }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const maxRadius = 50; // Maximum distance the knob can move from center (in px)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    setActive(true);
    baseRef.current?.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId || !baseRef.current) return;

    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      setKnobPos({ x: 0, y: 0 });
      onChange({ x: 0, y: 0 });
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDistance = Math.min(distance, maxRadius);

    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    setKnobPos({ x: knobX, y: knobY });

    // Send normalized vector (-1.0 to 1.0)
    onChange({
      x: knobX / maxRadius,
      y: knobY / maxRadius,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    baseRef.current?.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  useEffect(() => {
    return () => {
      onChange({ x: 0, y: 0 });
    };
  }, []);

  return (
    <div id="joystick-container" className="fixed bottom-8 left-0 right-0 px-6 py-4 flex items-center justify-between select-none pointer-events-none z-40">
      
      {/* Joystick Area */}
      <div 
        id="joystick-base"
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-32 h-32 border-2 border-[#00FF41] bg-black/90 flex items-center justify-center relative touch-none shadow-[4px_4px_0px_0px_rgba(0,255,65,0.2)] select-none pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-full h-[1px] bg-[#00FF41] absolute" />
          <div className="h-full w-[1px] bg-[#00FF41] absolute" />
          <div className="w-3/4 h-3/4 border border-[#00FF41] border-dashed absolute rounded-full" />
        </div>

        {/* The Sliding Knob */}
        <div
          id="joystick-knob"
          className="w-14 h-14 border-2 border-[#00FF41] bg-[#00FF41] flex items-center justify-center shadow-lg transition-transform duration-75 pointer-events-none"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        >
          {/* Knob Inner Detail */}
          <div className="w-4 h-4 bg-black border border-white/50" />
        </div>
      </div>

      {/* Save Button Area (Responsive for touch interface) */}
      <button
        id="btn-mobile-save"
        onClick={onSavePress}
        className="w-20 h-20 border-2 border-red-500 bg-[#050505] text-red-500 hover:bg-red-500 hover:text-black flex flex-col items-center justify-center font-mono text-[11px] font-black tracking-widest pointer-events-auto transition-all duration-150 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.2)] cursor-pointer"
        style={{ touchAction: 'manipulation' }}
      >
        <span className="text-base">💾</span>
        <span>SAVE</span>
      </button>
    </div>
  );
}
