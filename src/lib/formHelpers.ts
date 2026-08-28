// Shared server-side input parsing for plain <form> submissions across
// Foundation Intake and the Plan Builder. Every one of those forms used to
// hand-roll the same two patterns inline — `Number.isFinite(x) ? x : 0` and
// `String(x || "").trim()` — with no ceiling on either. That's fine for a
// well-behaved browser, but it's not real server-side validation: a crafted
// request could still write an absurd number (a bill amount of 1e300) or an
// unbounded string (megabytes of "notes") straight into the database. These
// two helpers keep the exact same fallback behavior every call site already
// relied on (bad/missing input silently becomes the fallback, not an error —
// this is a save-as-you-go form, not a strict submission gate) while adding
// a sane ceiling. Every clamp is generous on purpose: nothing a real client
// would ever legitimately enter should ever hit it.
//
// This is a deliberately lightweight, mechanical hardening pass (build order
// step 14, "validation") — not a rewrite into a schema-validation library.
// zod is already used for the one form with real branching validation logic
// (the public application, src/app/apply/actions.ts); a fuller port of every
// Foundation Intake/Plan Builder form onto zod would be a reasonable next
// step but is more refactor than this pass needs.

const MAX_MONEY = 100_000_000; // $100M — a ceiling to catch garbage/overflow input, not a real limit.
const MAX_TEXT_LENGTH = 500; // generous for a name/label/single-line field.
const MAX_NOTES_LENGTH = 5000; // generous for a free-text notes/rationale field.

export function parseMoney(
  formData: FormData,
  name: string,
  opts: { fallback?: number; allowNegative?: boolean } = {}
): number {
  const fallback = opts.fallback ?? 0;
  const raw = Number(formData.get(name));
  if (!Number.isFinite(raw)) return fallback;
  const min = opts.allowNegative ? -MAX_MONEY : 0;
  return Math.min(Math.max(raw, min), MAX_MONEY);
}

// Same clamp as parseMoney, but for a field that's meaningfully optional
// (e.g. "variable income — high estimate") — missing/blank input stays
// null rather than silently becoming 0.
export function parseOptionalMoney(formData: FormData, name: string, opts: { allowNegative?: boolean } = {}): number | null {
  const v = formData.get(name);
  if (v === null || v === "") return null;
  const raw = Number(v);
  if (!Number.isFinite(raw)) return null;
  const min = opts.allowNegative ? -MAX_MONEY : 0;
  return Math.min(Math.max(raw, min), MAX_MONEY);
}

export function parseText(formData: FormData, name: string, opts: { maxLength?: number } = {}): string {
  const maxLength = opts.maxLength ?? MAX_TEXT_LENGTH;
  const raw = String(formData.get(name) ?? "").trim();
  return raw.slice(0, maxLength);
}

export function parseNotes(formData: FormData, name: string): string {
  return parseText(formData, name, { maxLength: MAX_NOTES_LENGTH });
}

export function parseOptionalNotes(formData: FormData, name: string): string | null {
  return parseOptionalText(formData, name, { maxLength: MAX_NOTES_LENGTH });
}

// Same trim-and-cap as parseText, but returns null instead of "" — the shape
// every "optional free-text" field in this codebase already used
// (`... || null` after trimming) so a cleared field stores NULL, not "".
export function parseOptionalText(formData: FormData, name: string, opts: { maxLength?: number } = {}): string | null {
  const value = parseText(formData, name, opts);
  return value || null;
}
