"use server";

import { redirect } from "next/navigation";
import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findClientById } from "@/lib/repo/clients";
import { startFoundationCheckout } from "@/lib/checkout";

export async function startCheckout(token: string, formData: FormData) {
  const link = await findCheckoutLinkByToken(token);
  if (!link) redirect(`/agreement/${token}`);
  const client = await findClientById(link.clientId);
  if (!client || client.status !== "payment_pending") redirect(`/agreement/${token}`);

  const discountCode = String(formData.get("code") || "").trim() || null;
  const result = await startFoundationCheckout(client, token, discountCode);

  if (result.mode === "stripe") {
    redirect(result.url);
  } else {
    redirect(`/agreement/${token}/checkout/confirm?paymentId=${result.paymentId}`);
  }
}
