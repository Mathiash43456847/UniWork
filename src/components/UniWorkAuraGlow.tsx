import React, { useEffect, useRef } from 'react';
import { useAuraConfig } from '../lib/auraConfig';

interface UniWorkAuraGlowProps {
  active: boolean;
  className?: string;
  pillClassName?: string;
  intensity?: 'button' | 'card';
  speed?: number; // duration in seconds for 1 full loop around perimeter
  borderRadius?: string;
  configId?: string;
}

// UniWork 4-color signature spectrum: Cyan -> Royal Blue -> Electric Purple -> Neon Magenta
// Distinct hues with balanced luminosity so each color stands out with equal visual space
const SPECTRUM_COLORS = [
  { r: 0, g: 235, b: 255 },  // 0: Vibrant Electric Cyan / Turquoise (#00EBFF)
  { r: 0, g: 90, b: 255 },   // 1: Vivid Royal Blue (#005AFF)
  { r: 155, g: 45, b: 255 }, // 2: Deep Electric Purple / Violet (#9B2DFF)
  { r: 255, g: 40, b: 175 }, // 3: Radiant Neon Magenta / Hot Pink (#FF28AF)
];

function interpolateColor(u: number): string {
  // u is normalized in [0, 1)
  const norm = ((u % 1) + 1) % 1;
  const scaled = norm * 4;
  const i = Math.floor(scaled) % 4;
  const j = (i + 1) % 4;
  const f = scaled - Math.floor(scaled);
  // Smooth cubic ease for natural color blending
  const easeF = f * f * (3 - 2 * f);

  const r = Math.round(SPECTRUM_COLORS[i].r + (SPECTRUM_COLORS[j].r - SPECTRUM_COLORS[i].r) * easeF);
  const g = Math.round(SPECTRUM_COLORS[i].g + (SPECTRUM_COLORS[j].g - SPECTRUM_COLORS[i].g) * easeF);
  const b = Math.round(SPECTRUM_COLORS[i].b + (SPECTRUM_COLORS[j].b - SPECTRUM_COLORS[i].b) * easeF);
  return `rgb(${r},${g},${b})`;
}

/**
 * Calculates normalized color coordinate u in [0, 1) ensuring each of the 4 sides
 * (Top, Right, Bottom, Left) receives exactly 25% of the color cycle.
 * This guarantees that each color occupies an equal visual quarter of the perimeter.
 */
function getPerimeterColorU(d: number, L_horiz: number, L_vert: number, L_arc: number, P: number): number {
  const S_top = L_horiz + L_arc;
  const S_right = L_vert + L_arc;
  const S_bottom = L_horiz + L_arc;
  const S_left = L_vert + L_arc;

  // Offset by half of the top-left arc so Side 0 begins at the top-left 45-degree diagonal
  const dPrime = ((d + L_arc / 2) % P + P) % P;

  if (dPrime < S_top) {
    return (dPrime / S_top) * 0.25;
  } else if (dPrime < S_top + S_right) {
    return 0.25 + ((dPrime - S_top) / S_right) * 0.25;
  } else if (dPrime < S_top + S_right + S_bottom) {
    return 0.50 + ((dPrime - S_top - S_right) / S_bottom) * 0.25;
  } else {
    return 0.75 + ((dPrime - S_top - S_right - S_bottom) / S_left) * 0.25;
  }
}

/**
 * Universal 8-segment racetrack mapping for any rectangle, pill, or card
 * Loops light clockwise:
 * Top (left -> right) -> Top-Right arc -> Right straight -> Bottom-Right arc
 * -> Bottom (right -> left) -> Bottom-Left arc -> Left straight -> Top-Left arc
 */
