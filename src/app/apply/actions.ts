"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, setClientCoach } from "@/lib/repo/clients";
import { createApplication } from "@/lib/repo/applications";
import { findDefaultCoach } from "@/lib/repo/users";
import { setClientStatus } from "@/lib/status";
import { sendPushToCoach } from "@/lib/webPush";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.email("Enter a valid email."),
  phone: z.string().min(7, "Enter a valid phone number."),
  city: z.string().min(1, "Enter your city."),
  state: z.string().min(2, "Select your state."),
  preferredContact: z.string().min(1),
  householdContext: z.string().min(1, "Let us know who's included."),
  currentSituation: z.string().min(1),
  householdIncomeStructure: z.string().min(1),
  incomeComplexityNotes: z.string().optional(),
  currentTools: z.string().min(1),
  reviewFrequency: z.string().optional(),
  organizationNotes: z.string().optional(),
  existingProfessionals: z.string().min(1),
  supportGapNotes: z.string().optional(),
  successDefinition: z.string().min(1, "Tell us what success looks like."),
  timeline: z.string().optional(),
  participationNotes: z.string().optional(),
  whyNow: z.string().optional(),
  anythingElse: z.string().optional(),
  // Field name kept as-is (renaming the underlying DB column is a bigger,
  // purely cosmetic migration for zero user-facing benefit) — as of the
  // post-legal-review Agreement/Terms, this now confirms the general
  // eligibility representation (18+, U.S. resident, legally competent —
  // Agreement §3.1 / Terms §2), not Texas residency specifically.
  txResidencyConfirmed: z.literal("on", {
    error: "You must confirm you meet the eligibility requirements to apply.",
  }),
});

export type ApplyFormState = { errors?: Record<string, string>; message?: string } | undefined;

export async function submitApplication(_state: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const raw = Object.fromEntries(formData.entries());
  const challengeAreas = formData.getAll("challengeAreas").map(String);
  const supportAreas = formData.getAll("supportAreas").map(String);
  const goals = [formData.get("goal1"), formData.get("goal2"), formData.get("goal3")]
    .map((g) => (g ? String(g).trim() : ""))
    .filter(Boolean);

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] = issue.message;
    }
    return { errors };
  }
  if (goals.length === 0) {
    return { errors: { goal1: "Enter at least one goal for the next 12 months." } };
  }
  if (challengeAreas.length === 0) {
    return { errors: { challengeAreas: "Select at least one area you'd like help with." } };
  }

  const data = parsed.data;

  const client = await createClient({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    city: data.city,
    state: data.state,
    preferredContact: data.preferredContact,
  });

  // Auto-assign to whichever coach the owner has flagged as default (Team
  // page) — a no-op (stays unassigned, owner can assign manually) before
  // any coach has been hired or flagged.
  const defaultCoach = await findDefaultCoach();
  if (defaultCoach) {
    await setClientCoach(client.id, defaultCoach.id);
  }

  await createApplication({
    clientId: client.id,
    householdContext: data.householdContext,
    currentSituation: data.currentSituation,
    householdIncomeStructure: data.householdIncomeStructure,
    incomeComplexityNotes: data.incomeComplexityNotes,
    challengeAreas,
    goalsNext12Months: goals,
    successDefinition: data.successDefinition,
    currentTools: data.currentTools,
    reviewFrequency: data.reviewFrequency,
    organizationNotes: data.organizationNotes,
    supportAreas,
    existingProfessionals: data.existingProfessionals,
    supportGapNotes: data.supportGapNotes,
    timeline: data.timeline,
    participationNotes: data.participationNotes,
    whyNow: data.whyNow,
    anythingElse: data.anythingElse,
    txResidencyConfirmed: true,
  });

  await setClientStatus(client.id, "in_review", "Application submitted");

  // "Coach: new application" push scope.
  await sendPushToCoach({
    title: "New application",
    body: `${data.fullName} just applied.`,
    url: `/coach/clients/${client.id}`,
  });

  redirect("/apply/thank-you");
}
