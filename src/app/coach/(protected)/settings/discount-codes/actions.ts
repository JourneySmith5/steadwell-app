"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import {
  setDiscountCodeEnabled,
  createDiscountCode,
  updateDiscountCode,
  findDiscountCodeByCode,
} from "@/lib/repo/discountCodes";
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
  await requireCoach();
  await setDiscountCodeEnabled(id, enabled);
  redirect(PATH);
}

export async function addDiscountCode(formData: FormData) {
  await requireCoach();
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
  await requireCoach();
  const code = normalizeCode(parseText(formData, "code", { maxLength: 40 }));
  if (!code) fail("Enter a code.");
  const percentOff = parsePercentOff(formData);
  if (percentOff === null) fail("Percent off must be a number between 1 and 100.");

  const existing = await findDiscountCodeByCode(code, id);
  if (existing) fail(`${code} is already used by another code.`);

  await updateDiscountCode(id, { code, percentOff });
  redirect(PATH);
}
