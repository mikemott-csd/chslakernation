import { useEffect, useRef } from "react";

interface Sediment {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  swayAmp: number;
  color: string;
}

interface Caustic {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  alpha: number;
  phase: number;
  phaseSpeed: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
}

interface LightShaft {
  x: number;
  baseX: number;
  width: number;
  alpha: number;
  phase: number;
  phaseSpeed: number;
  amp: number;
}

export default function HoneycombBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let W = window.innerWidth;
    let H = window.innerHeight;

    let sediment: Sediment[] = [];
    let caustics: Caustic[] = [];
    let shafts: LightShaft[] = [];

    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function initAll() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      // Particles — natural floating matter in open water, no glow
      sediment = [];
      const PARTICLE_COLORS = [
        "rgba(160,195,220,1)",
        "rgba(140,175,205,1)",
        "rgba(170,200,225,1)",
        "rgba(150,185,215,1)",
        "rgba(180,205,228,1)",
        "rgba(155,178,200,1)",
      ];
      const count = Math.min(160, Math.floor((W * H) / 6000));
      for (let i = 0; i < count; i++) {
        sediment.push({
          x: rand(0, W),
          y: rand(0, H),
          radius: rand(0.6, 2.2),
          alpha: rand(0.10, 0.28),
          vx: rand(-0.10, 0.10),
          vy: rand(-0.03, 0.08),
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.0005, 0.002),
          swayAmp: rand(0.04, 0.18),
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        });
      }

      // Caustics — soft light patches near the top, like sunlight refracting through the surface
      caustics = [];
      for (let i = 0; i < 14; i++) {
        const bx = rand(0, W);
        const by = rand(0, H * 0.38);
        caustics.push({
          x: bx, y: by, baseX: bx, baseY: by,
          radius: rand(40, 130),
          alpha: rand(0.018, 0.045),
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.0003, 0.0012),
          freqX: rand(0.00004, 0.00010),
          freqY: rand(0.00005, 0.00012),
          ampX: rand(20, 60),
          ampY: rand(10, 30),
        });
      }

      // Light shafts — 2-3 wide, very faint diagonal beams from above
      shafts = [];
      for (let i = 0; i < 3; i++) {
        const bx = rand(W * 0.15, W * 0.85);
        shafts.push({
          x: bx, baseX: bx,
          width: rand(60, 160),
          alpha: rand(0.016, 0.034),
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.0002, 0.0006),
          amp: rand(30, 80),
        });
      }
    }

    initAll();
    window.addEventListener("resize", initAll);

    function drawBackground() {
      // Deep royal blue — bright at top, dark but still clearly blue at bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,   "#002060");
      grad.addColorStop(0.3, "#001540");
      grad.addColorStop(0.7, "#000e2a");
      grad.addColorStop(1,   "#000818");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle edge vignette — darker at corners
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.4, H * 0.1, W * 0.5, H * 0.4, Math.max(W, H) * 0.8);
      vig.addColorStop(0,   "rgba(0,0,0,0)");
      vig.addColorStop(0.7, "rgba(0,0,0,0.08)");
      vig.addColorStop(1,   "rgba(0,0,0,0.38)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    }

    function drawShafts(t: number) {
      shafts.forEach((s) => {
        s.x = s.baseX + s.amp * Math.sin(t * s.phaseSpeed * 60 + s.phase);

        // Radial gradient anchored just above the canvas top — fades naturally
        // in all directions with no hard edges or polygon shapes
        const depth = H * 0.65;
        const spread = depth * 1.1;
        const originY = -depth * 0.08;
        const radial = ctx.createRadialGradient(s.x, originY, 0, s.x, originY, spread);
        radial.addColorStop(0,    `rgba(115,170,230,${s.alpha})`);
        radial.addColorStop(0.35, `rgba(85,145,215,${s.alpha * 0.55})`);
        radial.addColorStop(0.7,  `rgba(60,120,195,${s.alpha * 0.15})`);
        radial.addColorStop(1,    "rgba(40,100,180,0)");

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, W, depth);
        ctx.restore();
      });
    }

    function drawCaustics(t: number) {
      caustics.forEach((c) => {
        c.x = c.baseX + c.ampX * Math.sin(t * c.freqX * 60 + c.phase);
        c.y = c.baseY + c.ampY * Math.cos(t * c.freqY * 60 + c.phase * 1.4);

        // Pulse alpha gently
        const pulse = 0.7 + 0.3 * Math.sin(t * c.phaseSpeed * 60 + c.phase);

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
        grad.addColorStop(0,   `rgba(140,195,240,${c.alpha * pulse})`);
        grad.addColorStop(0.5, `rgba(100,160,220,${c.alpha * pulse * 0.4})`);
        grad.addColorStop(1,   "rgba(60,120,190,0)");

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.radius, c.radius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawSediment() {
      sediment.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function updateSediment(t: number) {
      sediment.forEach((p) => {
        // Gentle horizontal sway on top of base drift
        const sway = p.swayAmp * Math.sin(t * p.phaseSpeed * 60 + p.phase);
        p.x += p.vx + sway;
        p.y += p.vy;
        if (p.x < -4)    p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        if (p.y < -4)    p.y = H + 4;
        if (p.y > H + 4) p.y = -4;
      });
    }

    const animate = () => {
      time += 1;
      const t = time;

      drawBackground();
      drawShafts(t);
      drawCaustics(t);
      updateSediment(t);
      drawSediment();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", initAll);
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
