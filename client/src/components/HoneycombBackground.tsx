import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  shadowColor: string;
  shadowBlur: number;
  alpha: number;
  phase: number;
  phaseSpeed: number;
  driftAmpX: number;
  driftAmpY: number;
  driftFreqX: number;
  driftFreqY: number;
  type: "plankton" | "orb" | "bloom";
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
    let particles: Particle[] = [];

    // Blues matched to the site's hsl(210, 85%, 35%) navy palette
    const PLANKTON_COLORS = [
      ["rgba(100,160,255,A)", "rgba(100,160,255,1)"],
      ["rgba(130,180,255,A)", "rgba(130,180,255,1)"],
      ["rgba(80,140,230,A)",  "rgba(80,140,230,1)"],
      ["rgba(150,195,255,A)", "rgba(150,195,255,1)"],
      ["rgba(110,165,245,A)", "rgba(110,165,245,1)"],
    ];
    const ORB_COLORS = [
      ["rgba(60,120,220,A)",  "rgba(60,120,220,1)"],
      ["rgba(80,150,240,A)",  "rgba(80,150,240,1)"],
      ["rgba(100,160,255,A)", "rgba(100,160,255,1)"],
      ["rgba(50,110,200,A)",  "rgba(50,110,200,1)"],
    ];
    const BLOOM_COLORS = [
      ["rgba(40,100,200,A)",  "rgba(40,100,200,1)"],
      ["rgba(60,130,220,A)",  "rgba(60,130,220,1)"],
      ["rgba(80,140,230,A)",  "rgba(80,140,230,1)"],
    ];

    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function makeParticle(type: Particle["type"]): Particle {
      const x = rand(0, W);
      const y = rand(0, H);
      if (type === "plankton") {
        const [fill, shadow] = PLANKTON_COLORS[Math.floor(Math.random() * PLANKTON_COLORS.length)];
        const alpha = rand(0.10, 0.25);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(0.8, 1.8),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(3, 7),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.001, 0.005),
          driftAmpX: rand(6, 18),
          driftAmpY: rand(5, 14),
          driftFreqX: rand(0.00008, 0.00018),
          driftFreqY: rand(0.0001, 0.00022),
          type,
        };
      } else if (type === "orb") {
        const [fill, shadow] = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
        const alpha = rand(0.18, 0.38);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(2.5, 5),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(10, 20),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.003, 0.009),
          driftAmpX: rand(12, 35),
          driftAmpY: rand(10, 28),
          driftFreqX: rand(0.00006, 0.00014),
          driftFreqY: rand(0.00008, 0.00016),
          type,
        };
      } else {
        const [fill, shadow] = BLOOM_COLORS[Math.floor(Math.random() * BLOOM_COLORS.length)];
        const alpha = rand(0.14, 0.26);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(8, 15),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(18, 36),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.002, 0.006),
          driftAmpX: rand(18, 45),
          driftAmpY: rand(12, 35),
          driftFreqX: rand(0.00005, 0.00011),
          driftFreqY: rand(0.00006, 0.00013),
          type,
        };
      }
    }

    function initParticles() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      particles = [];
      for (let i = 0; i < 40; i++) particles.push(makeParticle("plankton"));
      for (let i = 0; i < 11; i++) particles.push(makeParticle("orb"));
      for (let i = 0; i < 4; i++)  particles.push(makeParticle("bloom"));
    }

    initParticles();
    window.addEventListener("resize", initParticles);

    let mouseX = -9999;
    let mouseY = -9999;
    const REPULSE_RADIUS = 70;
    const REPULSE_STRENGTH = 0.5;
    const VEL_DAMP = 0.96;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    const onClickBurst = (e: MouseEvent) => {
      const bx = e.clientX;
      const by = e.clientY;
      const BURST_R = 160;
      particles.forEach((p) => {
        const dx = p.x - bx;
        const dy = p.y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BURST_R && dist > 0) {
          const force = (1 - dist / BURST_R) * 2.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    };
    const onTouchEnd = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    const onTouchStart = (e: TouchEvent) => {
      const bx = e.touches[0].clientX;
      const by = e.touches[0].clientY;
      const BURST_R = 160;
      particles.forEach((p) => {
        const dx = p.x - bx;
        const dy = p.y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BURST_R && dist > 0) {
          const force = (1 - dist / BURST_R) * 2.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("click", onClickBurst);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    function drawBackground() {
      // Deep navy — radial gradient from dark navy center to near-black edges
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
      grad.addColorStop(0, "#001428");
      grad.addColorStop(0.5, "#000d1e");
      grad.addColorStop(1, "#000508");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function drawParticle(p: Particle, t: number) {
      const pulse = 0.85 + 0.15 * Math.sin(t * p.phaseSpeed * 60 + p.phase);
      const drawAlpha = p.alpha * pulse;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = drawAlpha;
      ctx.shadowBlur = p.shadowBlur * pulse;
      ctx.shadowColor = p.shadowColor;
      ctx.fillStyle = p.shadowColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (p.type !== "plankton") {
        ctx.globalAlpha = drawAlpha * 0.45;
        ctx.fillStyle = "rgba(210,225,255,1)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const animate = () => {
      time += 1;
      const t = time;

      drawBackground();

      particles.forEach((p) => {
        const driftX = p.driftAmpX * Math.sin(t * p.driftFreqX * 60 + p.phase);
        const driftY = p.driftAmpY * Math.cos(t * p.driftFreqY * 60 + p.phase * 1.3);
        const targetX = p.baseX + driftX;
        const targetY = p.baseY + driftY;

        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPULSE_RADIUS && dist > 0) {
          const force = (1 - dist / REPULSE_RADIUS) * REPULSE_STRENGTH;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        p.vx += (targetX - p.x) * 0.008;
        p.vy += (targetY - p.y) * 0.008;
        p.vx *= VEL_DAMP;
        p.vy *= VEL_DAMP;
        p.x += p.vx;
        p.y += p.vy;

        const margin = 40;
        if (p.x < -margin) p.x = W + margin;
        if (p.x > W + margin) p.x = -margin;
        if (p.y < -margin) p.y = H + margin;
        if (p.y > H + margin) p.y = -margin;
      });

      const blooms = particles.filter((p) => p.type === "bloom");
      const orbs = particles.filter((p) => p.type === "orb");
      const plankton = particles.filter((p) => p.type === "plankton");

      blooms.forEach((p) => drawParticle(p, t));
      orbs.forEach((p) => drawParticle(p, t));
      plankton.forEach((p) => drawParticle(p, t));

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", initParticles);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("click", onClickBurst);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchstart", onTouchStart);
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
