import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { computeAllocationSummary } from "@/lib/planCalc";
import { listActionItems } from "@/lib/repo/actionItems";
import { ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABELS, PLAN_STATUS_LABELS } from "@/lib/enums";
import { Card, Field, TextInput, Select, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import { addActionItem, saveActionItem, removeActionItem, markReviewedAction, finalizePlanAction, presentPlanAction } from "./actions";

export default async function FinalizePage(props: PageProps<"/coach/clients/[id]/plan/finalize">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const [summary, actions] = await Promise.all([computeAllocationSummary(clientId), listActionItems(clientId)]);
  const balanced = summary.difference === 0;

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
              — adjust allocations on the Cash-Flow Allocation page before finalizing.
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          {client.planStatus === "draft" && (
            <form action={markReviewedAction.bind(null, clientId)}>
              <Button type="submit" variant="secondary">
                Mark Reviewed
              </Button>
            </form>
          )}
          {(client.planStatus === "draft" || client.planStatus === "reviewed") && (
            <form action={finalizePlanAction.bind(null, clientId)}>
              <Button type="submit" disabled={!balanced}>
                Finalize Plan
              </Button>
            </form>
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
