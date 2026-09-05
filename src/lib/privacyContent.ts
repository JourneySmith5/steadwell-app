// Plain-content source for the Privacy Policy — the finalized,
// attorney-reviewed text delivered as a PDF alongside the Coaching
// Agreement and Terms of Service. Rendered by src/app/privacy/page.tsx via
// the same block renderer the Agreement uses (see AgreementText.tsx /
// LegalText.tsx). If this text changes, update this file and re-check the
// cross-references in src/lib/agreementContent.ts (§7.2) and
// src/lib/termsContent.ts (§1.2), which both link here.
//
// §3.1(4)/§5(4) were corrected in legal's September revision to match how
// this app actually works: Supabase hosts the Postgres database (accurate
// — see README "Before this goes live" item 11), but Steadwell has its own
// login/2FA rather than using Supabase Auth, and access control is
// enforced in application code (src/lib/dal.ts), not Postgres Row Level
// Security policies. The previous verbatim wording claimed Supabase-based
// authentication and RLS; both were inaccurate and have been replaced.
import { LEGAL_EFFECTIVE_DATE } from "@/lib/agreementContent";
import type { AgreementBlock } from "@/lib/agreementContent";

export function getPrivacyBlocks(): AgreementBlock[] {
  return [
    { type: "label", label: "Effective Date", value: LEGAL_EFFECTIVE_DATE },
    { type: "label", label: "Last Updated", value: LEGAL_EFFECTIVE_DATE },
    {
      type: "paragraph",
      text: 'This Privacy Policy describes how Steadwell, operated by Boldly Built LLC ("Steadwell," "we," "us," or "our"), collects, uses, shares, and protects your personal information when you use our website, web application, and related services (collectively, the "Platform"). By accessing or using the Platform, you agree to the practices described in this Privacy Policy.',
    },
    { type: "paragraph", text: "If you have questions about this Privacy Policy, contact us at info@boldlybuilt.group." },

    { type: "heading", text: "1. Information We Collect" },
    {
      type: "paragraph",
      text: "We collect information in three categories: information you provide directly, information collected automatically, and information from third parties.",
    },
    {
      type: "paragraph",
      text: "1.1 Information You Provide. When you create an account, purchase services, or use the Platform, you may provide:",
    },
    {
      type: "bullets",
      items: [
        "Account information, including your full name, email address, phone number, and mailing address.",
        "Financial information you voluntarily submit for coaching purposes, including income details, monthly bills and expenses, outstanding debts and balances, financial goals, and bank or account identifiers you choose to share.",
        "Payment information, including credit or debit card number, billing address, and related transaction details, which are processed and stored by Stripe, our third-party payment processor, and are not stored on our servers.",
        "Agreement acceptance records, including your typed name, the date and time of acceptance, and your IP address at the time of acceptance.",
        "Scheduling information, including your name, email address, and appointment details shared through Google Calendar to schedule coaching sessions.",
        "Communications you send to us, including messages sent through the Platform's in-app messaging feature, emails, and session notes from coaching meetings.",
      ],
    },
    {
      type: "paragraph",
      text: "1.2 Information Collected Automatically. When you access the Platform, we automatically collect:",
    },
    {
      type: "bullets",
      items: [
        "Device and browser information, including device type, operating system, browser type and version, and screen resolution.",
        "Usage data, including pages visited, features used, session duration, clickstream data, and referring URLs.",
        "IP address and approximate geographic location derived from your IP address.",
        "A session authentication cookie as described in Section 6 of this Privacy Policy.",
      ],
    },
    {
      type: "paragraph",
      text: "1.3 Information from Third Parties. We may receive limited information from Stripe confirming the success or failure of a transaction. We do not purchase personal information from data brokers or other third-party sources.",
    },

    { type: "heading", text: "2. How We Use Your Information" },
    { type: "paragraph", text: "We use the information we collect for the following purposes:" },
    {
      type: "bullets",
      items: [
        "To provide and deliver our financial coaching services, including building your personalized Financial Foundation Plan and conducting accountability check-ins.",
        "To create and manage your account on the Platform.",
        "To process payments through Stripe and send transaction confirmations and receipts.",
        "To schedule and manage coaching sessions through Google Calendar.",
        "To communicate with you about your account, services, scheduling, and support requests, including through the Platform's in-app messaging feature and transactional emails sent through Resend.",
        "To send you onboarding, reminder, and service-related emails through Resend, including reminders related to data export windows, billing, and scheduled sessions.",
        "To analyze how users interact with the Platform using our own internal analytics tools in order to maintain and improve the Platform — we do not use any third-party analytics service for this purpose.",
        "To comply with legal obligations, enforce our agreements, and protect our rights.",
        "To respond to legal process, law enforcement requests, or regulatory inquiries.",
      ],
    },
    {
      type: "paragraph",
      text: "We do not use your financial information for any purpose other than delivering the coaching services described in your Financial Coaching Services Agreement.",
    },

    { type: "heading", text: "3. How We Share Your Information" },
    {
      type: "paragraph",
      text: "We do not sell, rent, or trade your personal information to third parties. We share your information only in the following limited circumstances:",
    },
    { type: "paragraph", text: "3.1 Service Providers. We share information with third-party service providers who perform services on our behalf, including:" },
    {
      type: "bullets",
      items: [
        "Payment processing — Stripe, Inc. Stripe processes and stores your payment card information. Stripe's privacy policy is available at https://stripe.com/privacy.",
        "Scheduling — Google Calendar (Google LLC). Your name, email address, and appointment details are shared with Google Calendar to schedule and manage coaching sessions. Google's privacy policy is available at https://policies.google.com/privacy.",
        "Hosting and application delivery — Vercel, Inc. The Platform's front end is hosted on Vercel's infrastructure, and Vercel may process server logs containing your IP address and usage data. Vercel's privacy policy is available at https://vercel.com/legal/privacy-policy.",
        "Database hosting — Supabase, Inc. Your account information, financial data, and coaching records are stored on Supabase's hosted PostgreSQL infrastructure. Steadwell maintains its own authentication system; Supabase Auth is not used. Supabase's privacy policy is available at https://supabase.com/privacy.",
        "Transactional email — Resend, Inc. Your name and email address are shared with Resend to deliver onboarding, reminder, and service-related emails. Resend's privacy policy is available at https://resend.com/legal/privacy-policy.",
      ],
    },
    {
      type: "paragraph",
      text: "Each service provider is contractually required to use your information only to perform the services we have engaged them to provide and to maintain appropriate security safeguards.",
    },
    {
      type: "paragraph",
      text: "3.2 No Third-Party Analytics. We perform all usage analytics internally within the Platform. We do not share your usage data with any third-party analytics provider.",
    },
    {
      type: "paragraph",
      text: "3.3 Legal Requirements. We may disclose your information if required to do so by law, court order, subpoena, or other legal process, or if we have a good-faith belief that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.",
    },
    {
      type: "paragraph",
      text: "3.4 Business Transfers. If Boldly Built LLC is involved in a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred as part of that transaction. We will notify you by email or by a prominent notice on the Platform before your information becomes subject to a different privacy policy.",
    },
    {
      type: "paragraph",
      text: "3.5 With Your Consent. We may share your information with third parties when you have given us explicit consent to do so.",
    },

    { type: "heading", text: "4. Data Retention and Deletion" },
    {
      type: "paragraph",
      text: "4.1 Active Accounts. We retain your personal information and financial data for as long as your account is active and you are enrolled in our services.",
    },
    {
      type: "paragraph",
      text: "4.2 Post-Closure Export Window. Upon cancellation, completion, or closure of your account for any reason, you will have thirty (30) calendar days to download a copy of your Financial Foundation Plan and related records through the Platform. We will send periodic reminder emails during this window.",
    },
    {
      type: "paragraph",
      text: "4.3 Permanent Deletion. On the thirtieth (30th) day following account closure, your financial documents, statements, plan data, in-app messages, and coaching session records are permanently and irreversibly deleted from our systems — including from our Supabase database — whether or not you have exported a copy.",
    },
    {
      type: "paragraph",
      text: "4.4 Exceptions. We may retain information beyond the periods described above if required by law, if necessary to resolve a pending dispute or enforce our agreements, or if a litigation hold is in effect. Information retained under this exception will be deleted promptly once the legal basis for retention no longer applies.",
    },
    {
      type: "paragraph",
      text: "4.5 Payment Records. Transaction records (date, amount, and last four digits of the payment method) may be retained for up to seven (7) years after the transaction date for tax, accounting, and legal compliance purposes, even after account closure and data deletion.",
    },
    {
      type: "paragraph",
      text: "4.6 Third-Party Retention. Our service providers (Stripe, Google, Vercel, Supabase, and Resend) maintain their own data retention policies. We encourage you to review each provider's privacy policy for details on how long they retain your information.",
    },

    { type: "heading", text: "5. Data Security" },
    {
      type: "paragraph",
      text: "We implement commercially reasonable administrative, technical, and physical safeguards designed to protect your personal information from unauthorized access, disclosure, alteration, and destruction. These include:",
    },
    {
      type: "bullets",
      items: [
        "Encryption of data in transit using TLS/SSL protocols.",
        "Encryption of sensitive financial data at rest on Supabase's hosted PostgreSQL infrastructure.",
        "Access controls limiting employee and contractor access to personal information on a need-to-know basis.",
        "Application-level access controls enforced in Steadwell's own code, isolating each client's data so that it is accessible only to that client and authorized personnel.",
        "Regular review of security practices and infrastructure.",
      ],
    },
    {
      type: "paragraph",
      text: "No method of transmission over the internet or method of electronic storage is completely secure. While we strive to protect your personal information, we cannot guarantee its absolute security.",
    },

    { type: "heading", text: "6. Cookies and Tracking Technologies" },
    {
      type: "paragraph",
      text: "6.1 What We Use. The Platform uses a single essential cookie: a session authentication cookie that keeps you logged in while you use the Platform. This cookie is strictly necessary for the Platform to function and is deleted when you log out or your session expires. We do not use analytics cookies, advertising cookies, tracking cookies, or preference cookies of any kind.",
    },
    {
      type: "paragraph",
      text: "6.2 Your Choices. You may block or delete cookies through your browser settings. However, because the session authentication cookie is the only cookie we use and is required to log in, blocking it will prevent you from accessing the Platform.",
    },
    {
      type: "paragraph",
      text: "6.3 No Tracking. The Platform does not track users across third-party websites and does not use any cross-site tracking technologies. Some browsers transmit \"Do Not Track\" signals; because we do not engage in tracking, the signal has no practical effect on your experience, but we note its receipt.",
    },

    { type: "heading", text: "7. Your Rights and Choices" },
    {
      type: "paragraph",
      text: "Depending on your state of residence, you may have certain rights regarding your personal information. These may include:",
    },
    {
      type: "bullets",
      items: [
        "Access — the right to request a copy of the personal information we hold about you.",
        "Correction — the right to request correction of inaccurate personal information.",
        "Deletion — the right to request deletion of your personal information, subject to certain legal exceptions.",
        "Portability — the right to receive your personal information in a structured, commonly used, machine-readable format.",
        "Opt-out of sale — the right to opt out of the sale of your personal information. We do not sell your personal information.",
        "Non-discrimination — we will not discriminate against you for exercising any of your privacy rights.",
      ],
    },
    {
      type: "paragraph",
      text: "To exercise any of these rights, contact us at info@boldlybuilt.group. We will respond to verifiable requests within forty-five (45) days. We may request additional information to verify your identity before fulfilling a request.",
    },

    { type: "heading", text: "8. California Privacy Rights" },
    {
      type: "paragraph",
      text: "If you are a California resident, the California Consumer Privacy Act, as amended by the California Privacy Rights Act (collectively, \"CCPA\"), provides you with specific rights regarding your personal information.",
    },
    {
      type: "paragraph",
      text: "8.1 Categories of Information. In the preceding twelve (12) months, we have collected the following categories of personal information: identifiers (name, email, phone number, IP address); financial information (income, debts, expenses you provide for coaching); internet or network activity (usage data, session authentication cookie); and geolocation data (approximate location from IP address).",
    },
    {
      type: "paragraph",
      text: "8.2 No Sale or Sharing. We do not sell your personal information and have not sold personal information in the preceding twelve (12) months. We do not share your personal information for cross-context behavioral advertising.",
    },
    {
      type: "paragraph",
      text: "8.3 Your CCPA Rights. You have the right to know what personal information we collect, disclose, and use; the right to request deletion; the right to correct inaccurate information; and the right to not be discriminated against for exercising these rights. To submit a request, contact us at info@boldlybuilt.group.",
    },
    {
      type: "paragraph",
      text: "8.4 Authorized Agents. You may designate an authorized agent to submit a request on your behalf. We may require the agent to provide proof of authorization and may contact you directly to verify the request.",
    },

    { type: "heading", text: "9. Other State Privacy Rights" },
    {
      type: "paragraph",
      text: "Residents of states with comprehensive privacy laws, including but not limited to Virginia, Colorado, Connecticut, Utah, and other states that have enacted or may enact consumer privacy legislation, may have additional rights similar to those described in Sections 7 and 8. To exercise any state-specific privacy right, contact us at info@boldlybuilt.group, and we will process your request in accordance with applicable law.",
    },

    { type: "heading", text: "10. Children's Privacy" },
    {
      type: "paragraph",
      text: "The Platform is not directed to individuals under the age of eighteen (18). We do not knowingly collect personal information from anyone under 18. If we learn that we have collected personal information from a person under 18, we will delete that information promptly. If you believe we have collected information from a minor, contact us at info@boldlybuilt.group.",
    },

    { type: "heading", text: "11. Third-Party Links" },
    {
      type: "paragraph",
      text: "The Platform may contain links to third-party websites or services that are not operated by us. We are not responsible for the privacy practices of those third parties. We encourage you to review the privacy policies of any third-party site you visit.",
    },

    { type: "heading", text: "12. Changes to This Privacy Policy" },
    {
      type: "paragraph",
      text: "We may update this Privacy Policy from time to time. When we make material changes, we will update the \"Last Updated\" date at the top of this page and notify you by email or by posting a prominent notice on the Platform at least thirty (30) days before the changes take effect. Your continued use of the Platform after the effective date of a revised Privacy Policy constitutes your acceptance of the changes.",
    },

    { type: "heading", text: "13. Contact Us" },
    {
      type: "paragraph",
      text: "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, contact us at:",
    },
    { type: "paragraph", text: "Steadwell (Boldly Built LLC)" },
    { type: "paragraph", text: "5900 Balcones Dr #15349, Austin, TX 78731" },
    { type: "paragraph", text: "info@boldlybuilt.group" },
  ];
}
