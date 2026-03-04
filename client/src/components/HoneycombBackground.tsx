import { useEffect, useRef } from "react";

export default function HoneycombBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SCALE = 3;
    const DAMP = 0.988;
    const REFRACT = 0.14;

    // Mutable state object so resize can update everything the animate loop sees
    const state = {
      simW: 0,
      simH: 0,
      cur: new Float32Array(0),
      prev: new Float32Array(0),
    };

    let animationId: number;
    let time = 0;
    let ambientTimer = 0;

    function init() {
      const w = Math.ceil(window.innerWidth / SCALE);
      const h = Math.ceil(window.innerHeight / SCALE);
      state.simW = w;
      state.simH = h;
      canvas.width = w;
      canvas.height = h;
      state.cur = new Float32Array(w * h);
      state.prev = new Float32Array(w * h);
    }

    init();
    window.addEventListener("resize", init);

    // Inject ripple energy into the prev buffer (read on next step)
    function splash(cx: number, cy: number, radius: number, strength: number) {
      const { simW, simH, prev } = state;
      const r2 = radius * radius;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= r2) {
            const nx = Math.max(1, Math.min(simW - 2, cx + dx));
            const ny = Math.max(1, Math.min(simH - 2, cy + dy));
            prev[ny * simW + nx] += strength;
          }
        }
      }
    }

    let lastSimX = -1;
    let lastSimY = -1;

    const onMouseMove = (e: MouseEvent) => {
      const { simW, simH } = state;
      const sx = Math.floor((e.clientX / window.innerWidth) * simW);
      const sy = Math.floor((e.clientY / window.innerHeight) * simH);
      if (sx !== lastSimX || sy !== lastSimY) {
        splash(sx, sy, 5, 380);
        lastSimX = sx;
        lastSimY = sy;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const { simW, simH } = state;
      const t = e.touches[0];
      const sx = Math.floor((t.clientX / window.innerWidth) * simW);
      const sy = Math.floor((t.clientY / window.innerHeight) * simH);
      splash(sx, sy, 5, 380);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    function doAmbientSplash() {
      const { simW, simH } = state;
      if (time - ambientTimer > 3 + Math.random() * 4) {
        ambientTimer = time;
        const ax = 2 + Math.floor(Math.random() * (simW - 4));
        const ay = 2 + Math.floor(Math.random() * (simH - 4));
        splash(ax, ay, 2, 100 + Math.random() * 80);
      }
    }

    const animate = () => {
      time += 0.016;

      const { simW: w, simH: h } = state;
      let { cur, prev } = state;

      // --- Wave simulation step ---
      for (let y = 1; y < h - 1; y++) {
        const row = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = row + x;
          const val =
            (prev[i - 1] + prev[i + 1] + prev[i - w] + prev[i + w]) * 0.5 -
            cur[i];
          cur[i] = val * DAMP;
        }
      }

      // Swap buffers
      state.cur = prev;
      state.prev = cur;
      // After swap: state.prev = newly computed, state.cur = old prev (2 frames ago)
      prev = state.prev;
      cur = state.cur;

      doAmbientSplash();

      // --- Render via ImageData ---
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      for (let y = 0; y < h; y++) {
        const yNorm = y / h;
        // Deep lake: dark navy-teal gradient top→bottom
        // Top (0): rgb(0, 60, 110) — teal-blue, simulating light above surface
        // Bottom (1): rgb(0, 12, 35) — very dark navy
        const baseR = 0;
        const baseG = Math.round(60 - yNorm * 48);
        const baseB = Math.round(110 - yNorm * 75);

        const row = y * w;
        for (let x = 0; x < w; x++) {
          const i = row + x;
          const height = prev[i];

          // Refraction: compute surface normal gradient
          const ndx = x > 0 && x < w - 1 ? prev[i + 1] - prev[i - 1] : 0;
          const ndy = y > 0 && y < h - 1 ? prev[i + w] - prev[i - w] : 0;

          // Offset source sample position
          const srcX = Math.max(0, Math.min(w - 1, (x + ndx * REFRACT) | 0));
          const srcY = Math.max(0, Math.min(h - 1, (y + ndy * REFRACT) | 0));
          const srcYNorm = srcY / h;

          // Background color at refracted position
          const rg = Math.round(60 - srcYNorm * 48);
          const rb = Math.round(110 - srcYNorm * 75);

          // Caustic shimmer (subtle animated light patterns)
          const caustic =
            4 * Math.sin(x * 0.06 + time * 1.0) * Math.sin(y * 0.05 + time * 0.7) +
            2 * Math.sin(x * 0.11 + time * 0.6) * Math.sin(y * 0.08 + time * 1.2);

          // Height-based brightness: ripple crests catch light
          const bright = height * 0.28 + caustic;

          const pi = i << 2;
          data[pi]     = Math.max(0, Math.min(255, baseR + bright * 0.4));
          data[pi + 1] = Math.max(0, Math.min(255, rg + bright));
          data[pi + 2] = Math.max(0, Math.min(255, rb + bright * 0.8));
          data[pi + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", init);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
