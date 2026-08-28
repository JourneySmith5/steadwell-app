"use server";

import { redirect } from "next/navigation";
import { fulfillFoundationPayment } from "@/lib/checkout";

// Test-mode-only path — see /agreement/[token]/checkout/page.tsx and
// src/lib/checkout.ts. Calls the exact same fulfillment function the real
// Stripe webhook calls, so nothing downstream needs to know or care which
// path a given payment came through.
export async function completeTestPayment(token: string, paymentId: string) {
  await fulfillFoundationPayment(paymentId);
  redirect(`/agreement/${token}/checkout/success`);
}
