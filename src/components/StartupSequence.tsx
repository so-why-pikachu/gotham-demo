import { useEffect, useRef } from 'react';
import { BootSequence } from '../boot/boot';
import { bootMarkup } from '../boot/markup';
import '../boot/boot.css';

export default function StartupSequence({ onComplete }: { onComplete: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = stage.current!;
    element.innerHTML = bootMarkup;
    const sequence = new BootSequence(element);
    const resize = () => { element.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
    resize();
    window.addEventListener('resize', resize);
    let frame = 0;
    let cancelled = false;
    const started = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animate(now: number) {
      if (cancelled) return;
      // Original opening begins at footage 6.76s, after the black publisher card.
      const elapsed = (now - started) / 1000;
      const accessTime = elapsed + 1.76;
      // Access begins at app time 1.80; after 1.5s jump to the logo at 4.12.
      const openingTime = accessTime >= 3.30 ? accessTime + .82 : accessTime;
      // Keep processing visible for 2s (app time 6.24–8.24), then enter the scan.
      const time = reduced ? 20.5 : openingTime >= 8.24 ? openingTime + 6.24 : openingTime;
      sequence.update(time);
      if ((reduced && elapsed > 1.2) || time >= 21.92) { onComplete(); return; }
      frame = requestAnimationFrame(animate);
    }
    sequence.update(reduced ? 20.5 : 1.76);
    frame = requestAnimationFrame(animate);
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onComplete(); };
    window.addEventListener('keydown', keydown);
    return () => { cancelled = true; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); element.innerHTML = ''; };
  }, [onComplete]);
  return <div className="datarocks-startup" aria-label="DataRocks 系统启动">
    <div className="datarocks-boot-stage" ref={stage} aria-hidden="true" />
    <button className="datarocks-boot-skip" onClick={onComplete}>跳过开场 / SKIP ↗</button>
  </div>;
}
