import { getAgreementBlocks } from "@/lib/agreementContent";

// Shared rendering of the agreement content (§17) — used on the public
// /agreement/[token] page. Keep this dumb (no data fetching) so it can also
// back a future "view your signed agreement" page in the portal without
// change.
export function AgreementText() {
  const blocks = getAgreementBlocks();
  return (
    <div className="prose-agreement text-sm text-brand-slate space-y-3 max-h-[28rem] overflow-y-auto border border-brand-pale rounded-md p-4 bg-white">
      <p className="text-center font-heading text-lg text-brand-dark font-semibold">
        FINANCIAL COACHING SERVICES AGREEMENT
      </p>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="font-heading text-base text-brand-dark font-semibold pt-2">
              {block.text}
            </h3>
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
