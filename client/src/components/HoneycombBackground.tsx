import { useEffect, useRef } from "react";

export default function HoneycombBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const hexSize = 42;
    const hexW = hexSize * 1.5;
    const hexH = Math.sqrt(3) * hexSize;

    function drawHex(x: number, y: number, phase: number) {
      const pulse = 0.25 + 0.18 * Math.sin(phase + time * 0.6);
      const glow = 6 + 4 * Math.sin(phase + time * 0.4);

      const grad = ctx!.createLinearGradient(x - hexSize, y - hexSize, x + hexSize, y + hexSize);
      grad.addColorStop(0, `rgba(0, 160, 255, ${pulse})`);
      grad.addColorStop(0.5, `rgba(0, 230, 180, ${pulse * 1.1})`);
      grad.addColorStop(1, `rgba(0, 255, 120, ${pulse * 0.9})`);

      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + hexSize * Math.cos(angle);
        const py = y + hexSize * Math.sin(angle);
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();

      ctx!.shadowBlur = glow;
      ctx!.shadowColor = "rgba(0, 210, 255, 0.7)";
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 1;
      ctx!.stroke();
    }

    let monsterX = -250;
    let monsterDir = 1;
    const monsterSpeed = 0.7;

    function drawMonster(mx: number, waterY: number, t: number) {
      const bob = Math.sin(t * 1.1) * 5;
      const baseY = waterY - 4 + bob;

      ctx!.save();
      if (monsterDir < 0) {
        ctx!.translate(mx, 0);
        ctx!.scale(-1, 1);
        ctx!.translate(-mx, 0);
      }

      ctx!.shadowBlur = 18;
      ctx!.shadowColor = "rgba(0, 255, 150, 0.9)";

      const bodyColor = "rgba(0, 170, 100, 0.92)";
      const glowColor = "rgba(0, 255, 160, 0.7)";

      const humps = [
        { x: mx - 70, ry: 20, rx: 28 },
        { x: mx, ry: 28, rx: 36 },
        { x: mx + 72, ry: 22, rx: 30 },
      ];

      humps.forEach(({ x, ry, rx }) => {
        ctx!.beginPath();
        ctx!.ellipse(x, baseY - ry * 0.3, rx, ry, 0, Math.PI, 0);
        ctx!.fillStyle = bodyColor;
        ctx!.fill();
        ctx!.strokeStyle = glowColor;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      });

      const neckX = mx + 108;
      const neckBaseY = baseY + 8;
      const neckTipX = mx + 122;
      const neckTipY = baseY - 65;

      ctx!.beginPath();
      ctx!.moveTo(neckX - 8, neckBaseY);
      ctx!.bezierCurveTo(neckX - 4, neckBaseY - 30, neckTipX - 10, neckTipY + 20, neckTipX, neckTipY);
      ctx!.bezierCurveTo(neckTipX + 8, neckTipY + 20, neckX + 6, neckBaseY - 30, neckX + 6, neckBaseY);
      ctx!.closePath();
      ctx!.fillStyle = bodyColor;
      ctx!.fill();
      ctx!.strokeStyle = glowColor;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.ellipse(neckTipX + 10, neckTipY - 4, 16, 11, Math.PI / 6, 0, Math.PI * 2);
      ctx!.fillStyle = bodyColor;
      ctx!.fill();
      ctx!.strokeStyle = glowColor;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.arc(neckTipX + 20, neckTipY - 8, 4, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(0, 255, 220, 1)";
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = "rgba(0, 255, 200, 1)";
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(neckTipX + 21, neckTipY - 8, 2, 0, Math.PI * 2);
      ctx!.fillStyle = "#000";
      ctx!.shadowBlur = 0;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(neckTipX + 26, neckTipY - 2);
      ctx!.lineTo(neckTipX + 32, neckTipY - 1);
      ctx!.lineTo(neckTipX + 26, neckTipY + 2);
      ctx!.fillStyle = bodyColor;
      ctx!.fill();

      ctx!.restore();
    }

    function drawWater(t: number): number {
      const w = canvas!.width;
      const h = canvas!.height;
      const waterY = h * 0.65;

      ctx!.shadowBlur = 0;

      for (let layer = 0; layer < 4; layer++) {
        const alpha = 0.07 - layer * 0.012;
        const speed = 0.45 + layer * 0.25;
        const amp = 14 - layer * 2.5;
        const yOff = layer * 25;
        const freq1 = 0.009 + layer * 0.002;
        const freq2 = 0.016 + layer * 0.003;

        ctx!.beginPath();
        ctx!.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y =
            waterY +
            yOff +
            amp * Math.sin(x * freq1 + t * speed) +
            amp * 0.5 * Math.sin(x * freq2 + t * speed * 1.4 + 1.2);
          ctx!.lineTo(x, y);
        }
        ctx!.lineTo(w, h);
        ctx!.closePath();

        const wg = ctx!.createLinearGradient(0, waterY, 0, h);
        wg.addColorStop(0, `rgba(0, 120, 220, ${alpha * 3.5})`);
        wg.addColorStop(0.4, `rgba(0, 160, 190, ${alpha * 2})`);
        wg.addColorStop(1, `rgba(0, 60, 100, ${alpha})`);
        ctx!.fillStyle = wg;
        ctx!.fill();

        ctx!.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y =
            waterY +
            yOff +
            amp * Math.sin(x * freq1 + t * speed) +
            amp * 0.5 * Math.sin(x * freq2 + t * speed * 1.4 + 1.2);
          x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
        }

        ctx!.shadowBlur = layer === 0 ? 12 : 5;
        ctx!.shadowColor =
          layer === 0
            ? "rgba(0, 210, 255, 0.6)"
            : "rgba(0, 255, 160, 0.25)";
        ctx!.strokeStyle =
          layer === 0
            ? `rgba(0, 210, 255, 0.55)`
            : `rgba(0, 255, 150, 0.2)`;
        ctx!.lineWidth = layer === 0 ? 1.5 : 0.8;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }

      return waterY;
    }

    const animate = () => {
      time += 0.016;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);
      ctx!.shadowBlur = 0;

      const cols = Math.ceil(w / hexW) + 3;
      const rows = Math.ceil(h / hexH) + 3;

      for (let col = -1; col < cols; col++) {
        for (let row = -1; row < rows; row++) {
          const x = col * hexW;
          const y = row * hexH + (col % 2 !== 0 ? hexH / 2 : 0);
          const phase = col * 0.4 + row * 0.7;
          drawHex(x, y, phase);
        }
      }

      ctx!.shadowBlur = 0;

      const waterY = drawWater(time);

      monsterX += monsterSpeed * monsterDir;
      if (monsterX > w + 280) monsterDir = -1;
      if (monsterX < -280) monsterDir = 1;

      drawMonster(monsterX, waterY, time);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
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
