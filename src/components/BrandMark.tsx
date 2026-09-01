// The Steadwell monogram — circle, serif "S", and two leaves (sage +
// terracotta) tucked under the ring — matching the brand guide's mark
// exactly, just as an inline SVG rather than a raster asset so it stays
// crisp at any size. Sits next to the "Steadwell" wordmark in both the
// Coach and client Portal headers (src/app/coach/layout.tsx,
// src/app/portal/layout.tsx); the same mark (rendered to PNG — see
// scripts/generate-icons.py) is also what the PWA home-screen icons and
// favicon use, so this is the one on-brand mark used everywhere.
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16,22 C11,25.5 5.5,24.5 3.5,19.5 C8.5,16.3 14,17.3 16,22 Z" fill="#7D9987" />
      <path d="M16,22 C21,25.5 26.5,24.5 28.5,19.5 C23.5,16.3 18,17.3 16,22 Z" fill="#D4B08C" />
      <circle cx="16" cy="14.5" r="9" fill="none" stroke="#1F3D34" strokeWidth="1.1" />
      <text
        x="16"
        y="19.2"
        textAnchor="middle"
        fontFamily="var(--font-heading), Georgia, serif"
        fontWeight="700"
        fontSize="13"
        fill="#1F3D34"
      >
        S
      </text>
    </svg>
  );
}
