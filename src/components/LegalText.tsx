import type { AgreementBlock } from "@/lib/agreementContent";

// Generic renderer for a full-page legal document (Privacy Policy, Terms
// of Service) — same block shape and rendering rules as AgreementText.tsx
// (used for the in-flow agreement-acceptance step), but laid out as a
// full, non-scrolling page rather than a scrollable review box, since
// these are stand-alone pages someone can land on directly.
export function LegalText({ title, blocks }: { title: string; blocks: AgreementBlock[] }) {
  return (
    <div className="prose-agreement text-sm text-brand-slate space-y-3 max-w-2xl mx-auto">
      <p className="text-center font-heading text-2xl text-brand-dark font-semibold mb-2">{title}</p>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} className="font-heading text-lg text-brand-dark font-semibold pt-4">
              {block.text}
            </h2>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className={block.emphasis ? "font-semibold text-brand-dark" : undefined}>
              {block.text}
            </p>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <span className="font-semibold text-brand-dark">{block.label}: </span>
            {block.value}
          </p>
        );
      })}
    </div>
  );
}
