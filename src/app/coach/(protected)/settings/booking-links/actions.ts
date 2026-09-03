"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { updateBookingLink, createBookingLink, deleteBookingLink, SYSTEM_BOOKING_LINK_KEYS } from "@/lib/repo/bookingLinks";
import { parseText, parseOptionalText } from "@/lib/formHelpers";

function path() {
  return "/coach/settings/booking-links";
}

export async function saveBookingLink(id: string, formData: FormData) {
  await requireOwner();
  const label = parseText(formData, "label");
  if (!label) redirect(path());
  const url = parseOptionalText(formData, "url", { maxLength: 2000 });
  await updateBookingLink(id, { label, url });
  redirect(path());
}

export async function addBookingLink(formData: FormData) {
  await requireOwner();
  const label = parseText(formData, "label");
  if (!label) redirect(path());
  const url = parseOptionalText(formData, "url", { maxLength: 2000 });
  await createBookingLink({ label, url });
  redirect(path());
}

// System keys (schema.sql's seed) are re-inserted on the next cold start if
// removed — see the ON CONFLICT DO NOTHING comment there — so deleting one
// here wouldn't actually stick. Blocked rather than letting Coach hit that
// confusing surprise.
export async function removeBookingLink(id: string, key: string) {
  await requireOwner();
  if ((SYSTEM_BOOKING_LINK_KEYS as readonly string[]).includes(key)) redirect(path());
  await deleteBookingLink(id);
  redirect(path());
}
