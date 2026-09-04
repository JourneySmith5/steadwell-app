// End-to-end smoke test against a running `npm run start` server on
// BASE_URL. Drives the real UI with Playwright (not just curl) since the
// forms use client-side React (useActionState) — this is the same path a
// real browser takes. Run with: npx tsx scripts/smoke.ts

import { chromium, type Page } from "playwright";
import * as OTPAuth from "otpauth";
import { findUserByEmail } from "../src/lib/repo/users";
import { findClientById } from "../src/lib/repo/clients";
import { findOffboardingByClientId } from "../src/lib/repo/offboarding";
import { listEmailsForClient } from "../src/lib/repo/emails";
import { listFinancialAccounts } from "../src/lib/repo/financialAccounts";
import { run as dbRun } from "../src/lib/db/client";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const COACH_EMAIL = process.env.SEED_COACH_EMAIL ?? "coach@steadwellcoaching.com";
const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD;

if (!COACH_PASSWORD) {
  console.error("Set SEED_COACH_PASSWORD to the password printed by `npm run seed`.");
  process.exit(1);
}

// A same-URL server-action redirect (Coach clicks a button, the action
// redirects back to the exact page it was submitted from) can have
// `waitForLoadState("networkidle")` resolve a beat before React actually
// finishes patching the DOM with the post-redirect data — the underlying
// network activity is done, but the render isn't. Reading body text right
// after can catch the pre-click DOM. Polling for the expected text is a more
// reliable signal than any fixed wait. See README's documented gotchas for
// the sibling issue this one comes from (waitForURL resolving too early on
// the same pattern).
async function waitForBodyText(page: Page, expected: string, timeoutMs = 5000): Promise<string> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    last = await page.locator("body").innerText();
    if (last.includes(expected)) return last;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for body text "${expected}". Last seen:\n${last}`);
}

function codeFromSecret(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "Steadwell",
    label: "smoke-test",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.generate();
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const applicantPage = await browser.newPage();
  for (const p of [applicantPage]) {
    p.on("console", (msg) => console.log(`  [console:${msg.type()}]`, msg.text()));
    p.on("pageerror", (err) => console.log("  [pageerror]", err.message));
  }

  // 1. Submit public application
  console.log("1. Submitting application...");
  await applicantPage.goto(`${BASE_URL}/apply`);
  await applicantPage.fill('input[name="fullName"]', "Jamie Rivera");
  await applicantPage.fill('input[name="email"]', "jamie.rivera@example.com");
  await applicantPage.fill('input[name="phone"]', "512-555-0100");
  await applicantPage.fill('input[name="city"]', "Austin");
  await applicantPage.selectOption('select[name="preferredContact"]', "Email");
  await applicantPage.check('input[name="txResidencyConfirmed"]');
  await applicantPage.fill('textarea[name="householdContext"]', "Just me.");
  await applicantPage.selectOption('select[name="currentSituation"]', "Living paycheck to paycheck");
  await applicantPage.selectOption('select[name="householdIncomeStructure"]', "One consistent income");
  await applicantPage.check('input[name="challengeAreas"][value="Debt"]');
  await applicantPage.fill('input[name="goal1"]', "Pay off credit card debt");
  await applicantPage.fill('textarea[name="successDefinition"]', "No more credit card balance.");
  await applicantPage.selectOption('select[name="currentTools"]', "Spreadsheet");
  await applicantPage.selectOption('select[name="existingProfessionals"]', "None");
  await applicantPage.click('button[type="submit"]');
  await applicantPage.waitForURL("**/apply/thank-you");
  console.log("   OK — application submitted, landed on thank-you page.");

  // 2. Coach logs in
  console.log("2. Coach login...");
  const coachPage = await browser.newPage();
  coachPage.on("console", (msg) => console.log(`  [console:${msg.type()}]`, msg.text()));
  coachPage.on("pageerror", (err) => console.log("  [pageerror]", err.message));
  coachPage.on("response", (res) => {
    if (res.status() >= 400) console.log("  [http]", res.status(), res.url());
  });
  await coachPage.goto(`${BASE_URL}/login`);
  await coachPage.fill('input[name="email"]', COACH_EMAIL);
  await coachPage.fill('input[name="password"]', COACH_PASSWORD!);
  await coachPage.click('button[type="submit"]');
  await coachPage.waitForURL("**/coach/account/setup-2fa");

  // 3. Coach completes 2FA setup
  console.log("3. Coach 2FA setup...");
  const coachSecret = await coachPage.locator("code").innerText({ timeout: 15000 });
  await coachPage.fill('input[name="token"]', codeFromSecret(coachSecret));
  // NOTE: the protected-area header also has a "Sign out" button with
  // type="submit" — a bare `button[type="submit"]` selector matches that
  // one first (it's earlier in the DOM) and silently logs the test out
  // instead of confirming 2FA. Scope to the button's own text.
  await coachPage.click('button:has-text("Confirm & Enable")');
  await coachPage.waitForURL("**/coach");
  console.log("   OK — coach reached dashboard.");

  // 4. Coach reviews and approves the application
  console.log("4. Coach approves application...");
  await coachPage.goto(`${BASE_URL}/coach/clients`);
  await coachPage.click("text=Jamie Rivera");
  await coachPage.waitForURL(/\/coach\/clients\/.+/);
  const clientUrl = coachPage.url();
  const clientId = clientUrl.split("/").pop()!;
  await coachPage.click('button:has-text("Approve")');
  await coachPage.waitForURL(/\/email\//);
  const approvalBody = await coachPage.locator("textarea[name='body']").inputValue();
  const agreementUrlMatch = approvalBody.match(/http:\/\/\S+\/agreement\/\S+/);
  if (!agreementUrlMatch) throw new Error("Could not find agreement URL in approval email body: " + approvalBody);
  const agreementUrl = agreementUrlMatch[0];
  await coachPage.click('button:has-text("Send")');
  await coachPage.waitForURL(clientUrl);
  console.log("   OK — approval email drafted and sent. Agreement URL:", agreementUrl);

  // 5. Coach adds and enables a discount code (§9 — new codes start
  // disabled) so the checkout step below can exercise real discount-code
  // math, not just the full-price path. Uses the ordinary "Add a New
  // Code" form (not the "One-time code" checkbox) — this exercises the
  // reusable-code path a real seasonal promo would take, which is also
  // the only kind of manually-typed code left now that FAMILY90/
  // FRIENDS50/CHARITY100 are retired (see schema.sql).
  console.log("5. Coach adds and enables SMOKE50 discount code...");
  await coachPage.goto(`${BASE_URL}/coach/settings/discount-codes`);
  const addCodeForm = coachPage.locator('form:has(button:has-text("Add Code"))');
  await addCodeForm.locator('input[name="code"]').fill("SMOKE50");
  await addCodeForm.locator('input[name="percentOff"]').fill("50");
  await addCodeForm.getByRole("button", { name: "Add Code" }).click();
  await coachPage.waitForLoadState("networkidle");
  await coachPage
    .locator("li", { hasText: "SMOKE50" })
    .getByRole("button", { name: "Enable" })
    .click();
  await coachPage.waitForLoadState("networkidle");
  // NOTE: the status label is styled `uppercase` in CSS, and Playwright's
  // innerText() reflects the rendered (CSS-transformed) text, not the raw
  // DOM text — so this reads "ENABLED", not "Enabled". Match case-insensitively.
  const discountPageText = await coachPage.locator("body").innerText();
  if (!/SMOKE50[\s\S]*Enabled/i.test(discountPageText)) {
    console.log("   DEBUG discount page body:", discountPageText);
    throw new Error("SMOKE50 did not show as Enabled after toggling");
  }
  console.log("   OK — SMOKE50 added and enabled.");

  // 6. Client (not yet an account holder) reviews and accepts the agreement,
  // then pays. Real Stripe isn't configured in this environment, so this
  // exercises the clearly-labeled test-mode path — see src/lib/checkout.ts.
  console.log("6. Client accepts agreement and pays (test mode)...");
  const prospectPage = await browser.newPage();
  await prospectPage.goto(agreementUrl);
  await prospectPage.fill('input[name="fullName"]', "Jamie Rivera");
  await prospectPage.check('input[name="agree"]');
  await prospectPage.click('button:has-text("Accept & Continue to Payment")');
  await prospectPage.waitForURL(/\/agreement\/.+\/checkout$/);

  await prospectPage.fill('input[name="code"]', "SMOKE50");
  await prospectPage.click('button:has-text("Apply")');
  await prospectPage.waitForURL(/code=SMOKE50/);
  const checkoutText = await prospectPage.locator("body").innerText();
  if (!checkoutText.includes("$199.50")) throw new Error("Discounted total ($199.50) not shown on checkout page:\n" + checkoutText);
  console.log("   OK — SMOKE50 correctly discounted $399.00 to $199.50.");

  await prospectPage.click('button:has-text("Continue (Test Mode)")');
  await prospectPage.waitForURL(/\/checkout\/confirm/);
  const confirmText = await prospectPage.locator("body").innerText();
  if (!confirmText.includes("$199.50")) throw new Error("Confirm page didn't show the discounted amount:\n" + confirmText);
  await prospectPage.click('button:has-text("Complete Test Payment")');
  await prospectPage.waitForURL(/\/checkout\/success/);
  const successText = await prospectPage.locator("body").innerText();
  if (!successText.includes("Payment Received")) throw new Error("Success page didn't confirm payment:\n" + successText);
  console.log("   OK — test payment completed, client landed on the success page.");

  // 7. Coach reviews and sends the (now real, payment-triggered) account
  // invitation email — still never auto-sent (§21).
  console.log("7. Coach sends account invitation email...");
  await coachPage.goto(clientUrl);
  await coachPage.click("text=Set up your Steadwell account");
  await coachPage.waitForURL(/\/email\//);
  const emailBody = await coachPage.locator("textarea[name='body']").inputValue();
  const inviteUrlMatch = emailBody.match(/http:\/\/\S+\/invite\/\S+/);
  if (!inviteUrlMatch) throw new Error("Could not find invite URL in email body: " + emailBody);
  const inviteUrl = inviteUrlMatch[0];
  await coachPage.click('button:has-text("Send")');
  await coachPage.waitForLoadState("networkidle");
  console.log("   OK — invitation email sent. Invite URL:", inviteUrl);

  // 7a. Attention Queue (§11, build order step 14) — backdate this
  // invitation's expiry into the "expiring soon" window and confirm it
  // surfaces on the Coach Dashboard. Backdating (not waiting) since real
  // time can't be fast-forwarded — same technique the Offboarding sweeps
  // use below. The client hasn't accepted yet, so this doesn't disturb step 8.
  console.log("7a. Checking the Attention Queue surfaces an expiring invitation...");
  await dbRun("UPDATE invitations SET expires_at = $expiresAt WHERE client_id = $clientId", {
    $expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    $clientId: clientId,
  });
  await coachPage.goto(`${BASE_URL}/coach`);
  const attentionAfterInvite = await coachPage.locator("body").innerText();
  // The section heading is styled `uppercase` in CSS — innerText() reflects
  // the rendered (CSS-transformed) text, not raw DOM text (same documented
  // gotcha as the discount-code status label above) — match case-insensitively.
  if (!/incomplete account invitation/i.test(attentionAfterInvite)) {
    throw new Error("Attention Queue didn't show the Incomplete Account Invitation section:\n" + attentionAfterInvite);
  }
  if (!attentionAfterInvite.includes("Jamie Rivera")) {
    throw new Error("Attention Queue's Incomplete Account Invitation section didn't list the client:\n" + attentionAfterInvite);
  }
  console.log("   OK — Attention Queue surfaced the soon-to-expire invitation.");

  // 8. Client accepts invite, sets password
  console.log("8. Client accepts invite...");
  const clientPage = await browser.newPage();
  await clientPage.goto(inviteUrl);
  await clientPage.fill('input[name="password"]', "Str0ng!Pass");
  await clientPage.fill('input[name="confirmPassword"]', "Str0ng!Pass");
  await clientPage.click('button[type="submit"]');
  await clientPage.waitForURL("**/verify-email/pending");
  console.log("   OK — account created, landed on verify-email pending.");

  // 9. Client verifies email. The pending page's inline dev-mode "Verify
  // now" link is deliberately hidden when NODE_ENV === "production" (as it
  // is here, under `npm run start`) so a real deployment never exposes raw
  // verification tokens in the UI — that's correct app behavior, not a bug.
  // In place of that link (and in place of a real inbox), read the token
  // straight from the DB, exactly as a real email would have carried it.
  console.log("9. Client verifies email...");
  const clientUser = await findUserByEmail("jamie.rivera@example.com");
  if (!clientUser?.emailVerifyToken) throw new Error("No emailVerifyToken found for client user");
  await clientPage.goto(`${BASE_URL}/verify-email/${clientUser.emailVerifyToken}`);
  await clientPage.click("text=Continue");
  await clientPage.waitForURL("**/portal/account/setup-2fa");
  console.log("   OK — email verified, landed on 2FA setup.");

  // 10. Client completes 2FA setup
  console.log("10. Client 2FA setup...");
  const clientSecret = await clientPage.locator("code").innerText();
  await clientPage.fill('input[name="token"]', codeFromSecret(clientSecret));
  await clientPage.click('button:has-text("Confirm & Enable")');
  await clientPage.waitForURL("**/portal");
  const portalText = await clientPage.locator("body").innerText();
  if (!portalText.includes("Jamie Rivera")) throw new Error("Portal home doesn't greet Jamie Rivera");
  if (!portalText.includes("Foundation Intake")) throw new Error("Client status did not advance to Foundation Intake");
  console.log("   OK — client reached portal, status is Foundation Intake.");

  // 11. Client fills out Foundation Intake (§4) and submits it. Exercises
  // the submission-lock validation (at least one Goal is required), the
  // real per-section forms across every section except Statements (an
  // explicit stub — needs external blob storage, see README), the
  // read-only lock after submission, and the "Request an Update" unlock.
  console.log("11. Client fills out and submits Foundation Intake...");
  await clientPage.goto(`${BASE_URL}/portal/foundation`);

  // 11a. Submitting with zero goals should be rejected with a clear error.
  await clientPage.click('button:has-text("Submit Foundation Intake")');
  await clientPage.waitForLoadState("networkidle");
  const earlySubmitText = await clientPage.locator("body").innerText();
  if (!earlySubmitText.includes("Add at least one Financial Goal")) {
    throw new Error("Submitting with no goals did not show the required-goal error:\n" + earlySubmitText);
  }
  console.log("   OK — submit correctly blocked with zero Goals.");

  // 11b. Household
  await clientPage.goto(`${BASE_URL}/portal/foundation/household`);
  await clientPage.fill('input[name="name"]', "Jamie Rivera");
  await clientPage.selectOption('select[name="relationship"]', "Self");
  await clientPage.click('button:has-text("Add Member")');
  await clientPage.waitForLoadState("networkidle");

  // 11c. Income
  await clientPage.goto(`${BASE_URL}/portal/foundation/income`);
  await clientPage.fill('input[name="person"]', "Jamie");
  await clientPage.fill('input[name="sourceName"]', "Main job");
  await clientPage.selectOption('select[name="type"]', "Employment");
  await clientPage.selectOption('select[name="frequency"]', "Biweekly");
  await clientPage.fill('input[name="takeHome"]', "1800");
  await clientPage.click('button:has-text("Add Source")');
  await clientPage.waitForLoadState("networkidle");
  const incomeText = await clientPage.locator("body").innerText();
  if (!incomeText.includes("Normalized: $3900.00/mo")) {
    throw new Error("Biweekly $1800 income did not normalize to $3900.00/mo:\n" + incomeText);
  }
  console.log("   OK — income normalization math correct (biweekly $1800 -> $3900.00/mo).");

  // 11d. Accounts
  await clientPage.goto(`${BASE_URL}/portal/foundation/accounts`);
  await clientPage.fill('input[name="nickname"]', "Main Checking");
  await clientPage.selectOption('select[name="type"]', "Checking");
  await clientPage.fill('input[name="currentBalance"]', "500");
  await clientPage.click('button:has-text("Add Account")');
  await clientPage.waitForLoadState("networkidle");

  // 11e. Regular Bills
  await clientPage.goto(`${BASE_URL}/portal/foundation/bills`);
  await clientPage.fill('input[name="name"]', "Rent");
  await clientPage.fill('input[name="amount"]', "1200");
  await clientPage.selectOption('select[name="frequency"]', "Monthly");
  await clientPage.selectOption('select[name="fixedOrVariable"]', "Fixed");
  await clientPage.click('button:has-text("Add Bill")');
  await clientPage.waitForLoadState("networkidle");

  // 11f. Debt — deliberately left empty. §4: zero debts is a real answer,
  // not "incomplete" — the page should say so rather than blocking anything.
  await clientPage.goto(`${BASE_URL}/portal/foundation/debts`);
  const debtsText = await clientPage.locator("body").innerText();
  if (!debtsText.includes("that's a real answer")) {
    throw new Error("Debts page did not treat zero debts as a valid, complete answer:\n" + debtsText);
  }

  // 11g. Emergency Fund (single upsert record)
  await clientPage.goto(`${BASE_URL}/portal/foundation/emergency-fund`);
  await clientPage.fill('input[name="currentBalance"]', "200");
  await clientPage.fill('input[name="target"]', "3000");
  await clientPage.click('button:has-text("Save")');
  await clientPage.waitForLoadState("networkidle");

  // 11h. Savings
  await clientPage.goto(`${BASE_URL}/portal/foundation/savings`);
  await clientPage.fill('input[name="name"]', "Car fund");
  await clientPage.fill('input[name="currentBalance"]', "150");
  await clientPage.click('button:has-text("Add Savings")');
  await clientPage.waitForLoadState("networkidle");

  // 11i. Sinking Funds
  await clientPage.goto(`${BASE_URL}/portal/foundation/sinking-funds`);
  await clientPage.fill('input[name="name"]', "Holidays");
  await clientPage.fill('input[name="targetAmount"]', "600");
  await clientPage.fill('input[name="currentBalance"]', "0");
  await clientPage.click('button:has-text("Add Sinking Fund")');
  await clientPage.waitForLoadState("networkidle");

  // 11j. Goals — required before submission
  await clientPage.goto(`${BASE_URL}/portal/foundation/goals`);
  await clientPage.fill('input[name="name"]', "Pay off credit card debt");
  await clientPage.fill('input[name="target"]', "0");
  await clientPage.fill('input[name="currentAmount"]', "0");
  await clientPage.click('button:has-text("Add Goal")');
  await clientPage.waitForLoadState("networkidle");

  // 11k. Now submission should succeed.
  await clientPage.goto(`${BASE_URL}/portal/foundation`);
  await clientPage.click('button:has-text("Submit Foundation Intake")');
  await clientPage.waitForLoadState("networkidle");
  const submittedText = await clientPage.locator("body").innerText();
  if (!submittedText.includes("Submitted")) throw new Error("Hub page didn't show Submitted state:\n" + submittedText);
  console.log("   OK — Foundation Intake submitted with all sections filled in.");

  // 11l. Sections should now be read-only.
  await clientPage.goto(`${BASE_URL}/portal/foundation/household`);
  const lockedHouseholdText = await clientPage.locator("body").innerText();
  if (!lockedHouseholdText.includes("read-only")) throw new Error("Household section didn't show as read-only after submission");
  const nameInputDisabled = await clientPage.locator('input[name="name"]').first().isDisabled();
  if (!nameInputDisabled) throw new Error("Household form fields were still editable after submission");
  console.log("   OK — sections are read-only after submission.");

  // 11m. Request an Update reopens everything for editing, then re-submit
  // to leave the record in the more realistic end state. Both clicks are
  // same-URL Server Action redirects — an explicit goto() between them (the
  // same fix used throughout Plan Builder below) guarantees a fully fresh
  // DOM before the second click, rather than trusting waitForLoadState
  // alone (see README, "Two bugs this smoke test caught").
  const foundationHubUrl = `${BASE_URL}/portal/foundation`;
  await clientPage.goto(foundationHubUrl);
  await clientPage.click('button:has-text("Request an Update")');
  await clientPage.waitForLoadState("networkidle");
  await clientPage.goto(foundationHubUrl);
  const reopenedText = await clientPage.locator("body").innerText();
  if (reopenedText.includes("read-only")) throw new Error("Foundation Intake still showed as locked after Request an Update");

  // Attention Queue (§11) — the record is reopened-after-a-prior-submission
  // right now, exactly the state "Correction Requested" is meant to catch.
  await coachPage.goto(`${BASE_URL}/coach`);
  const attentionAfterReopen = await coachPage.locator("body").innerText();
  if (!/correction requested/i.test(attentionAfterReopen) || !attentionAfterReopen.includes("Jamie Rivera")) {
    throw new Error("Attention Queue didn't show the reopened intake under Correction Requested:\n" + attentionAfterReopen);
  }
  console.log("   OK — Attention Queue surfaced the reopened Foundation Intake as Correction Requested.");

  await clientPage.click('button:has-text("Submit Foundation Intake")');
  await waitForBodyText(clientPage, "Submitted");
  console.log("   OK — Request an Update reopened the record; re-submitted.");

  // 11n. Coach should see the submitted status on the client's page too.
  await coachPage.goto(clientUrl);
  const coachViewText = await coachPage.locator("body").innerText();
  if (!/Foundation Intake.*Submitted/i.test(coachViewText)) {
    throw new Error("Coach client page did not reflect Foundation Intake — Submitted status:\n" + coachViewText);
  }
  console.log("   OK — Coach sees Foundation Intake — Submitted.");

  // Attention Queue (§11) — freshly (re-)submitted, not yet in Plan Build.
  await coachPage.goto(`${BASE_URL}/coach`);
  const attentionAfterSubmit = await coachPage.locator("body").innerText();
  if (!/ready for plan build/i.test(attentionAfterSubmit) || !attentionAfterSubmit.includes("Jamie Rivera")) {
    throw new Error("Attention Queue didn't show the client under Ready for Plan Build:\n" + attentionAfterSubmit);
  }
  console.log("   OK — Attention Queue surfaced the client as Ready for Plan Build.");

  // 12. Coach builds and presents a real plan (§5-§8) — Financial Baseline,
  // Cash-Flow Allocation, Debt Strategy, Savings & Goals, Stress Test, then
  // Finalize + Present. The numbers below are chosen to land the balance
  // check (§6) exactly on $0: income $3900 - bills $1200 - debt minimums $0
  // - historical spending $200 = $2500 available; allocated as
  // groceries $600 + Emergency Fund $300 + Holidays sinking fund $100 +
  // debt $0 (none entered) + the one Goal $1500 = $2500 planned, so
  // difference = $0 and Finalize unlocks.
  console.log("12. Coach builds and presents the Plan (§5-§8)...");
  await coachPage.goto(`${BASE_URL}/coach/clients/${clientId}`);
  await coachPage.click('a:has-text("Open Plan Builder")');
  await coachPage.waitForURL(/\/plan$/);
  const baselineText = await coachPage.locator("body").innerText();
  if (!baselineText.includes("Available Monthly Cash Flow")) throw new Error("Plan Builder baseline page didn't render");

  await coachPage.fill('input[name="historicalSpendingMonthly"]', "200");
  await coachPage.fill('textarea[name="generalRationale"]', "Priority is building the emergency fund while paying off the Holidays sinking fund.");
  await coachPage.click('button:has-text("Save")');
  await coachPage.waitForLoadState("networkidle");
  const baselineAfter = await coachPage.locator("body").innerText();
  if (!baselineAfter.includes("$2,500.00")) throw new Error("Available Monthly Cash Flow didn't compute to $2,500.00:\n" + baselineAfter);
  console.log("   OK — baseline computed Available Monthly Cash Flow = $2,500.00.");

  const allocationUrl = `${BASE_URL}/coach/clients/${clientId}/plan/allocation`;
  // NOTE: this page has several forms sharing the same field names
  // ("plannedAmount" appears on the Add Category, Emergency Fund, and every
  // Sinking Fund form) — a bare selector would hit multiple elements and
  // Playwright's strict mode would refuse to guess, so every fill below is
  // scoped to its specific form. Each save also re-navigates with a fresh
  // `goto` rather than trusting `waitForLoadState("networkidle")` to mean
  // "React has finished patching the DOM with the post-redirect data" — on
  // this page networkidle can resolve a beat before that finishes, and a
  // locator re-resolving mid-swap can end up acting on a stale, about-to-be-
  // replaced input, silently submitting its unfilled default value.
  await coachPage.goto(allocationUrl);
  const addCategoryForm = coachPage.locator("form", { has: coachPage.getByRole("button", { name: "Add Category" }) });
  await addCategoryForm.locator('input[name="category"]').fill("Groceries");
  await addCategoryForm.locator('input[name="plannedAmount"]').fill("600");
  await addCategoryForm.getByRole("button", { name: "Add Category" }).click();
  await coachPage.waitForLoadState("networkidle");

  await coachPage.goto(allocationUrl);
  const efForm = coachPage.locator("form", { hasText: "Planned monthly amount" }).first();
  await efForm.locator('input[name="plannedAmount"]').fill("300");
  await efForm.getByRole("button", { name: "Save" }).click();
  await coachPage.waitForLoadState("networkidle");

  await coachPage.goto(allocationUrl);
  const sinkingForm = coachPage.locator("form", { hasText: "Holidays" });
  await sinkingForm.locator('input[name="plannedAmount"]').fill("100");
  await sinkingForm.getByRole("button", { name: "Save" }).click();
  await coachPage.waitForLoadState("networkidle");

  await coachPage.goto(`${BASE_URL}/coach/clients/${clientId}/plan/goals`);
  await coachPage.fill('input[name="plannedMonthly"]', "1500");
  await coachPage.click('button:has-text("Save")');
  await coachPage.waitForLoadState("networkidle");

  await coachPage.goto(`${BASE_URL}/coach/clients/${clientId}/plan/debts`);
  const planDebtsText = await coachPage.locator("body").innerText();
  if (!planDebtsText.includes("No debts entered")) throw new Error("Debt Strategy page should show no debts:\n" + planDebtsText);

  await coachPage.goto(`${BASE_URL}/coach/clients/${clientId}/plan/stress-test`);
  await coachPage.check('input[name="exclude"]');
  await coachPage.click('button:has-text("Recalculate")');
  await coachPage.waitForLoadState("networkidle");
  const stressText = await coachPage.locator("body").innerText();
  // NOTE: the stat label is CSS `uppercase` (same gotcha as the discount-code
  // status label — see README) — innerText() reflects "SHORTFALL", not the
  // DOM's actual "Shortfall". Match case-insensitively.
  if (!/Shortfall/i.test(stressText)) throw new Error("Stress test didn't show a shortfall after excluding the only income source:\n" + stressText);
  console.log("   OK — stress test correctly shows a shortfall with income excluded.");

  await coachPage.goto(`${BASE_URL}/coach/clients/${clientId}/plan/finalize`);
  const finalizeText = await coachPage.locator("body").innerText();
  if (!finalizeText.includes("Balanced ($0 difference)")) throw new Error("Allocation balance check isn't $0:\n" + finalizeText);
  console.log("   OK — Cash-Flow Allocation balance check is exactly $0.");

  await coachPage.fill('input[name="description"]', "Open a dedicated high-yield savings account for the Emergency Fund");
  await coachPage.click('button:has-text("Add Action")');
  await coachPage.waitForLoadState("networkidle");

  await coachPage.click('button:has-text("Mark Reviewed")');
  await waitForBodyText(coachPage, "Plan status: Reviewed");
  await coachPage.click('button:has-text("Finalize Plan")');
  await waitForBodyText(coachPage, "Plan status: Finalized");

  await coachPage.click('button:has-text("Present Plan to Client")');
  await waitForBodyText(coachPage, "Plan Active");
  console.log("   OK — plan built, finalized, and presented to the client.");

  // 13. Client sees the decision screen — immediately either choose
  // Accountability or decline (no grace period). This run exercises the
  // "choose Accountability" branch end to end below (steps 14-19); the
  // "No thanks" button and its Graduated/offboarding path are unchanged
  // pre-existing code, spot-checked here for presence rather than re-run.
  console.log("13. Client reaches the Accountability decision screen...");
  await clientPage.goto(`${BASE_URL}/portal/plan`);
  const planText = await clientPage.locator("body").innerText();
  if (!planText.includes("Accountability")) throw new Error("Plan page did not show the Accountability decision screen");
  if (!planText.includes("No thanks")) throw new Error("Plan page is missing the decline-Accountability option");
  // The real client-facing plan (§8) should be showing above the decision
  // screen — spot-check a few real numbers, not just static copy.
  if (!planText.includes("Your Starting Point")) throw new Error("Plan page didn't render Your Starting Point:\n" + planText);
  if (!planText.includes("Groceries")) throw new Error("Plan page didn't render the Groceries allocation:\n" + planText);
  if (!planText.includes("Financial Goals")) throw new Error("Plan page didn't render Financial Goals:\n" + planText);
  if (!planText.includes("$2,500.00")) throw new Error("Plan page didn't render the $2,500.00 total planned outflow:\n" + planText);
  if (!planText.includes("Open a dedicated high-yield savings account")) throw new Error("Plan page didn't render the First 30 Days action:\n" + planText);
  console.log("   OK — real client-facing plan content renders correctly.");

  const pdfResponse = await clientPage.request.get(`${BASE_URL}/portal/plan/pdf`);
  if (!pdfResponse.ok()) throw new Error(`Plan PDF download failed: ${pdfResponse.status()}`);
  const pdfBytes = await pdfResponse.body();
  if (!pdfBytes.slice(0, 4).toString("ascii").includes("PDF")) throw new Error("Plan PDF response doesn't look like a PDF");
  console.log(`   OK — plan PDF downloads correctly (${pdfBytes.length} bytes).`);

  // 14. Client enrolls in Accountability (§9) instead of declining — test
  // mode, since STRIPE_SECRET_KEY isn't set for this smoke run. Exercises
  // the self-service tier-choice flow and status transition to
  // accountability_active.
  console.log("14. Client enrolls in Accountability (test mode)...");
  await clientPage.goto(`${BASE_URL}/portal/accountability`);
  // Three tier cards render the same button label in test mode — the first
  // one on the page is the Monthly tier (ACCOUNTABILITY_TIERS is ordered
  // Monthly/Momentum/Intensive — see src/lib/enums.ts).
  await clientPage.locator('button:has-text("Choose (Test Mode)")').first().click();
  await clientPage.waitForURL(/\/portal\/accountability\?enrolled=1&test=1/);
  const enrolledText = await waitForBodyText(clientPage, "Steady Accountability");
  if (!enrolledText.includes("Test Mode")) throw new Error("Accountability page didn't show the Test Mode enrollment banner:\n" + enrolledText);
  console.log("   OK — enrolled in Steady Accountability, status advanced to Accountability Active.");

  // 15. Coach logs a meeting (§1a, §11) — Google Calendar handles the actual
  // booking; this just records what happened.
  console.log("15. Coach logs a meeting...");
  const meetingsPageUrl = `${BASE_URL}/coach/clients/${clientId}/meetings`;
  await coachPage.goto(meetingsPageUrl);
  await coachPage.selectOption('select[name="type"]', "Accountability");
  await coachPage.fill('textarea[name="coachNotes"]', "Reviewed spending against plan — on track.");
  await coachPage.fill('textarea[name="clientActionItems"]', "Track grocery spending weekly.");
  await coachPage.click('button:has-text("Log Meeting")');
  await coachPage.waitForLoadState("networkidle");
  // A textarea's value is a form-control property, not text content —
  // body.innerText() never includes it (unlike the plain <p> the client
  // sees it through below), so read it back via inputValue() instead. A
  // full goto() first sidesteps the same-URL-redirect staleness class of
  // bug documented in the README ("Two bugs this smoke test caught").
  await coachPage.goto(meetingsPageUrl);
  const loggedActionItems = await coachPage.locator('textarea[name="clientActionItems"]').last().inputValue();
  if (loggedActionItems !== "Track grocery spending weekly.") {
    throw new Error(`Meeting's client action items didn't save correctly, got: "${loggedActionItems}"`);
  }
  console.log("   OK — meeting logged.");

  // 16. Client sees the meeting's client-facing fields — action items yes,
  // Coach's private notes never.
  console.log("16. Client sees meeting history on Accountability page...");
  await clientPage.goto(`${BASE_URL}/portal/accountability`);
  const meetingsSeenByClient = await clientPage.locator("body").innerText();
  if (!meetingsSeenByClient.includes("Track grocery spending weekly.")) {
    throw new Error("Client's Accountability page didn't show the meeting's client action items:\n" + meetingsSeenByClient);
  }
  if (meetingsSeenByClient.includes("Reviewed spending against plan")) {
    throw new Error("Client's Accountability page leaked Coach's private meeting notes:\n" + meetingsSeenByClient);
  }
  console.log("   OK — client sees action items, not Coach's private notes.");

  // 17. Client changes tier (self-service, no Coach approval — §9).
  console.log("17. Client changes Accountability tier...");
  await clientPage.goto(`${BASE_URL}/portal/accountability`);
  await clientPage.selectOption('select[name="tierId"]', "momentum");
  await clientPage.click('button:has-text("Change Tier")');
  await waitForBodyText(clientPage, "Momentum Accountability");
  console.log("   OK — tier changed to Momentum Accountability.");

  // 18. Billing page reflects both the one-time Foundation fee and the
  // active Accountability subscription.
  console.log("18. Client checks Billing page...");
  await clientPage.goto(`${BASE_URL}/portal/billing`);
  const billingText = await clientPage.locator("body").innerText();
  if (!billingText.includes("Momentum Accountability")) throw new Error("Billing page didn't reflect the Momentum tier:\n" + billingText);
  if (!billingText.includes("Financial Foundation")) throw new Error("Billing page didn't show the Foundation payment:\n" + billingText);
  console.log("   OK — Billing page shows both the Foundation payment and the active subscription.");

  // 19. Client cancels Accountability (self-service) — a second, distinct
  // Offboarding trigger from the one exercised in the Foundation-only path
  // (declining at plan presentation goes straight to Graduated; this one
  // goes through Canceled) — both should land on the same 30-day countdown
  // logic (§16).
  console.log("19. Client cancels Accountability...");
  await clientPage.goto(`${BASE_URL}/portal/accountability`);
  await clientPage.click('button:has-text("Cancel Accountability")');
  await clientPage.waitForURL("**/portal/account");
  const acctText = await waitForBodyText(clientPage, "days");
  if (!/\d+\s+days?/.test(acctText)) throw new Error("Account page did not show a days-remaining countdown after canceling:\n" + acctText);
  console.log("   OK — client canceled, deletion countdown showing:", acctText.match(/\d+\s+days?[^.]*\./)?.[0] ?? "(see body)");

  // 20. Offboarding reminder sweep (§16, §21) — real time can't be
  // fast-forwarded in a live test, so backdate this client's offboarding
  // record directly in the DB (same in-process sqlite access pattern
  // findUserByEmail above already uses) to make a reminder due, then drive
  // the Coach Dashboard's "Run Sweep Now" button — the same code path
  // scripts/offboarding-sweep.ts would hit on a real schedule. Auto-sends,
  // no draft/review step (§21) — unlike every other email in this app.
  console.log("20. Backdating offboarding record and running the reminder sweep...");
  const offboardingBefore = await findOffboardingByClientId(clientId);
  if (!offboardingBefore) throw new Error("Expected an offboarding record after cancellation, found none.");
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const twentyDaysOut = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun("UPDATE offboardings SET triggered_at = $t, deletion_due_at = $d WHERE client_id = $c", {
    $t: eightDaysAgo,
    $d: twentyDaysOut,
    $c: clientId,
  });
  const emailsBeforeSweep = (await listEmailsForClient(clientId)).length;
  await coachPage.goto(`${BASE_URL}/coach`);
  await coachPage.click('button:has-text("Run Sweep Now")');
  await coachPage.waitForLoadState("networkidle");
  const offboardingAfterReminder = await findOffboardingByClientId(clientId);
  if (!offboardingAfterReminder || offboardingAfterReminder.remindersSent !== 1) {
    throw new Error(`Expected remindersSent to be 1 after the sweep, got: ${offboardingAfterReminder?.remindersSent}`);
  }
  const emailsAfterSweep = await listEmailsForClient(clientId);
  if (emailsAfterSweep.length !== emailsBeforeSweep + 1) {
    throw new Error("Reminder sweep didn't create a new email log entry.");
  }
  const reminderEmail = emailsAfterSweep[0];
  if (reminderEmail.template !== "offboarding_reminder" || reminderEmail.status !== "sent") {
    throw new Error(`Reminder email logged incorrectly: template=${reminderEmail.template} status=${reminderEmail.status}`);
  }
  console.log("   OK — reminder sweep sent one email automatically (no draft/review step) and incremented remindersSent.");

  // 21. Client exports their data (§16, §18) — should stop further
  // reminders and produce a real PDF covering both the finalized plan and
  // the raw Foundation Intake data.
  console.log("21. Client exports their data...");
  const exportResponse = await clientPage.request.get(`${BASE_URL}/portal/export`);
  if (!exportResponse.ok()) throw new Error(`Export download failed: ${exportResponse.status()}`);
  const exportBytes = await exportResponse.body();
  if (!exportBytes.slice(0, 4).toString("ascii").includes("PDF")) throw new Error("Export response doesn't look like a PDF");
  await clientPage.goto(`${BASE_URL}/portal/account`);
  await waitForBodyText(clientPage, "Exported on");
  const offboardingAfterExport = await findOffboardingByClientId(clientId);
  if (!offboardingAfterExport?.exportedAt) throw new Error("exportedAt was not set after downloading the export.");
  console.log(`   OK — export PDF downloaded (${exportBytes.length} bytes) and exportedAt recorded.`);

  // Re-running the sweep after export should skip this client — exporting
  // stops the reminders (§16).
  const remindersBeforeSecondSweep = offboardingAfterExport.remindersSent;
  await coachPage.goto(`${BASE_URL}/coach`);
  await coachPage.click('button:has-text("Run Sweep Now")');
  await coachPage.waitForLoadState("networkidle");
  const offboardingAfterSecondSweep = await findOffboardingByClientId(clientId);
  if (offboardingAfterSecondSweep?.remindersSent !== remindersBeforeSecondSweep) {
    throw new Error("Reminder sweep sent another reminder after export — should have skipped this client.");
  }
  console.log("   OK — reminder sweep correctly skipped the client after export.");

  // 22. Deletion sweep (§16, §20) — backdate deletion_due_at into the past
  // and confirm the hard-delete tombstone: child data genuinely gone, the
  // clients row anonymized (not deleted, since offboardings still FKs to
  // it), and the linked users row removed.
  console.log("22. Backdating deletion date and running the deletion sweep...");
  const accountsBeforeDelete = (await listFinancialAccounts(clientId)).length;
  if (accountsBeforeDelete === 0) throw new Error("Expected this client to have financial accounts before testing hard-delete.");
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await dbRun("UPDATE offboardings SET deletion_due_at = $d WHERE client_id = $c", { $d: yesterday, $c: clientId });
  await coachPage.goto(`${BASE_URL}/coach`);
  await coachPage.click('button:has-text("Run Sweep Now")');
  await coachPage.waitForLoadState("networkidle");
  const clientAfterDelete = await findClientById(clientId);
  if (!clientAfterDelete) throw new Error("Client row was deleted entirely — it should survive, anonymized, as the offboarding record's parent.");
  if (clientAfterDelete.fullName !== "[deleted]") throw new Error(`Expected anonymized fullName, got: "${clientAfterDelete.fullName}"`);
  if (clientAfterDelete.userId) throw new Error("Client row still references a userId after hard-delete — the linked users row should be gone and this column nulled.");
  const accountsAfterDelete = (await listFinancialAccounts(clientId)).length;
  if (accountsAfterDelete !== 0) throw new Error(`Expected 0 financial accounts after hard-delete, found ${accountsAfterDelete}.`);
  const offboardingAfterDelete = await findOffboardingByClientId(clientId);
  if (!offboardingAfterDelete?.deletedAt) throw new Error("offboarding.deletedAt was not set after the deletion sweep.");
  console.log("   OK — hard-delete sweep ran: client data erased, clients row anonymized and preserved as the audit tombstone.");

  // 23. Account lockout (§2 Security, build order step 14 "privacy
  // controls") — five wrong passwords in a row should lock the account for
  // a while, blocking even the *correct* password until the lock clears.
  // Uses a fresh, unauthenticated page/context so it doesn't touch
  // coachPage's already-logged-in session.
  console.log("23. Testing account lockout after repeated failed logins...");
  const lockoutPage = await browser.newPage();
  for (let i = 0; i < 5; i++) {
    await lockoutPage.goto(`${BASE_URL}/login`);
    await lockoutPage.fill('input[name="email"]', COACH_EMAIL);
    await lockoutPage.fill('input[name="password"]', "definitely-the-wrong-password");
    await lockoutPage.click('button[type="submit"]');
    await lockoutPage.waitForLoadState("networkidle");
  }
  const lockedOutText = await lockoutPage.locator("body").innerText();
  if (!/too many failed attempts/i.test(lockedOutText)) {
    throw new Error("Expected a lockout message after 5 failed logins, got:\n" + lockedOutText);
  }
  console.log("   OK — account locked after 5 failed attempts.");

  // Even the *correct* password should be rejected while locked.
  await lockoutPage.goto(`${BASE_URL}/login`);
  await lockoutPage.fill('input[name="email"]', COACH_EMAIL);
  await lockoutPage.fill('input[name="password"]', COACH_PASSWORD!);
  await lockoutPage.click('button[type="submit"]');
  await lockoutPage.waitForLoadState("networkidle");
  const stillLockedText = await lockoutPage.locator("body").innerText();
  if (!/too many failed attempts/i.test(stillLockedText)) {
    throw new Error("Correct password was accepted while the account should still be locked:\n" + stillLockedText);
  }
  console.log("   OK — correct password still rejected while locked.");

  // Real time can't be fast-forwarded 15 minutes in a live test — clear the
  // lock directly in the DB (same backdating technique used throughout this
  // script) and confirm a normal login works again immediately afterward.
  const coachUserForLockout = await findUserByEmail(COACH_EMAIL);
  if (!coachUserForLockout) throw new Error("Could not find the coach user to clear its lockout.");
  await dbRun("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $id", { $id: coachUserForLockout.id });
  await lockoutPage.goto(`${BASE_URL}/login`);
  await lockoutPage.fill('input[name="email"]', COACH_EMAIL);
  await lockoutPage.fill('input[name="password"]', COACH_PASSWORD!);
  await lockoutPage.click('button[type="submit"]');
  await lockoutPage.waitForURL(/\/login\/verify/);
  await lockoutPage.fill('input[name="token"]', codeFromSecret(coachSecret));
  await lockoutPage.click('button:has-text("Verify")');
  await lockoutPage.waitForURL(`${BASE_URL}/coach`);
  console.log("   OK — login succeeds again once the lock is cleared.");
  await lockoutPage.close();

  // 24. Coach-only full data backup (§14) — a real JSON export of every
  // table, downloadable on demand since there's no automated backup
  // schedule in this dev environment.
  console.log("24. Downloading the full data backup...");
  const backupResponse = await coachPage.request.get(`${BASE_URL}/coach/backup`);
  if (!backupResponse.ok()) throw new Error(`Backup download failed: ${backupResponse.status()}`);
  const backupJson = await backupResponse.json();
  if (!backupJson.generatedAt || typeof backupJson.tables !== "object") {
    throw new Error("Backup JSON is missing generatedAt/tables: " + JSON.stringify(backupJson).slice(0, 300));
  }
  const expectedTables = ["clients", "users", "payments", "offboardings", "meetings"];
  for (const table of expectedTables) {
    if (!Array.isArray(backupJson.tables[table])) {
      throw new Error(`Backup JSON is missing the "${table}" table.`);
    }
  }
  if (backupJson.tables.clients.length === 0) throw new Error("Backup's clients table was unexpectedly empty.");
  console.log(`   OK — backup downloaded with ${Object.keys(backupJson.tables).length} tables.`);

  console.log(`\nAll smoke checks passed. Client ID: ${clientId}`);
  await browser.close();
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
