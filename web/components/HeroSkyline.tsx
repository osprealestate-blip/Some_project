/** Self-made hero artwork: a simple Dubai skyline drawn in SVG (no photo, no licence needed). Decorative only. */
export default function HeroSkyline({ className = "" }: { className?: string }) {
  const towers: [number, number, number][] = [
    [0, 70, 38], [40, 110, 30], [72, 85, 34], [110, 150, 26], [140, 95, 40], [184, 125, 30], [218, 80, 36],
    [262, 200, 22], [290, 120, 34], [330, 90, 30], [364, 140, 36], [404, 100, 28], [436, 170, 24], [464, 105, 38],
    [506, 80, 32], [542, 130, 30], [576, 95, 36], [616, 115, 28], [648, 75, 34], [686, 100, 30], [720, 60, 40],
  ];
  return (
    <svg viewBox="0 0 760 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={className}>
      <g fill="currentColor">
        {towers.map(([x, h, w]) => (
          <rect key={x} x={x} y={220 - h} width={w} height={h} rx="2" />
        ))}
        {/* a spire and a sail-like tower */}
        <polygon points="273,20 284,20 284,220 273,220" />
        <path d="M600 60 C640 80 640 150 600 220 L600 60 Z" />
      </g>
    </svg>
  );
}
