// Plain-content source for the Financial Coaching Services Agreement,
// mirrored from the docx build script used to produce
// Financial_Coaching_Services_Agreement.docx, so the web version and the
// signable document say exactly the same thing. This is the finalized,
// attorney-reviewed text (delivered as a PDF alongside the Privacy Policy
// and Terms of Service — see /privacy and /terms) — if the agreement text
// changes again, update both this file and docx_build/build.js, and bump
// AGREEMENT_VERSION in src/lib/enums.ts.

export const COACH_LEGAL_NAME = process.env.COACH_LEGAL_NAME || "[Coach's legal name/business entity — see .env]";
export const GOVERNING_COUNTY = process.env.GOVERNING_COUNTY || "[County — see .env]";

// Shared by src/app/privacy/page.tsx and src/app/terms/page.tsx too (they
// import these from here) — the one place the Privacy Policy's/Terms'
// real URLs are computed, so every cross-reference between all three
// documents can't drift out of sync with each other or with where the
// pages actually live.
export const PRIVACY_POLICY_URL = `${process.env.APP_URL ?? "http://localhost:3000"}/privacy`;
export const TERMS_OF_SERVICE_URL = `${process.env.APP_URL ?? "http://localhost:3000"}/terms`;
// A reference-only view of the current Agreement text for an
// already-enrolled client — distinct from /agreement/[token], the live
// per-applicant acceptance flow. See src/app/agreement/current/page.tsx.
export const AGREEMENT_URL = `${process.env.APP_URL ?? "http://localhost:3000"}/agreement/current`;

// Journey's go-live date for all three finalized legal documents (Agreement,
// Privacy Policy, Terms of Service) — set together per legal's "Next Steps"
// note so all three go live on the same date. Matches AGREEMENT_VERSION in
// src/lib/enums.ts; update both together if this ever changes.
export const LEGAL_EFFECTIVE_DATE = "September 5, 2026";

export type AgreementBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string; emphasis?: boolean }
  | { type: "bullets"; items: string[] }
  | { type: "label"; label: string; value: string };

