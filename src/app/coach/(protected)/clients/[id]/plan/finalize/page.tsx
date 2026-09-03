import Link from "next/link";
import { requireClientAccess } from "@/lib/dal";
import { computeAllocationSummary } from "@/lib/planCalc";
import { listActionItems } from "@/lib/repo/actionItems";
import { ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABELS, PLAN_STATUS_LABELS } from "@/lib/enums";
import { Card, Field, TextInput, TextArea, Select, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import { addActionItem, saveActionItem, removeActionItem, markReviewedAction, finalizePlanAction, presentPlanAction } from "./actions";

export default async function FinalizePage(props: PageProps<"/coach/clients/[id]/plan/finalize">) {
  const { id: clientId } = await props.params;
  const { client } = await requireClientAccess(clientId);

  const searchParams = await props.searchParams;
  const confirmOverride = searchParams.confirmOverride === "1";

  const [summary, actions] = await Promise.all([computeAllocationSummary(clientId), listActionItems(clientId)]);
  const balanced = summary.difference === 0;
  const canFinalize = client.planStatus === "draft" || client.planStatus === "reviewed";

  return (
    <div>
      <PlanBuilderHeader client={client} current="/finalize" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-2">Stage 7 — Finalize + First 30 Days</h2>
        <p className="text-sm text-brand-slate mb-4">
          Plan status: <span className="font-medium text-brand-dark">{PLAN_STATUS_LABELS[client.planStatus]}</span>. Balance check:{" "}
          <span className={balanced ? "text-brand-sage font-medium" : "text-brand-accent font-medium"}>
            {balanced ? "Balanced ($0 difference)" : `Not balanced — difference is ${money(summary.difference)}`}
          </span>
          {!balanced && (
            <span className="text-brand-slate">
              {" "}
              — normally adjust allocations on the Cash-Flow Allocation page before finalizing. Rare cases that
              genuinely can&apos;t reach $0 through budgeting alone (an outside recommendation — selling an asset,
              refinancing a loan) can be finalized anyway below.
            </span>
          )}
        </p>

        {client.planUnbalancedOverrideNote && (
          <p className="text-xs text-brand-accent bg-brand-accent/10 rounded-md px-3 py-2 mb-4">
            Finalized unbalanced — Coach&apos;s reason on record: &ldquo;{client.planUnbalancedOverrideNote}&rdquo;
          </p>
        )}

        {!balanced && canFinalize && confirmOverride && (
          <Card className="mb-4 border-brand-accent">
            <h3 className="text-sm font-medium text-brand-dark mb-2">Are you sure?</h3>
            <p className="text-sm text-brand-slate mb-3">
              This plan doesn&apos;t balance to $0 — the difference is {money(summary.difference)}. Explain why
              (e.g. the specific outside recommendation covering the gap) before finalizing anyway; this is kept on
              record.
            </p>
            <form action={finalizePlanAction.bind(null, clientId)}>
              <Field label="Reason" required>
                <TextArea name="overrideNote" rows={2} required placeholder="e.g. Recommending client sell the second vehicle to close a $412/mo gap — not budgeted into the monthly plan." />
              </Field>
              <div className="flex gap-3 mt-3">
                <Button type="submit" variant="danger">
                  Yes, Finalize Anyway
                </Button>
                <Link href={`/coach/clients/${clientId}/plan/finalize`}>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          {client.planStatus === "draft" && (
            <form action={markReviewedAction.bind(null, clientId)}>
              <Button type="submit" variant="secondary">
                Mark Reviewed
              </Button>
            </form>
          )}
          {canFinalize && balanced && (
            <form action={finalizePlanAction.bind(null, clientId)}>
              <Button type="submit">Finalize Plan</Button>
            </form>
          )}
          {canFinalize && !balanced && !confirmOverride && (
            <Link href={`/coach/clients/${clientId}/plan/finalize?confirmOverride=1`}>
              <Button type="button" variant="secondary">
                Finalize Anyway (unbalanced) →
              </Button>
            </Link>
          )}
          {client.planStatus === "finalized" && (
            <form action={presentPlanAction.bind(null, clientId)}>
              <Button type="submit">Present Plan to Client</Button>
            </form>
          )}
          {client.planStatus === "active" && (
            <p className="text-sm text-brand-sage font-medium">Presented to client — plan is active.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">First 30 Days</h2>
        <p className="text-sm text-brand-slate mb-4">Specific action items — these appear on the client-facing plan.</p>

        {actions.length === 0 && <p className="text-sm text-brand-slate/70 italic mb-4">No actions added yet.</p>}

        {actions.map((a) => (
          <div key={a.id} className="mb-3 pb-3 border-b border-brand-pale last:border-0">
            <form action={saveActionItem.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <input type="hidden" name="id" value={a.id} />
              <div className="sm:col-span-2">
                <Field label="Description">
                  <TextInput name="description" defaultValue={a.description} required />
                </Field>
              </div>
              <Field label="Amount" hint="Optional.">
                <TextInput type="number" step="0.01" name="amount" defaultValue={a.amount ?? undefined} />
              </Field>
              <Field label="Due date" hint="Optional.">
                <TextInput name="dueDate" defaultValue={a.dueDate ?? undefined} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={a.status}>
                  {ACTION_ITEM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ACTION_ITEM_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <div>
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </div>
            </form>
            <form action={removeActionItem.bind(null, clientId)} className="mt-2">
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit" variant="danger" className="text-xs px-2 py-1">
                Remove
              </Button>
            </form>
          </div>
        ))}

        <form action={addActionItem.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-2">
          <div className="sm:col-span-2">
            <Field label="Description">
              <TextInput name="description" required placeholder="e.g. Open a dedicated savings account" />
            </Field>
          </div>
          <Field label="Amount" hint="Optional.">
            <TextInput type="number" step="0.01" name="amount" />
          </Field>
          <Field label="Due date" hint="Optional.">
            <TextInput name="dueDate" />
          </Field>
          <div>
            <Button type="submit">Add Action</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
