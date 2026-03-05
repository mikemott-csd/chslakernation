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

    const PLANKTON_COLORS = [
      ["rgba(0,229,255,A)", "rgba(0,229,255,1)"],
      ["rgba(0,255,200,A)", "rgba(0,255,200,1)"],
      ["rgba(64,196,255,A)", "rgba(64,196,255,1)"],
      ["rgba(0,200,230,A)", "rgba(0,200,230,1)"],
      ["rgba(100,240,255,A)", "rgba(100,240,255,1)"],
    ];
    const ORB_COLORS = [
      ["rgba(0,229,255,A)", "rgba(0,229,255,1)"],
      ["rgba(0,180,255,A)", "rgba(0,180,255,1)"],
      ["rgba(0,255,180,A)", "rgba(0,255,180,1)"],
      ["rgba(80,220,255,A)", "rgba(80,220,255,1)"],
    ];
    const BLOOM_COLORS = [
      ["rgba(0,240,255,A)", "rgba(0,240,255,1)"],
      ["rgba(0,200,255,A)", "rgba(0,200,255,1)"],
      ["rgba(120,255,255,A)", "rgba(120,255,255,1)"],
    ];

    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function makeParticle(type: Particle["type"]): Particle {
      const x = rand(0, W);
      const y = rand(0, H);
      if (type === "plankton") {
        const [fill, shadow] = PLANKTON_COLORS[Math.floor(Math.random() * PLANKTON_COLORS.length)];
        const alpha = rand(0.25, 0.65);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(0.8, 2.2),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(4, 10),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.003, 0.012),
          driftAmpX: rand(10, 35),
          driftAmpY: rand(8, 25),
          driftFreqX: rand(0.0003, 0.0008),
          driftFreqY: rand(0.0004, 0.001),
          type,
        };
      } else if (type === "orb") {
        const [fill, shadow] = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
        const alpha = rand(0.45, 0.85);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(2.5, 6),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(12, 28),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.008, 0.022),
          driftAmpX: rand(20, 60),
          driftAmpY: rand(15, 45),
          driftFreqX: rand(0.0002, 0.0006),
          driftFreqY: rand(0.0003, 0.0007),
          type,
        };
      } else {
        const [fill, shadow] = BLOOM_COLORS[Math.floor(Math.random() * BLOOM_COLORS.length)];
        const alpha = rand(0.55, 0.9);
        return {
          x, y, baseX: x, baseY: y,
          vx: 0, vy: 0,
          radius: rand(9, 18),
          color: fill.replace("A", String(alpha)),
          shadowColor: shadow,
          shadowBlur: rand(28, 60),
          alpha,
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(0.004, 0.01),
          driftAmpX: rand(30, 80),
          driftAmpY: rand(20, 60),
          driftFreqX: rand(0.00015, 0.0004),
          driftFreqY: rand(0.0002, 0.0005),
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
      for (let i = 0; i < 200; i++) particles.push(makeParticle("plankton"));
      for (let i = 0; i < 60; i++) particles.push(makeParticle("orb"));
      for (let i = 0; i < 15; i++) particles.push(makeParticle("bloom"));
    }

    initParticles();
    window.addEventListener("resize", initParticles);

    // Mouse state
    let mouseX = -9999;
    let mouseY = -9999;
    const REPULSE_RADIUS = 120;
    const REPULSE_STRENGTH = 3.5;
    const VEL_DAMP = 0.91;

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
      const BURST_R = 220;
      particles.forEach((p) => {
        const dx = p.x - bx;
        const dy = p.y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BURST_R && dist > 0) {
          const force = (1 - dist / BURST_R) * 9;
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
      const BURST_R = 220;
      particles.forEach((p) => {
        const dx = p.x - bx;
        const dy = p.y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BURST_R && dist > 0) {
          const force = (1 - dist / BURST_R) * 9;
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
      // Deep dark lake — radial gradient from dark center to near-black edges
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
      grad.addColorStop(0, "#001020");
      grad.addColorStop(0.5, "#000810");
      grad.addColorStop(1, "#000308");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function drawParticle(p: Particle, t: number) {
      // Pulse alpha via sine
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
      // Extra inner bright core for orbs and blooms
      if (p.type !== "plankton") {
        ctx.globalAlpha = drawAlpha * 0.5;
        ctx.fillStyle = "rgba(220,255,255,1)";
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

      // Update and draw particles
      particles.forEach((p) => {
        // Drift motion — smooth lissajous-like path
        const driftX = p.driftAmpX * Math.sin(t * p.driftFreqX * 60 + p.phase);
        const driftY = p.driftAmpY * Math.cos(t * p.driftFreqY * 60 + p.phase * 1.3);
        const targetX = p.baseX + driftX;
        const targetY = p.baseY + driftY;

        // Mouse repulsion
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPULSE_RADIUS && dist > 0) {
          const force = (1 - dist / REPULSE_RADIUS) * REPULSE_STRENGTH;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Spring back toward drift path
        p.vx += (targetX - p.x) * 0.008;
        p.vy += (targetY - p.y) * 0.008;

        // Dampen velocity
        p.vx *= VEL_DAMP;
        p.vy *= VEL_DAMP;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap at edges with margin
        const margin = 40;
        if (p.x < -margin) p.x = W + margin;
        if (p.x > W + margin) p.x = -margin;
        if (p.y < -margin) p.y = H + margin;
        if (p.y > H + margin) p.y = -margin;
      });

      // Draw in order: blooms (back) → orbs → plankton (front)
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
