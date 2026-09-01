import Image from "next/image";

// The real Steadwell mark — circle, serif "S", sage + terracotta leaves —
// from the actual logo files Journey provided (public/brand/source/), not
// a hand-traced approximation. This is the light-background version (dark
// green ink, transparent background); see scripts/generate-icons.py for
// how it and the dark-background version (used for the PWA home-screen
// icons and favicon) were both cut from those source files.
//
// Sourced from public/ via a plain URL path with explicit width/height —
// the documented pattern for local images already in public/ (next/image's
// static-import form is for images imported from elsewhere in the project,
// not files already under public/). 208x196 is mark-on-light.png's native
// size; className controls the actual displayed size at each call site.
//
// Sits next to the "Steadwell" wordmark in both the Coach and client
// Portal headers (src/app/coach/layout.tsx, src/app/portal/layout.tsx) and
// above the wordmark on the landing page (src/app/page.tsx).
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <Image
      src="/brand/mark-on-light.png"
      alt=""
      width={208}
      height={196}
      className={`${className} object-contain`}
      priority
    />
  );
}
