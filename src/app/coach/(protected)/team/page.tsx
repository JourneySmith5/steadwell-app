import { requireOwner } from "@/lib/dal";
import { listCoachSideUsers } from "@/lib/repo/users";
import { listPendingCoachInvitations } from "@/lib/repo/coachInvitations";
import { Card, PageHeader, Field, TextInput, Button, ErrorText } from "@/components/ui";
import { inviteCoach, resendCoachInviteAction, setDefaultCoachAction, updateUserNameAction } from "./actions";

export default async function TeamPage(props: { searchParams: Promise<{ error?: string }> }) {
  await requireOwner();
  const [users, pendingInvites, { error }] = await Promise.all([
    listCoachSideUsers(),
    listPendingCoachInvitations(),
    props.searchParams,
  ]);

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Everyone who can log into the coach side. Invite a coach here — they set their own password and two-factor authentication, you never see or set it."
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Card className="mb-6 p-0 overflow-hidden">
        <ul className="divide-y divide-brand-pale">
          {users.map((u) => (
            <li key={u.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm text-brand-dark font-medium">{u.fullName ?? u.email}</p>
                  {u.fullName && <p className="text-xs text-brand-slate/60">{u.email}</p>}
                  <p className="text-xs text-brand-slate/60 uppercase tracking-wide mt-0.5">
                    {u.role === "owner" ? "Owner" : "Coach"}
                    {u.isDefaultCoach && " · Default Coach"}
                  </p>
                </div>
                {u.role === "coach" && !u.isDefaultCoach && (
                  <form action={setDefaultCoachAction.bind(null, u.id)}>
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Make Default Coach
                    </Button>
                  </form>
                )}
              </div>
              <form action={updateUserNameAction.bind(null, u.id)} className="flex items-center gap-2">
                <TextInput
                  name="fullName"
                  defaultValue={u.fullName ?? ""}
                  placeholder="Set a name — e.g. Jordan Lee"
                  className="text-sm max-w-xs"
                />
                <Button type="submit" variant="secondary" className="text-xs px-2 py-1 shrink-0">
                  {u.fullName ? "Update Name" : "Set Name"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      {pendingInvites.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Pending Invitations</h2>
          <ul className="divide-y divide-brand-pale">
            {pendingInvites.map((inv) => {
              const expired = new Date(inv.expiresAt) < new Date();
              return (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-brand-dark">
                      {inv.fullName} <span className="text-brand-slate/60">— {inv.email}</span>
                    </p>
                    <p className="text-xs text-brand-slate/60">
                      {expired ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                      {inv.resentCount > 0 && ` · Resent ${inv.resentCount}×`}
                    </p>
                  </div>
                  <form action={resendCoachInviteAction.bind(null, inv.id)}>
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Resend
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Invite a Coach</h2>
        <form action={inviteCoach} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Field label="Full name">
            <TextInput name="fullName" required placeholder="e.g. Jordan Lee" />
          </Field>
          <Field label="Email">
            <TextInput type="email" name="email" required placeholder="jordan@example.com" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">Send Invitation</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
