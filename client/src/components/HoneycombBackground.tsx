import { useEffect, useRef } from "react";

interface Sediment {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
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

      // Sediment — tiny barely-visible particles drifting slowly
      sediment = [];
      const count = Math.min(120, Math.floor((W * H) / 8000));
      for (let i = 0; i < count; i++) {
        sediment.push({
          x: rand(0, W),
          y: rand(0, H),
          radius: rand(0.4, 1.3),
          alpha: rand(0.04, 0.13),
          vx: rand(-0.12, 0.12),
          vy: rand(-0.04, 0.1),
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
      // Deep lake abyss — lighter at the top (distant surface light), black at the bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,   "#001828");
      grad.addColorStop(0.3, "#000f1c");
      grad.addColorStop(0.7, "#000810");
      grad.addColorStop(1,   "#000208");
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
        // Slowly drift the shaft left/right
        s.x = s.baseX + s.amp * Math.sin(t * s.phaseSpeed * 60 + s.phase);

        const spread = s.width;
        const depth = H * 0.65;

        const grad = ctx.createLinearGradient(0, 0, 0, depth);
        grad.addColorStop(0,   `rgba(120,175,230,${s.alpha})`);
        grad.addColorStop(0.5, `rgba(80,140,200,${s.alpha * 0.5})`);
        grad.addColorStop(1,   "rgba(40,100,170,0)");

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(s.x - spread * 0.5, 0);
        ctx.lineTo(s.x + spread * 0.5, 0);
        ctx.lineTo(s.x + spread * 2.2, depth);
        ctx.lineTo(s.x - spread * 2.2, depth);
        ctx.closePath();
        ctx.fill();
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
        ctx.fillStyle = "rgba(140,175,210,1)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function updateSediment() {
      sediment.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -2)  p.x = W + 2;
        if (p.x > W + 2) p.x = -2;
        if (p.y < -2)  p.y = H + 2;
        if (p.y > H + 2) p.y = -2;
      });
    }

    const animate = () => {
      time += 1;
      const t = time;

      drawBackground();
      drawShafts(t);
      drawCaustics(t);
      updateSediment();
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
