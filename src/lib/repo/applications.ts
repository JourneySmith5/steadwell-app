import { run, newId, nowIso, get } from "@/lib/db/client";

export interface ApplicationInput {
  clientId: string;
  householdContext: string;
  currentSituation: string;
  householdIncomeStructure: string;
  incomeComplexityNotes?: string;
  challengeAreas: string[];
  goalsNext12Months: string[];
  successDefinition: string;
  currentTools: string;
  reviewFrequency?: string;
  organizationNotes?: string;
  supportAreas: string[];
  existingProfessionals: string;
  supportGapNotes?: string;
  timeline?: string;
  participationNotes?: string;
  whyNow?: string;
  anythingElse?: string;
  txResidencyConfirmed: boolean;
}

export async function createApplication(input: ApplicationInput) {
  const id = newId();
  await run(
    `INSERT INTO applications (
      id, client_id, household_context, current_situation, household_income_structure,
      income_complexity_notes, challenge_areas, goals_next_12_months, success_definition,
      current_tools, review_frequency, organization_notes, support_areas, existing_professionals,
      support_gap_notes, timeline, participation_notes, why_now, anything_else,
      tx_residency_confirmed, submitted_at
    ) VALUES (
      $id, $clientId, $householdContext, $currentSituation, $householdIncomeStructure,
      $incomeComplexityNotes, $challengeAreas, $goalsNext12Months, $successDefinition,
      $currentTools, $reviewFrequency, $organizationNotes, $supportAreas, $existingProfessionals,
      $supportGapNotes, $timeline, $participationNotes, $whyNow, $anythingElse,
      $txResidencyConfirmed, $now
    )`,
    {
      $id: id,
      $clientId: input.clientId,
      $householdContext: input.householdContext,
      $currentSituation: input.currentSituation,
      $householdIncomeStructure: input.householdIncomeStructure,
      $incomeComplexityNotes: input.incomeComplexityNotes ?? null,
      $challengeAreas: JSON.stringify(input.challengeAreas),
      $goalsNext12Months: JSON.stringify(input.goalsNext12Months),
      $successDefinition: input.successDefinition,
      $currentTools: input.currentTools,
      $reviewFrequency: input.reviewFrequency ?? null,
      $organizationNotes: input.organizationNotes ?? null,
      $supportAreas: JSON.stringify(input.supportAreas),
      $existingProfessionals: input.existingProfessionals,
      $supportGapNotes: input.supportGapNotes ?? null,
      $timeline: input.timeline ?? null,
      $participationNotes: input.participationNotes ?? null,
      $whyNow: input.whyNow ?? null,
      $anythingElse: input.anythingElse ?? null,
      $txResidencyConfirmed: input.txResidencyConfirmed ? 1 : 0,
      $now: nowIso(),
    }
  );
  return id;
}

interface ApplicationDbRow {
  id: string;
  client_id: string;
  household_context: string;
  current_situation: string;
  household_income_structure: string;
  income_complexity_notes: string | null;
  challenge_areas: string;
  goals_next_12_months: string;
  success_definition: string;
  current_tools: string;
  review_frequency: string | null;
  organization_notes: string | null;
  support_areas: string;
  existing_professionals: string;
  support_gap_notes: string | null;
  timeline: string | null;
  participation_notes: string | null;
  why_now: string | null;
  anything_else: string | null;
  tx_residency_confirmed: number;
  submitted_at: string;
}

export async function findApplicationByClientId(clientId: string) {
  const row = await get<ApplicationDbRow>("SELECT * FROM applications WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  if (!row) return undefined;
  return {
    ...row,
    challengeAreas: JSON.parse(row.challenge_areas) as string[],
    goalsNext12Months: JSON.parse(row.goals_next_12_months) as string[],
    supportAreas: JSON.parse(row.support_areas) as string[],
    txResidencyConfirmed: !!row.tx_residency_confirmed,
  };
}
