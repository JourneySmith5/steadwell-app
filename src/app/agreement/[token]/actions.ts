"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findClientById } from "@/lib/repo/clients";
import { recordAgreementAcceptance } from "@/lib/repo/agreements";
import { setClientStatus } from "@/lib/status";
import { AGREEMENT_VERSION } from "@/lib/enums";

export type AcceptAgreementState = { message?: string } | undefined;

export async function acceptAgreement(
  token: string,
  _state: AcceptAgreementState,
  formData: FormData
): Promise<AcceptAgreementState> {
  const link = await findCheckoutLinkByToken(token);
  if (!link) return { message: "This link is invalid." };
  const client = await findClientById(link.clientId);
  if (!client) return { message: "This link is invalid." };
  if (client.status !== "approved" && client.status !== "payment_pending") {
    return { message: "This step has already been completed for this account." };
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const agreed = formData.get("agree") === "on";
  if (!fullName) return { message: "Enter your full legal name." };
  if (!agreed) return { message: "You must check the box to confirm you agree to the terms." };

  const hdrs = await headers();
  const ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await recordAgreementAcceptance({
    clientId: client.id,
    agreementVersion: AGREEMENT_VERSION,
    acceptedName: fullName,
    ipAddress,
  });

  if (client.status === "approved") {
    await setClientStatus(client.id, "payment_pending", "Client accepted engagement agreement");
  }

  redirect(`/agreement/${token}/checkout`);
}