export function getAgreementBlocks(): AgreementBlock[] {
  return [
    { type: "label", label: "Effective Date", value: LEGAL_EFFECTIVE_DATE },
    {
      type: "paragraph",
      text: `This Financial Coaching Services Agreement (the "Agreement") is entered into by and between Steadwell (${COACH_LEGAL_NAME}), a Texas limited liability company ("Coach"), and the individual who electronically accepts this Agreement ("Client"). Coach and Client are each a "Party" and together the "Parties."`,
    },
    {
      type: "paragraph",
      text: "Coach offers educational financial coaching services to individuals throughout the United States through the Steadwell platform (the \"Platform\"). All services are delivered remotely through the Platform and through video or telephone conferencing.",
    },
    { type: "heading", text: "1. Scope of Services" },
    {
      type: "paragraph",
      text: "Coach provides educational financial coaching designed to help Client build a plan for taking control of Client's personal finances. Services may include:",
    },
    {
      type: "bullets",
      items: [
        "Development of a personalized Financial Foundation Plan based on Client's self-reported income, bills, debts, and stated goals.",
        "Personal budgeting frameworks and habit-building strategies.",
        "Education on general debt pay-down methodologies (such as the debt snowball or debt avalanche approach) — provided for informational purposes only and not as a directive to take any specific financial action.",
        "Organization of personal financial statements and tracking tools.",
        "Ongoing accountability check-ins to review Client's self-reported progress against the Plan.",
      ],
    },
    {
      type: "paragraph",
      text: "All services are educational and organizational in nature. Coach does not implement any financial strategy on Client's behalf, does not access Client's accounts, and does not take action with respect to Client's finances.",
    },
    { type: "heading", text: "2. Legal Disclaimers and Limitations" },
    { type: "paragraph", text: "Client explicitly acknowledges and agrees to the following:" },
    {
      type: "bullets",
      items: [
        "No Investment Advice: Coach is not a Registered Investment Adviser (RIA) or Investment Adviser Representative (IAR) under federal or any state's securities laws, and is not registered with the SEC, any state securities regulator, or FINRA. Coach will not provide advice regarding stocks, bonds, mutual funds, annuities, or any other securities or investment products.",
        "No Debt Management Services: Coach will not hold, handle, manage, or distribute Client's money, nor make payments to creditors on Client's behalf, and does not provide debt management services as defined under any applicable federal or state law, including Texas Finance Code Chapter 394 or similar statutes in Client's state of residence.",
        "No Creditor Negotiation: Coach will not contact, negotiate with, or attempt to settle balances with Client's creditors, debt collectors, or credit bureaus.",
        "No Credit Repair Services: Coach does not provide credit repair or credit improvement services as defined under the federal Credit Repair Organizations Act or any state credit services organization statute, including Texas Finance Code Chapter 393 or similar laws in Client's state of residence. Coach will not dispute items on Client's credit report, contact credit bureaus on Client's behalf, or promise to improve Client's credit score or history.",
        "No Professional Licensing: Coach's services do not constitute legal, tax, accounting, insurance, or licensed financial advisory services. Client should consult a licensed attorney, certified public accountant, or registered financial advisor for advice in those areas.",
        "Educational Purpose: All information, strategies, frameworks, and materials provided by Coach are for educational and informational purposes only and should not be treated as a recommendation to take or refrain from taking any specific financial action.",
        "Regulatory Compliance: If any service described in this Agreement would require registration, licensing, or other regulatory approval in Client's state of residence or under applicable federal law, Coach will not provide that service to Client. Coach may modify, limit, or decline to provide services to the extent necessary to comply with applicable law — such modification or limitation does not constitute a breach of this Agreement.",
      ],
    },
    { type: "heading", text: "3. Client Representations" },
    { type: "paragraph", text: "By accepting this Agreement, Client represents and warrants that:" },
    {
      type: "bullets",
      items: [
        "Age, Residency, and Capacity: Client is at least eighteen (18) years of age, is a resident of a state or territory of the United States, and is legally competent to enter into a binding agreement.",
        "Accuracy of Information: All financial information Client provides — including income, debts, expenses, and financial goals — is accurate and complete to the best of Client's knowledge. Client understands Coach relies on this self-reported information, and that inaccurate information may result in guidance that does not serve Client's interests.",
        "Independent Decision-Making: Client understands that all financial decisions remain Client's sole responsibility, and that Client will independently evaluate any strategy or framework discussed during coaching before acting on it.",
        "Understanding of Services: Client understands that Coach provides educational coaching, not regulated financial services, and that the disclaimers in Section 2 define the boundaries of the engagement.",
      ],
    },
    { type: "heading", text: "4. Client Responsibility and No Guaranteed Outcomes" },
    {
      type: "bullets",
      items: [
        "Client Control: Client retains full control over all financial decisions and is solely responsible for executing Client's own budget, making payments to creditors, and managing Client's finances.",
        "No Guaranteed Outcomes: Coach provides strategies, frameworks, and accountability support but makes no guarantees regarding specific financial outcomes, total money saved, credit score changes, or the speed of debt elimination. Client's results depend entirely on Client's own actions and circumstances.",
      ],
    },
    { type: "heading", text: "5. Fees and Payment Terms" },
    { type: "label", label: "Financial Foundation (one-time)", value: "$399, due in full before the Foundation Intake session begins." },
    { type: "paragraph", text: "Accountability Track (choose one, billed monthly in advance):" },
    {
      type: "bullets",
      items: [
        "Steady Accountability — $79/month (one meeting per month)",
        "Momentum Accountability — $149/month (two meetings per month)",
        "Intensive Accountability — $249/month (weekly meetings)",
      ],
    },
    {
      type: "paragraph",
      text: "Refund Policy: The Financial Foundation fee of $399 is non-refundable once Coach has delivered the Foundation Intake session. If Coach fails to deliver the Foundation Intake session within thirty (30) days of payment for any reason other than Client's unavailability, Client may request a full refund of the Financial Foundation fee.",
    },
    {
      type: "paragraph",
      emphasis: true,
      text: "Accountability Track fees are non-refundable for each billing cycle, in full, regardless of whether Client attends all scheduled meetings during that cycle.",
    },
    {
      type: "paragraph",
      text: "Cancellation: Client may cancel the Accountability Track at any time. Cancellation takes effect at the end of the current paid billing cycle, and no partial-period refund will be issued.",
    },
    {
      type: "paragraph",
      text: "Late or Failed Payments: If a scheduled Accountability Track payment fails, Coach may suspend services until payment is received. If payment is not received within fifteen (15) days of the failed charge, Coach may terminate the Accountability Track and the data retention provisions of Section 8 will apply.",
    },
    { type: "heading", text: "6. Intellectual Property" },
    {
      type: "bullets",
      items: [
        "Coach's Materials: All frameworks, templates, methodologies, tools, worksheets, and educational content provided by Coach (\"Coaching Materials\") are and remain the exclusive intellectual property of Coach. Client receives a limited, personal, non-transferable, non-exclusive license to use the Coaching Materials solely for Client's own personal financial planning purposes.",
        "Client's Plan: The Financial Foundation Plan developed for Client is a derivative work incorporating Coach's proprietary Coaching Materials. Client may retain and use Client's own Plan for personal purposes, but may not reproduce, distribute, sell, or publicly share the Plan or any Coaching Materials, in whole or in part.",
        "Feedback: Any feedback, suggestions, or ideas Client provides to Coach regarding the services or Coaching Materials may be used by Coach without restriction or compensation.",
      ],
    },
    { type: "heading", text: "7. Confidentiality and Privacy" },
    {
      type: "paragraph",
      text: "Coach will keep Client's financial information confidential and will use it only to: (i) provide the services described in this Agreement; (ii) process payment through Coach's payment processor; (iii) comply with applicable law, regulation, or legal process; or (iv) protect the rights, safety, or property of Coach, Client, or others.",
    },
    {
      type: "paragraph",
      text: `Privacy Policy: Coach's collection, use, sharing, and protection of Client's personal information is governed by Coach's Privacy Policy, available on the Platform at ${PRIVACY_POLICY_URL}. The Privacy Policy is incorporated into this Agreement by reference. Client acknowledges that Client has had the opportunity to review the Privacy Policy before accepting this Agreement.`,
    },
    {
      type: "paragraph",
      text: "Coach may use anonymized, aggregated data that does not identify Client for the purpose of improving Coach's services, developing content, or internal analytics.",
    },
    { type: "heading", text: "8. Data Retention and Export" },
    {
      type: "paragraph",
      text: "Upon cancellation of the Accountability Track, completion of the program, or closure of the account for any other reason, Client will have thirty (30) days to download a copy of Client's Financial Foundation Plan and related records through the client portal. Coach will send periodic reminder emails during this period.",
    },
    {
      type: "paragraph",
      text: "On the thirtieth (30th) day following that event, Client's financial documents, statements, plan data, in-app messages, and coaching session records will be permanently deleted from Coach's systems, whether or not Client has exported a copy. This deletion is final and cannot be reversed.",
    },
    {
      type: "paragraph",
      text: "Legal Hold Exception: Notwithstanding the above, if a legal dispute, claim, or investigation involving Client's account is pending or reasonably anticipated at the time deletion would otherwise occur, Coach may retain Client's data for as long as reasonably necessary to resolve the matter, after which the data will be permanently deleted.",
    },
    { type: "heading", text: "9. Indemnification" },
    {
      type: "paragraph",
      text: "Client agrees to indemnify, defend, and hold harmless Coach and its members, managers, officers, employees, and agents from and against any claims, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (i) Client's breach of this Agreement; (ii) Client's misrepresentation of financial information provided to Coach; (iii) Client's financial decisions or actions taken based on or after coaching sessions; or (iv) Client's misuse, redistribution, or unauthorized sharing of Coaching Materials.",
    },
    { type: "heading", text: "10. Limitation of Liability" },
    {
      type: "paragraph",
      text: "To the maximum extent permitted by law, Coach's total aggregate liability arising out of or related to this Agreement, whether in contract, tort, or otherwise, shall not exceed the total fees actually paid by Client to Coach in the twelve (12) months preceding the event giving rise to the claim.",
    },
    {
      type: "paragraph",
      text: "In no event shall Coach be liable for any indirect, incidental, special, consequential, or punitive damages, including lost savings, lost income, or financial losses resulting from Client's financial decisions, even if Coach has been advised of the possibility of such damages.",
    },
    { type: "heading", text: "11. Dispute Resolution" },
    {
      type: "paragraph",
      text: "Before initiating any formal dispute proceeding, the Party raising the dispute shall send written notice to the other Party describing the dispute in reasonable detail. The Parties shall attempt in good faith to resolve the dispute through direct communication for thirty (30) days from that notice.",
    },
    {
      type: "paragraph",
      text: `If the dispute is not resolved informally, either Party may submit it to final and binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules then in effect. The arbitration shall be conducted remotely by videoconference unless both Parties agree in writing to an in-person proceeding, in which case it shall take place in ${GOVERNING_COUNTY} County, Texas. The Federal Arbitration Act governs the interpretation and enforcement of this arbitration provision.`,
    },
    {
      type: "paragraph",
      text: "Class Action Waiver: Client and Coach each agree that any dispute resolution proceeding will be conducted only on an individual basis and not as part of a class, consolidated, or representative action. If for any reason a claim proceeds in court rather than in arbitration, Client and Coach each waive any right to a jury trial.",
    },
    {
      type: "paragraph",
      text: `Small Claims Exception: Either Party may bring an individual action in small claims court if the claim falls within that court's jurisdictional limits. Client may file in the small claims court in Client's county of residence or in ${GOVERNING_COUNTY} County, Texas. Coach may file in ${GOVERNING_COUNTY} County, Texas.`,
    },
    {
      type: "paragraph",
      text: "If any portion of the arbitration agreement or class action waiver in this Section is found unenforceable under the law of Client's state of residence, that portion shall be severed and the remaining provisions shall continue in full force and effect; if only the class action waiver is found unenforceable as to a particular claim, that claim (and only that claim) proceeds in court while the rest is arbitrated. Each Party bears its own costs and attorneys' fees in any dispute, unless a claim is found frivolous, in which case the non-prevailing Party pays the prevailing Party's reasonable attorneys' fees.",
    },
    { type: "heading", text: "12. Term and Termination" },
    {
      type: "paragraph",
      text: "This Agreement begins on the date Client electronically accepts it and continues until the Accountability Track is canceled or the engagement is otherwise closed. Either Party may terminate the Accountability Track at any time; termination triggers the refund terms in Section 5 and the data retention provisions in Section 8.",
    },
    {
      type: "paragraph",
      text: "Coach may terminate this Agreement immediately and without refund if Client: (i) provides materially false or misleading financial information; (ii) engages in abusive, threatening, or harassing behavior toward Coach or Coach's staff; or (iii) violates the intellectual property provisions of Section 6.",
    },
    { type: "heading", text: "13. Electronic Acceptance" },
    {
      type: "paragraph",
      text: "Client acknowledges and agrees that by clicking \"I Agree,\" typing Client's name in the signature field, or otherwise electronically accepting this Agreement through the Steadwell platform, Client is entering into a legally binding agreement with the same force and effect as a handwritten signature. This electronic acceptance is valid and enforceable under the federal E-SIGN Act and the electronic transactions laws of Client's state of residence. Coach records Client's typed name, the date and time of acceptance, and Client's IP address as evidence of acceptance.",
    },
    { type: "heading", text: "14. General Provisions" },
    {
      type: "paragraph",
      text: `This Agreement, together with the Privacy Policy incorporated by reference above, constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior or contemporaneous communications, representations, or agreements, whether oral or written, including statements made in marketing materials, social media, or discovery calls not expressly set forth in this Agreement.`,
    },
    {
      type: "paragraph",
      text: "Amendments: This Agreement may not be modified except by a written instrument signed (including electronically) by both Parties, or by Coach providing Client with an updated Agreement through the Steadwell platform with at least thirty (30) days' prior notice and Client continuing to use the services after the update takes effect. If Client does not agree to the update, Client may cancel services before the effective date.",
    },
    {
      type: "paragraph",
      text: "If any provision of this Agreement is held invalid, illegal, or unenforceable, the remaining provisions remain in full force and effect, and the invalid provision is modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving the Parties' original intent. The failure of either Party to enforce any right or provision is not a waiver of it; any waiver must be in writing and signed by the waiving Party.",
    },
    {
      type: "paragraph",
      text: "Client may not assign or transfer this Agreement or any rights under it without Coach's prior written consent. Coach may assign this Agreement in connection with a merger, acquisition, or sale of substantially all of its assets without Client's consent. Any notice required under this Agreement shall be sent to the email address on file for each Party and is deemed received on the date sent.",
    },
    {
      type: "paragraph",
      text: "Coach shall not be liable for any delay or failure to perform under this Agreement due to causes beyond Coach's reasonable control, including natural disasters, government actions, internet or technology failures, pandemics, or other force majeure events. Section headings are for convenience only and do not affect interpretation.",
    },
    { type: "heading", text: "15. Governing Law" },
    {
      type: "paragraph",
      text: "This Agreement shall be governed by, construed, and enforced in accordance with the laws of the State of Texas, without regard to its conflict-of-laws principles. The arbitration provision in Section 11 is governed by the Federal Arbitration Act.",
    },
  ];
}
