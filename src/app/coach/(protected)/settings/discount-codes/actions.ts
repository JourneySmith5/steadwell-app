"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import {
  setDiscountCodeEnabled,
  createDiscountCode,
  updateDiscountCode,
  findDiscountCodeByCode,
  generateOneTimeCode as generateOneTimeCodeRow,
} from "@/lib/repo/discountCodes";
import { runBirthdayDiscountSweep } from "@/lib/birthdayDiscount";
import { parseText } from "@/lib/formHelpers";

const PATH = "/coach/settings/discount-codes";

function fail(message: string): never {
  redirect(PATH + "?error=" + encodeURIComponent(message));
}

// Codes are typed straight into a client's checkout — keep them uppercase
// and free of stray whitespace so "family90" and "FAMILY90 " aren't treated
// as different codes from what's shown here.
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function parsePercentOff(formData: FormData): number | null {
  const raw = Number(formData.get("percentOff"));
  if (!Number.isFinite(raw)) return null;
  const rounded = Math.round(raw);
  if (rounded < 1 || rounded > 100) return null;
  return rounded;
}

export async function toggleDiscountCode(id: string, enabled: boolean) {
  await requireOwner();
  await setDiscountCodeEnabled(id, enabled);
  redirect(PATH);
}

export async function addDiscountCode(formData: FormData) {
  await requireOwner();
  const code = normalizeCode(parseText(formData, "code", { maxLength: 40 }));
  if (!code) fail("Enter a code.");
  const percentOff = parsePercentOff(formData);
  if (percentOff === null) fail("Percent off must be a number between 1 and 100.");

  const existing = await findDiscountCodeByCode(code);
  if (existing) fail(`${code} already exists — edit it below instead of adding it again.`);

  await createDiscountCode({ code, percentOff });
  redirect(PATH);
}

export async function saveDiscountCode(id: string, formData: FormData) {
  await requireOwner();
  const code = normalizeCode(parseText(formData, "code", { maxLength: 40 }));
  if (!code) fail("Enter a code.");
  const percentOff = parsePercentOff(formData);
  if (percentOff === null) fail("Percent off must be a number between 1 and 100.");

  const existing = await findDiscountCodeByCode(code, id);
  if (existing) fail(`${code} is already used by another code.`);

  await updateDiscountCode(id, { code, percentOff });
  redirect(PATH);
}

// Spawns a fresh single-use code from a template (FAMILY90, FRIENDS50,
// CHARITY100 — see ONE_TIME_TEMPLATE_CODES on the page) — the replacement
// for toggling the shared code on/off around one specific person's use.
// No form fields: baseCode/percentOff come from the template row itself,
// bound in on the page, so there's nothing for Coach to mistype.
export async function generateOneTimeCode(baseCode: string, percentOff: number) {
  await requireOwner();
  await generateOneTimeCodeRow(baseCode, percentOff);
  redirect(PATH);
}

// The general-purpose version of generateOneTimeCode above — Coach picks
// both the base name and the percent off herself instead of being limited
// to the three preset templates (FAMILY90/FRIENDS50/CHARITY100). Same
// underlying repo function; this is just a second entry point into it that
// doesn't require a template row to exist first, for "I want to hand
// someone a one-off code right now" that doesn't fit any existing template.
export async function generateCustomOneTimeCode(formData: FormData) {
  await requireOwner();
  const baseCode = normalizeCode(parseText(formData, "baseCode", { maxLength: 30 }));
  if (!baseCode) fail("Enter a name for the code (e.g. VIP, HOLIDAY).");
  if (!/^[A-Z0-9]+$/.test(baseCode)) fail("Code names can only contain letters and numbers, no spaces or symbols.");
  const percentOff = parsePercentOff(formData);
  if (percentOff === null) fail("Percent off must be a number between 1 and 100.");

  await generateOneTimeCodeRow(baseCode, percentOff);
  redirect(PATH);
}

// Manual trigger for the same daily sweep /api/cron/offboarding-sweep runs
// — lets Coach see BIRTHDAY20 actually get applied to an active
// Accountability subscription without waiting on the real schedule (same
// "Run Now" pattern as Offboarding's sweep button).
export async function runBirthdaySweepNow() {
  await requireOwner();
  await runBirthdayDiscountSweep();
  redirect(PATH);
}