function getPointAtDistance(
  d: number,
  W: number,
  H: number,
  R: number,
  padX: number,
  padY: number
): { x: number; y: number } {
  const maxR = Math.min(W / 2, H / 2);
  const r = Math.max(0, Math.min(R, maxR));

  const L_horiz = Math.max(0, W - 2 * r);
  const L_vert = Math.max(0, H - 2 * r);
  const L_arc = (Math.PI / 2) * r;

  // 1. Top horizontal straight edge (moving left -> right)
  if (d <= L_horiz) {
    return {
      x: padX + r + d,
      y: padY,
    };
  }
  d -= L_horiz;

  // 2. Top-right arc (curving down from -PI/2 to 0)
  if (d <= L_arc) {
    const angle = -Math.PI / 2 + (r > 0 ? d / r : 0);
    return {
      x: padX + W - r + r * Math.cos(angle),
      y: padY + r + r * Math.sin(angle),
    };
  }
  d -= L_arc;

  // 3. Right vertical straight edge (moving top -> bottom)
  if (d <= L_vert) {
    return {
      x: padX + W,
      y: padY + r + d,
    };
  }
  d -= L_vert;

  // 4. Bottom-right arc (curving from 0 to PI/2)
  if (d <= L_arc) {
    const angle = r > 0 ? d / r : 0;
    return {
      x: padX + W - r + r * Math.cos(angle),
      y: padY + H - r + r * Math.sin(angle),
    };
  }
  d -= L_arc;

  // 5. Bottom horizontal straight edge (moving right -> left)
  if (d <= L_horiz) {
    return {
      x: padX + W - r - d,
      y: padY + H,
    };
  }
  d -= L_horiz;

  // 6. Bottom-left arc (curving from PI/2 to PI)
  if (d <= L_arc) {
    const angle = Math.PI / 2 + (r > 0 ? d / r : 0);
    return {
      x: padX + r + r * Math.cos(angle),
      y: padY + H - r + r * Math.sin(angle),
    };
  }
  d -= L_arc;

  // 7. Left vertical straight edge (moving bottom -> top)
  if (d <= L_vert) {
    return {
      x: padX,
      y: padY + H - r - d,
    };
  }
  d -= L_vert;

  // 8. Top-left arc (curving from PI to 3*PI/2)
  const angle = Math.PI + (r > 0 ? d / r : 0);
  return {
    x: padX + r + r * Math.cos(angle),
    y: padY + r + r * Math.sin(angle),
  };
}

function getRadiusFromClassName(pillClassName: string | undefined, H: number, isCard: boolean): number {
  if (isCard) return Math.min(32, H / 2);
  if (!pillClassName) return H / 2;
  if (pillClassName.includes('full')) return H / 2;
  if (pillClassName.includes('[36px]')) return 36;
  if (pillClassName.includes('[32px]')) return 32;
  if (pillClassName.includes('3xl')) return 24;
  if (pillClassName.includes('2xl')) return 16;
  if (pillClassName.includes('xl')) return 12;
  if (pillClassName.includes('lg')) return 8;
  return H / 2;
}

/**
 * UniWork True Perimeter Racetrack Aura
 *
 * - Database-backed aura pixel stroke and scale controls
 * - Loops light clockwise around the perimeter of the button / card
 * - Every color occupies a mathematically locked 25% of perimeter distance
 * - Triple-layer volumetric light dispersion (Ambient Bloom + Mid Saturated Halo + Core Crisp Rim)
 */
