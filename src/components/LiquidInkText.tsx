import React, { useEffect, useRef, useState } from 'react';

interface LiquidInkTextProps {
  text?: string;
  className?: string;
}

export const LiquidInkText: React.FC<LiquidInkTextProps> = ({
  text = 'Your Unified Workspace',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  // ... (existing font loading logic)

  // In the render function, use fillProgressRef to mask the liquid canvas
  // ...

  // Check when fonts are ready
  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setFontLoaded(true);
      });
    } else {
      setFontLoaded(true);
    }
  }, []);

  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const container = containerRef.current;
    if (!displayCanvas || !container) return;

    // Create offscreen WebGL canvas for fluid simulation
    let glCanvas = glCanvasRef.current;
    if (!glCanvas) {
      glCanvas = document.createElement('canvas');
      glCanvasRef.current = glCanvas;
    }

    const gl = (glCanvas.getContext('webgl', { alpha: false, antialias: true, preserveDrawingBuffer: true }) ||
      glCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    const displayCtx = displayCanvas.getContext('2d', { alpha: true });
    if (!displayCtx) return;

    // Vertex Shader for WebGL
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: Macro Liquid Cream-in-Water Simulation with 4-6 Large Soft Swirling Vortices
    const fsSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_duration;

      // Color Palette constants
      // Core royal blue #2E6BF6 as the darkest baseline tone (never dark/navy)
      const vec3 C_ROYAL_BLUE  = vec3(0.1804, 0.4196, 0.9647);
      // Bright blue #4D82FF vibrant body
      const vec3 C_BRIGHT_BLUE = vec3(0.3020, 0.5098, 1.0000);
      // Ice blue #7CB8FF swirling accents
      const vec3 C_ICE_BLUE    = vec3(0.4863, 0.7216, 1.0000);
      // Soft off-white #F5F7FA wide smooth light streaks
      const vec3 C_OFFWHITE    = vec3(0.9608, 0.9686, 0.9804);

      // Smooth cyclic wave harmonics (completely noiseless, silky smooth liquid flow)
      float smoothWave(vec2 p, float angle, float freq) {
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(-sin(angle), cos(angle));
        float w1 = sin(dot(p, dir1) * freq + sin(dot(p, dir2) * (freq * 0.5) + angle));
        float w2 = cos(dot(p, dir2) * freq * 0.85 - cos(dot(p, dir1) * (freq * 0.4) - angle));
        return (w1 + w2) * 0.5;
      }

      // Sample scalar liquid height/density field
      float getFluidField(vec2 p, float loopAngle, float aspect) {
        // 5 LARGE SOFT SWIRLING VORTICES (each approx 1/4 frame wide)
        vec2 curP = p;

        // Vortex 1: Upper-left / center-left (clockwise)
        vec2 c1 = vec2(0.28 * aspect + 0.05 * cos(loopAngle), 0.65 + 0.04 * sin(loopAngle));
        vec2 d1 = curP - c1;
        float r1 = length(d1);
        float v1 = exp(-r1 * r1 * 9.0) * 1.6; // Soft Gaussian decay (approx 0.25 to 0.35 width)
        float a1 = atan(d1.y, d1.x) + v1 * (1.0 + 0.25 * sin(loopAngle));
        curP = c1 + vec2(cos(a1), sin(a1)) * r1;

        // Vortex 2: Center-right (counter-clockwise)
        vec2 c2 = vec2(0.72 * aspect + 0.06 * sin(loopAngle), 0.42 + 0.05 * cos(loopAngle));
        vec2 d2 = curP - c2;
        float r2 = length(d2);
        float v2 = exp(-r2 * r2 * 8.5) * -1.8;
        float a2 = atan(d2.y, d2.x) + v2 * (1.0 + 0.2 * cos(loopAngle + 1.2));
        curP = c2 + vec2(cos(a2), sin(a2)) * r2;

        // Vortex 3: Lower-left / bottom (clockwise)
        vec2 c3 = vec2(0.40 * aspect + 0.04 * cos(loopAngle + 2.1), 0.22 + 0.04 * sin(loopAngle + 2.1));
        vec2 d3 = curP - c3;
        float r3 = length(d3);
        float v3 = exp(-r3 * r3 * 10.0) * 1.5;
        float a3 = atan(d3.y, d3.x) + v3 * (1.0 + 0.3 * sin(loopAngle + 2.5));
        curP = c3 + vec2(cos(a3), sin(a3)) * r3;

        // Vortex 4: Upper-right (counter-clockwise)
        vec2 c4 = vec2(0.85 * aspect + 0.04 * sin(loopAngle + 3.5), 0.78 + 0.03 * cos(loopAngle + 3.5));
        vec2 d4 = curP - c4;
        float r4 = length(d4);
        float v4 = exp(-r4 * r4 * 9.5) * -1.4;
        float a4 = atan(d4.y, d4.x) + v4 * (1.0 + 0.25 * cos(loopAngle + 4.0));
        curP = c4 + vec2(cos(a4), sin(a4)) * r4;

        // Vortex 5: Center-midfield (gentle swirling vortex)
        vec2 c5 = vec2(0.52 * aspect + 0.05 * cos(loopAngle + 4.8), 0.50 + 0.04 * sin(loopAngle + 4.8));
        vec2 d5 = curP - c5;
        float r5 = length(d5);
        float v5 = exp(-r5 * r5 * 7.5) * 1.7;
        float a5 = atan(d5.y, d5.x) + v5 * (1.0 + 0.2 * sin(loopAngle * 2.0));
        curP = c5 + vec2(cos(a5), sin(a5)) * r5;

        // Slow-motion cream folding dynamics (Broad silky smooth domain warping)
        vec2 warp1 = vec2(
          smoothWave(curP, loopAngle, 2.2),
          smoothWave(curP + vec2(1.7, 2.3), loopAngle + 1.57, 2.2)
        );

        vec2 warp2 = vec2(
          smoothWave(curP + warp1 * 0.45, loopAngle * 2.0 + 0.8, 3.4),
          smoothWave(curP + warp1 * 0.45 + vec2(3.1, 1.4), loopAngle * 2.0 + 2.37, 3.4)
        );

        // Soft field value in [0, 1]
        float field = smoothWave(curP + warp2 * 0.35, loopAngle, 2.8) * 0.5 + 0.5;
        float secondary = smoothWave(curP * 1.3 - warp1 * 0.2, loopAngle + 3.1415, 3.8) * 0.5 + 0.5;
        
        return mix(field, secondary, 0.35);
      }

      void main() {
        vec2 uv = v_uv;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = uv;
        p.x *= aspect;

        // Perfectly seamless cyclic time angle [0 -> 2*PI]
        float loopAngle = (u_time / u_duration) * 6.28318530718;

        // Primary smooth fluid field
        float h = getFluidField(p, loopAngle, aspect);
        // Secondary offset fluid field for soft multi-layer color blending
        float h2 = getFluidField(p * 0.85 + vec2(0.35, 0.25), loopAngle + 1.8, aspect);

        // Ultra-smooth, seamless color merging (No surface lines, no deep navy, no dark shadows)
        // 1. Core royal blue #2E6BF6 base smoothly transitioning into vibrant bright blue #4D82FF
        vec3 col = mix(C_ROYAL_BLUE, C_BRIGHT_BLUE, smoothstep(0.08, 0.48, h));

        // 2. Swirling ice blue #7CB8FF accents & secondary eddies
        col = mix(col, C_ICE_BLUE, smoothstep(0.42, 0.80, (h + h2 * 0.75) * 0.57) * 0.95);

        // 3. Broad, smooth off-white #F5F7FA light streaks seamlessly washing through
        float wideLightStreak = smoothstep(0.62, 0.94, (h * 0.65 + h2 * 0.35));
        col = mix(col, C_OFFWHITE, wideLightStreak * 0.90);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    let program: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let uResolutionLoc: WebGLUniformLocation | null = null;
    let uTimeLoc: WebGLUniformLocation | null = null;
    let uDurationLoc: WebGLUniformLocation | null = null;

    if (gl) {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);

      program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      gl.useProgram(program);

      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPosition = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      uTimeLoc = gl.getUniformLocation(program, 'u_time');
      uDurationLoc = gl.getUniformLocation(program, 'u_duration');
    }

    const DURATION = 18.0; // 18 seconds perfect seamless loop
    const startTime = performance.now();

    const render = () => {
      if (!displayCanvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width;
      
      // Calculate dynamic font size based on container width (Proportional Fluidity)
      // Base scaling: approx 7% of width, bounded by a reasonable min/max
      const baseFontSize = Math.max(28, Math.min(88, width * 0.082));
      const scaledFontSize = baseFontSize * dpr;

      displayCtx.font = `800 ${scaledFontSize}px "Open Sauce One", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
      const textMetrics = displayCtx.measureText(text);
      
      // Dynamic height based on font size and descent
      const textHeight = baseFontSize * 1.2;
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(textHeight * dpr);

      if (displayCanvas.width !== pixelWidth || displayCanvas.height !== pixelHeight) {
        displayCanvas.width = pixelWidth;
        displayCanvas.height = pixelHeight;
        displayCanvas.style.width = `${width}px`;
        displayCanvas.style.height = `${textHeight}px`;
      }

      const elapsed = (performance.now() - startTime) / 1000;
      const loopTime = elapsed % DURATION;

      // 1. Render WebGL Fluid
      if (gl && program && glCanvas) {
        if (glCanvas.width !== pixelWidth || glCanvas.height !== pixelHeight) {
          glCanvas.width = pixelWidth;
          glCanvas.height = pixelHeight;
          gl.viewport(0, 0, pixelWidth, pixelHeight);
        }

        gl.useProgram(program);
        gl.uniform2f(uResolutionLoc, pixelWidth, pixelHeight);
        gl.uniform1f(uTimeLoc, loopTime);
        gl.uniform1f(uDurationLoc, DURATION);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // 2. Draw masked text in 2D Display Canvas
      displayCtx.clearRect(0, 0, pixelWidth, pixelHeight);

      displayCtx.save();
      displayCtx.textAlign = 'center';
      displayCtx.textBaseline = 'middle';
      displayCtx.font = `800 ${scaledFontSize}px "Open Sauce One", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
      displayCtx.letterSpacing = `${-0.03 * scaledFontSize}px`;

      const centerX = pixelWidth / 2;
      const centerY = pixelHeight / 2;

      // Fill text mask
      displayCtx.fillStyle = '#ffffff';
      displayCtx.fillText(text, centerX, centerY);

      // Mask with the high-performance WebGL fluid canvas
      displayCtx.globalCompositeOperation = 'source-in';
      if (glCanvas) {
        displayCtx.drawImage(glCanvas, 0, 0, pixelWidth, pixelHeight);
      } else {
        const grad = displayCtx.createLinearGradient(0, 0, pixelWidth, pixelHeight);
        grad.addColorStop(0, '#2E6BF6');
        grad.addColorStop(0.35, '#4D82FF');
        grad.addColorStop(0.70, '#7CB8FF');
        grad.addColorStop(1, '#F5F7FA');
        displayCtx.fillStyle = grad;
        displayCtx.fillRect(0, 0, pixelWidth, pixelHeight);
      }

      displayCtx.globalCompositeOperation = 'source-over';
      displayCtx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fontLoaded, text]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center w-full max-w-5xl mx-auto select-none ${className}`}
    >
      <canvas
        ref={displayCanvasRef}
        className="block mx-auto max-w-full"
      />
    </div>
  );
};
