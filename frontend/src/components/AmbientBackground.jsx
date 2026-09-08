import { useEffect, useRef } from "react";

const NEON = ["#08CB00", "#43D8C9", "#FF0B55", "#9929EA", "#FFEB00", "#FF5F5F"];
const WORM_COUNT = 18;
const TRAIL_LENGTH = 110;
const SPEED = 1.5;
const TURN_RATE = 0.035;

function createWorm(w, h, color) {
  const x = Math.random() * w;
  const y = Math.random() * h;
  return {
    color,
    heading: Math.random() * Math.PI * 2,
    trail: Array.from({ length: TRAIL_LENGTH }, () => ({ x, y })),
  };
}

export default function AmbientBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let worms = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      worms = NEON.map((color) => createWorm(canvas.width, canvas.height, color)).concat(
        Array.from({ length: Math.max(0, WORM_COUNT - NEON.length) }, () =>
          createWorm(canvas.width, canvas.height, NEON[Math.floor(Math.random() * NEON.length)])
        )
      );
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const worm of worms) {
        worm.heading += (Math.random() - 0.5) * TURN_RATE;
        const head = worm.trail[0];
        let nx = head.x + Math.cos(worm.heading) * SPEED;
        let ny = head.y + Math.sin(worm.heading) * SPEED;

        const margin = 40;
        if (nx < -margin) nx = w + margin;
        if (nx > w + margin) nx = -margin;
        if (ny < -margin) ny = h + margin;
        if (ny > h + margin) ny = -margin;

        const wrapped = Math.abs(nx - head.x) > w / 2 || Math.abs(ny - head.y) > h / 2;
        worm.trail.unshift({ x: nx, y: ny });
        worm.trail.pop();
        if (wrapped) {
          for (let i = 1; i < worm.trail.length; i++) worm.trail[i] = { x: nx, y: ny };
        }

        const n = worm.trail.length;
        const segment = Math.floor(n / 4);

        for (let band = 0; band < 4; band++) {
          const start = band * segment;
          const end = band === 3 ? n - 1 : start + segment;
          const t = 1 - band / 4;
          ctx.strokeStyle = worm.color;
          ctx.globalAlpha = 0.08 + t * 0.32;
          ctx.lineWidth = 1.5 + t * 3.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = worm.color;
          ctx.shadowBlur = 6 + t * 8;
          ctx.beginPath();
          ctx.moveTo(worm.trail[start].x, worm.trail[start].y);
          for (let i = start + 1; i <= end; i++) {
            ctx.lineTo(worm.trail[i].x, worm.trail[i].y);
          }
          ctx.stroke();
        }

        ctx.globalAlpha = 0.85;
        ctx.shadowBlur = 14;
        ctx.fillStyle = worm.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-bg" aria-hidden="true" />;
}
