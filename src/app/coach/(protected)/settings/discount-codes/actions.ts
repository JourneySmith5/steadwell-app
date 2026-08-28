"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { setDiscountCodeEnabled } from "@/lib/repo/discountCodes";

export async function toggleDiscountCode(id: string, enabled: boolean) {
  await requireCoach();
  await setDiscountCodeEnabled(id, enabled);
  redirect("/coach/settings/discount-codes");
}