export const UniWorkAuraGlow: React.FC<UniWorkAuraGlowProps> = ({
  active,
  className = '',
  pillClassName = '',
  intensity = 'button',
  speed = intensity === 'button' ? 2.4 : 4.8,
  borderRadius,
  configId = 'global',
}) => {
  const isCard = intensity === 'card';
  const { strokes, blurs, pad: configPad, opacityPercent, showOutline, placement } = useAuraConfig(configId);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasBloomRef = useRef<HTMLCanvasElement>(null);
  const canvasHaloRef = useRef<HTMLCanvasElement>(null);
  const canvasCoreRef = useRef<HTMLCanvasElement>(null);

  // Keep refs for animation loop
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const padRef = useRef(configPad);
  padRef.current = configPad;

  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedSec = (timestamp - startTime) / 1000;
      const progress = (elapsedSec / speed) % 1;

      const container = containerRef.current;
      const canvasBloom = canvasBloomRef.current;
      const canvasHalo = canvasHaloRef.current;
      const canvasCore = canvasCoreRef.current;

      if (!container || !canvasBloom || !canvasHalo || !canvasCore) {
        animId = requestAnimationFrame(render);
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pad = padRef.current;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      // Sync canvas pixel dimensions when necessary
      if (canvasBloom.width !== targetW || canvasBloom.height !== targetH) {
        canvasBloom.width = targetW;
        canvasBloom.height = targetH;
        canvasHalo.width = targetW;
        canvasHalo.height = targetH;
        canvasCore.width = targetW;
        canvasCore.height = targetH;
      }

      const ctxBloom = canvasBloom.getContext('2d');
      const ctxHalo = canvasHalo.getContext('2d');
      const ctxCore = canvasCore.getContext('2d');

      if (!ctxBloom || !ctxHalo || !ctxCore) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Pill/card geometry inside padding
      const W = Math.max(10, rect.width - 2 * pad);
      const H = Math.max(10, rect.height - 2 * pad);
      const R = getRadiusFromClassName(pillClassName, H, isCard);

      const maxR = Math.min(W / 2, H / 2);
      const r = Math.max(0, Math.min(R, maxR));
      const P = 2 * Math.max(0, W - 2 * r) + 2 * Math.max(0, H - 2 * r) + 2 * Math.PI * r;

      if (P <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // High segment count for seamless continuous brush stroke
      const numSegments = isCard ? 360 : 280;
      const L_horiz = Math.max(0, W - 2 * r);
      const L_vert = Math.max(0, H - 2 * r);
      const L_arc = (Math.PI / 2) * r;

      const drawPerimeterTrack = (ctx: CanvasRenderingContext2D, strokeWidth: number) => {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.lineWidth = strokeWidth;

        for (let k = 0; k < numSegments; k++) {
          const d1 = (k / numSegments) * P;
          const d2 = ((k + 1) / numSegments) * P;
          const pt1 = getPointAtDistance(d1, W, H, r, pad, pad);
          const pt2 = getPointAtDistance(d2, W, H, r, pad, pad);

          // Equal-space perimeter mapping: every side and color gets exactly 25% of the visual space
          const midD = ((k + 0.5) / numSegments) * P;
          const baseU = getPerimeterColorU(midD, L_horiz, L_vert, L_arc, P);
          const u = baseU - progress;
          ctx.strokeStyle = interpolateColor(u);

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }

        ctx.restore();
      };

      const curStrokes = strokesRef.current;
      const bloomStroke = isCard ? curStrokes.card.bloom : curStrokes.button.bloom;
      const haloStroke = isCard ? curStrokes.card.halo : curStrokes.button.halo;
      const coreStroke = isCard ? curStrokes.card.core : curStrokes.button.core;

      // Layer 1: Outer Ambient Bloom
      drawPerimeterTrack(ctxBloom, bloomStroke);

      // Layer 2: Mid Saturated Halo
      drawPerimeterTrack(ctxHalo, haloStroke);

      // Layer 3: Core High-Definition Rim
      drawPerimeterTrack(ctxCore, coreStroke);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isCard, pillClassName, speed]);

  const bloomBlur = isCard ? blurs.card.bloom : blurs.button.bloom;
  const haloBlur = isCard ? blurs.card.halo : blurs.button.halo;
  const coreBlur = isCard ? blurs.card.core : blurs.button.core;

  const masterAlpha = (opacityPercent ?? 85) / 100;

  return (
    <div
      ref={containerRef}
      className={`absolute pointer-events-none transition-opacity duration-300 ease-out ${
        active ? (isCard ? 'opacity-70' : 'opacity-100') : 'opacity-0'
      } ${className}`}
      style={{
        zIndex: placement === 'behind' ? 0 : 10,
        top: `-${configPad}px`,
        bottom: `-${configPad}px`,
        left: `-${configPad}px`,
        right: `-${configPad}px`,
      }}
      aria-hidden="true"
    >
      {/* Layer 1: Ambient Bloom */}
      <canvas
        ref={canvasBloomRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: `blur(${bloomBlur}px)`, opacity: 0.9 * masterAlpha }}
      />

      {/* Layer 2: Mid Saturated Halo */}
      <canvas
        ref={canvasHaloRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: `blur(${haloBlur}px)`, opacity: 1.0 * masterAlpha }}
      />

      {/* Layer 3: Core High-Definition Rim */}
      <canvas
        ref={canvasCoreRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: `blur(${coreBlur}px)`, opacity: 0.95 * masterAlpha }}
      />

      {/* Subtle Pill/Card Outline / Edge Highlight (Google AI style) */}
      {showOutline && (
        <div
          className="absolute pointer-events-none transition-all"
          style={{
            left: `${configPad - 1}px`,
            right: `${configPad - 1}px`,
            top: `${configPad - 1}px`,
            bottom: `${configPad - 1}px`,
            borderRadius: borderRadius || (isCard ? '1rem' : '9999px'),
            border: '1.5px solid rgba(255, 255, 255, 0.55)',
            boxShadow: '0 0 14px rgba(255, 255, 255, 0.35), inset 0 0 8px rgba(255, 255, 255, 0.25)',
          }}
        />
      )}
    </div>
  );
};
