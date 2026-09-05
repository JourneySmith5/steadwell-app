"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyFormState } from "./actions";
import { Field, TextInput, TextArea, Select, Button, ErrorText, PageHeader, Card } from "@/components/ui";
import {
  CURRENT_SITUATION_OPTIONS,
  HOUSEHOLD_INCOME_STRUCTURE_OPTIONS,
  SUPPORT_AREA_OPTIONS,
  CURRENT_TOOLS_OPTIONS,
  EXISTING_PROFESSIONALS_OPTIONS,
  US_STATES,
} from "@/lib/enums";

export default function ApplyPage() {
  const [state, formAction, pending] = useActionState<ApplyFormState, FormData>(submitApplication, undefined);
  const errors = state?.errors ?? {};

  return (
    <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
      <PageHeader
        title="Apply to Work Together"
        subtitle="About 10–15 minutes. This helps us figure out if we're a good fit — no statements or account details needed yet."
      />
      <form action={formAction}>
        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Contact</h2>
          <Field label="Full name" required>
            <TextInput name="fullName" required />
            <ErrorText>{errors.fullName}</ErrorText>
          </Field>
          <Field label="Email" required>
            <TextInput type="email" name="email" required />
            <ErrorText>{errors.email}</ErrorText>
          </Field>
          <Field label="Phone" required>
            <TextInput type="tel" name="phone" required />
            <ErrorText>{errors.phone}</ErrorText>
          </Field>
          <Field label="City" required>
            <TextInput name="city" required />
            <ErrorText>{errors.city}</ErrorText>
          </Field>
          <Field label="State" required>
            <Select name="state" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <ErrorText>{errors.state}</ErrorText>
          </Field>
          <Field label="Preferred communication" required>
            <Select name="preferredContact" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Text">Text</option>
            </Select>
          </Field>
          <label className="flex items-start gap-2 text-sm text-brand-slate mt-4">
            <input type="checkbox" name="txResidencyConfirmed" className="mt-1" />
            <span>
              I confirm I am at least 18 years old, a resident of a U.S. state or territory, and legally
              competent to enter into a binding agreement.
            </span>
          </label>
          <ErrorText>{errors.txResidencyConfirmed}</ErrorText>
          <p className="text-xs text-brand-slate/60 mt-3">
            See our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
              Terms of Service
            </a>
            .
          </p>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Your Household</h2>
          <Field label="Who is financially included in the plan?" required hint="High-level context only.">
            <TextArea name="householdContext" rows={2} required />
            <ErrorText>{errors.householdContext}</ErrorText>
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Current Picture</h2>
          <Field label="Which best describes your current situation?" required>
            <Select name="currentSituation" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {CURRENT_SITUATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <ErrorText>{errors.currentSituation}</ErrorText>
          </Field>
          <Field label="Household income structure" required>
            <Select name="householdIncomeStructure" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {HOUSEHOLD_INCOME_STRUCTURE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <ErrorText>{errors.householdIncomeStructure}</ErrorText>
          </Field>
          <Field label="Anything else about your income worth knowing?" hint="Approximate only — exact numbers aren't needed yet.">
            <TextArea name="incomeComplexityNotes" rows={2} />
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Challenges</h2>
          <Field label="What areas do you most want help improving?" required>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORT_AREA_OPTIONS.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm text-brand-slate">
                  <input type="checkbox" name="challengeAreas" value={o} />
                  {o}
                </label>
              ))}
            </div>
            <ErrorText>{errors.challengeAreas}</ErrorText>
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Goals</h2>
          <Field label="Top financial goals for the next 12 months" required hint="Up to three.">
            <TextInput name="goal1" placeholder="Goal 1" className="mb-2" />
            <TextInput name="goal2" placeholder="Goal 2 (optional)" className="mb-2" />
            <TextInput name="goal3" placeholder="Goal 3 (optional)" />
            <ErrorText>{errors.goal1}</ErrorText>
          </Field>
          <Field label="What would success look like?" required>
            <TextArea name="successDefinition" rows={2} required />
            <ErrorText>{errors.successDefinition}</ErrorText>
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Current System</h2>
          <Field label="What do you currently use to manage money?" required>
            <Select name="currentTools" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {CURRENT_TOOLS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <ErrorText>{errors.currentTools}</ErrorText>
          </Field>
          <Field label="How often do you review your finances?">
            <TextInput name="reviewFrequency" placeholder="e.g. Weekly, Monthly, Rarely" />
          </Field>
          <Field label="Anything else about how you currently stay organized?">
            <TextArea name="organizationNotes" rows={2} />
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Support</h2>
          <Field label="Do you already work with any financial professionals?" required>
            <Select name="existingProfessionals" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {EXISTING_PROFESSIONALS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <ErrorText>{errors.existingProfessionals}</ErrorText>
          </Field>
          <Field label="What's missing from that support, if anything?">
            <TextArea name="supportGapNotes" rows={2} />
          </Field>
        </Card>

        <Card className="mb-6">
          <h2 className="font-heading text-xl text-brand-dark mb-4">Readiness</h2>
          <Field label="What's your timeline?">
            <TextInput name="timeline" placeholder="e.g. Ready now, within a month, just exploring" />
          </Field>
          <Field label="Anything about your availability/participation Coach should know?">
            <TextArea name="participationNotes" rows={2} />
          </Field>
          <Field label="Why now?">
            <TextArea name="whyNow" rows={2} />
          </Field>
          <Field label="Anything else Coach should know?">
            <TextArea name="anythingElse" rows={2} />
          </Field>
        </Card>

        {state?.message && <ErrorText>{state.message}</ErrorText>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Submit Application"}
        </Button>
      </form>
    </main>
  );
}
