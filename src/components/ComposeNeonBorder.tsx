import { useEffect, useRef } from 'react';

// Draw two continuous trails in pixel space; SVG dash scaling can repeat on wide nodes.
export default function ComposeNeonBorder() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const context = element.getContext('2d');
    if (!context) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0, height = 0, perimeter = 0;
    let points: { x: number; y: number }[] = [];
    const started = performance.now();
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const r = 8, right = width - 1, bottom = height - 1;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${r + 1} 1 H${right - r} A${r} ${r} 0 0 1 ${right} ${r + 1} V${bottom - r} A${r} ${r} 0 0 1 ${right - r} ${bottom} H${r + 1} A${r} ${r} 0 0 1 1 ${bottom - r} V${r + 1} A${r} ${r} 0 0 1 ${r + 1} 1 Z`);
      perimeter = path.getTotalLength();
      points = Array.from({ length: Math.ceil(perimeter) }, (_, i) => path.getPointAtLength(i * perimeter / Math.ceil(perimeter)));
    };
    const point = (distance: number) => {
      const index = ((distance % perimeter + perimeter) % perimeter) / perimeter * points.length;
      const a = points[Math.floor(index)], b = points[(Math.floor(index) + 1) % points.length];
      const t = index % 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      if (points.length) {
        const travel = motion.matches ? 0 : (now - started) / 5500 * perimeter;
        const length = perimeter * .28;
        context.lineWidth = 2.2; context.lineCap = 'round';
        // The heads start at the upper corners and travel counterclockwise.
        for (const start of [0, width - 18]) {
          const head = start - travel;
          for (let i = 0; i < 100; i++) {
            const t = i / 100, blend = Math.min(1, t / .3);
            const a = point(head + length * (1 - t));
            const b = point(head + length * (1 - (i + 1) / 100));
            context.strokeStyle = `rgb(${255 - 117 * blend} ${255 - 29 * blend} 255)`;
            context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <canvas className="compose-neon-border" ref={canvas} aria-hidden="true" />;
}
