import { requireClient } from "@/lib/dal";
import { Card, PageHeader, Button, Field, TextArea, Select } from "@/components/ui";
import { ACCOUNTABILITY_TIERS, SUBSCRIPTION_STATUS_LABELS, MEETING_STATUS_LABELS } from "@/lib/enums";
import { findSubscriptionByClientId } from "@/lib/repo/subscriptions";
import { listMeetingsForClient } from "@/lib/repo/meetings";
import { STRIPE_CONFIGURED } from "@/lib/stripe";
import { findBookingLinkUrl } from "@/lib/repo/bookingLinks";
import { countMeetingRedemptionsThisMonth } from "@/lib/repo/meetingRedemptions";
import { chooseAccountabilityTier, changeTier, cancelSubscription, saveProgressNotes, redeemMeetingSlot } from "./actions";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AccountabilityPage(props: PageProps<"/portal/accountability">) {
  const user = await requireClient();
  const client = user.client;
  const { enrolled, test, changed, notesSaved, meetingCapReached, noBookingLink } = await props.searchParams;

  if (!client) {
    return (
      <div>
        <PageHeader title="Accountability" />
        <Card>
          <p className="text-sm text-brand-slate">No client record found for this account.</p>
        </Card>
      </div>
    );
  }

  const [subscription, meetings, bookingUrl] = await Promise.all([
    findSubscriptionByClientId(client.id),
    listMeetingsForClient(client.id),
    findBookingLinkUrl("accountability"),
  ]);
  const isActive = subscription?.status === "active";
  const currentTier = subscription ? ACCOUNTABILITY_TIERS.find((t) => t.id === subscription.tier) : undefined;
  // Meeting-redemption gate — Journey's ask: a client can only schedule as
  // many meetings a month as their package includes. Only meaningful for an
  // active subscription with a real tier; see redeemMeetingSlot (./actions.ts)
  // for the server-side re-check this UI gate mirrors.
  const redeemedThisMonth = isActive && currentTier ? await countMeetingRedemptionsThisMonth(client.id) : 0;
  const remainingMeetings = currentTier ? Math.max(0, currentTier.meetingsPerMonth - redeemedThisMonth) : 0;

  return (
    <div>
      <PageHeader
        title="Accountability"
        subtitle="Ongoing meetings and progress — optional, separate from your one-time Financial Foundation."
      />

      {enrolled === "1" && (
        <div className="mb-6 rounded-md bg-brand-sage/20 border border-brand-sage text-brand-dark text-sm px-4 py-3">
          {test === "1" && <strong>Test Mode — enrollment simulated, no real charge happened. </strong>}
          You&apos;re enrolled in Accountability.
        </div>
      )}
      {changed === "1" && (
        <div className="mb-6 rounded-md bg-brand-sage/20 border border-brand-sage text-brand-dark text-sm px-4 py-3">
          Your tier has been changed.
        </div>
      )}
      {notesSaved === "1" && (
        <div className="mb-6 rounded-md bg-brand-sage/20 border border-brand-sage text-brand-dark text-sm px-4 py-3">
          Your progress notes have been saved.
        </div>
      )}

      {!isActive && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Choose a Tier</h2>
          {!STRIPE_CONFIGURED && (
            <p className="text-xs text-brand-slate/60 mb-4">
              Stripe isn&apos;t configured yet on this deployment — enrolling will simulate a subscription
              instead of a real charge. See README &quot;Before this goes live.&quot;
            </p>
          )}
          <div className="grid sm:grid-cols-3 gap-4">
            {ACCOUNTABILITY_TIERS.map((tier) => (
              <div key={tier.id} className="border border-brand-pale rounded-lg p-4 flex flex-col">
                <h3 className="font-heading text-brand-dark mb-1">{tier.label}</h3>
                <p className="text-2xl font-semibold text-brand-dark mb-1">
                  {dollars(tier.priceCents)}
                  <span className="text-sm font-normal text-brand-slate">/mo</span>
                </p>
                <p className="text-xs text-brand-slate/70 mb-4">{tier.cadence}</p>
                <form action={chooseAccountabilityTier.bind(null, tier.id)} className="mt-auto">
                  <Button type="submit" className="w-full">
                    {STRIPE_CONFIGURED ? "Choose & Pay with Stripe" : "Choose (Test Mode)"}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isActive && subscription && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Your Tier</h2>
          <p className="text-sm text-brand-slate mb-1">
            <span className="font-medium text-brand-dark">{currentTier?.label ?? subscription.tier}</span>
            {currentTier && ` — ${dollars(currentTier.priceCents)}/mo · ${currentTier.cadence}`}
          </p>
          <p className="text-xs text-brand-slate/60 mb-4">
            Status: {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            {subscription.currentPeriodEnd && ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            {!subscription.stripeSubscriptionId && " (test mode)"}
          </p>

          <form action={changeTier} className="flex items-end gap-3 mb-4">
            <Field label="Change tier">
              <Select name="tierId" defaultValue={subscription.tier}>
                {ACCOUNTABILITY_TIERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {dollars(t.priceCents)}/mo
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              Change Tier
            </Button>
          </form>

          <form action={cancelSubscription}>
            <Button type="submit" variant="danger">
              Cancel Accountability
            </Button>
          </form>
          <p className="text-xs text-brand-slate/60 mt-2">
            Canceling ends your Accountability engagement immediately and starts the 30-day export/retention
            countdown — self-service, no Coach approval needed.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Meetings</h2>
        {meetings.length === 0 && <p className="text-sm text-brand-slate">No meetings recorded yet.</p>}
        <ul className="divide-y divide-brand-pale">
          {meetings.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-brand-dark">{m.type} Meeting</span>
                <span className="text-brand-slate">{MEETING_STATUS_LABELS[m.status]}</span>
              </div>
              <p className="text-xs text-brand-slate/70 mt-1">
                {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : "Not yet scheduled"}
                {m.nextMeetingDate && ` · next meeting ${new Date(m.nextMeetingDate).toLocaleDateString()}`}
              </p>
              {m.clientActionItems && (
                <p className="text-xs text-brand-slate/70 mt-1">Action items: {m.clientActionItems}</p>
              )}
              {m.type === "Accountability" && m.status === "scheduled" && (
                <form action={saveProgressNotes} className="mt-3">
                  <input type="hidden" name="meetingId" value={m.id} />
                  <Field
                    label="Your progress notes"
                    hint="What you've done since last time — wins, what's been hard, anything to cover. Coach sees this before the call."
                  >
                    <TextArea name="notes" rows={3} defaultValue={m.clientProgressNotes ?? ""} />
                  </Field>
                  <Button type="submit" variant="secondary" className="text-xs px-3 py-1 mt-2">
                    Save Notes
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <div className="text-xs text-brand-slate/60 mt-3 border-t border-brand-pale pt-3">
          {isActive && currentTier ? (
            <>
              {meetingCapReached === "1" && (
                <p className="text-red-700 mb-2">
                  You&apos;ve already used all {currentTier.meetingsPerMonth} of your {currentTier.label} meetings
                  this month.
                </p>
              )}
              {noBookingLink === "1" && (
                <p className="text-red-700 mb-2">
                  No booking link is configured yet — contact your coach directly to schedule.
                </p>
              )}
              {remainingMeetings > 0 ? (
                <>
                  <p className="mb-2">
                    {remainingMeetings} of {currentTier.meetingsPerMonth} {currentTier.label} meeting
                    {currentTier.meetingsPerMonth === 1 ? "" : "s"} remaining this month.
                  </p>
                  <form action={redeemMeetingSlot}>
                    <Button type="submit" variant="secondary">
                      Redeem &amp; Book a Meeting
                    </Button>
                  </form>
                </>
              ) : (
                <p>
                  You&apos;ve used all {currentTier.meetingsPerMonth} of your {currentTier.label} meetings this
                  month — more become available next month.
                </p>
              )}
            </>
          ) : bookingUrl ? (
            <>
              Book a meeting via{" "}
              <a className="underline" href={bookingUrl} target="_blank" rel="noreferrer">
                Coach&apos;s scheduling link
              </a>
              .
            </>
          ) : (
            "Meetings are booked through Coach's Google Calendar Appointment Schedule. The booking link isn't configured on this deployment yet."
          )}
        </div>
      </Card>
    </div>
  );
}
