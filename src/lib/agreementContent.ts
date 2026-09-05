// Plain-content source for the Financial Coaching Services Agreement (§17),
// mirrored from the docx build script used to produce
// Financial_Coaching_Services_Agreement.docx, so the web version and the
// signable document say exactly the same thing. If the agreement text
// changes, update both and bump AGREEMENT_VERSION in src/lib/enums.ts.
//
// Two placeholders below still need the Coach's real details before this
// goes live with a paying client — see README "Before this goes live":
// COACH_LEGAL_NAME and GOVERNING_COUNTY, both sourced from env so there's a
// single place to fix them rather than hunting through page markup.

export const COACH_LEGAL_NAME = process.env.COACH_LEGAL_NAME || "[Coach's legal name/business entity — see .env]";
export const GOVERNING_COUNTY = process.env.GOVERNING_COUNTY || "[County — see .env]";

export type AgreementBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string; emphasis?: boolean }
  | { type: "bullets"; items: string[] }
  | { type: "label"; label: string; value: string };

export function getAgreementBlocks(): AgreementBlock[] {
  return [
    {
      type: "paragraph",
      text: `This Financial Coaching Services Agreement (the "Agreement") is entered into by and between Steadwell (${COACH_LEGAL_NAME}) ("Coach") and the undersigned client ("Client").`,
    },
    { type: "heading", text: "1. Scope of Services" },
    { type: "paragraph", text: "Coach agrees to provide educational coaching services to assist Client with:" },
    {
      type: "bullets",
      items: [
        "Development of a personalized Financial Foundation Plan based on Client's income, bills, debts, and stated goals.",
        "Personal budgeting frameworks and habit-building strategies.",
        "General debt pay-down methodologies (such as the debt snowball or debt avalanche).",
        "Organization of personal financial statements and tracking tools.",
        "Ongoing accountability check-ins to review progress against the Plan.",
      ],
    },
    { type: "heading", text: "2. Legal Disclaimers & Limitations" },
    { type: "paragraph", text: "Client explicitly acknowledges and agrees to the following legal limitations:" },
    {
      type: "bullets",
      items: [
        "No Investment Advice: Coach is not a Registered Investment Adviser (RIA) or Investment Adviser Representative (IAR) under Texas law. Coach will not provide advice regarding stocks, bonds, mutual funds, annuities, or any other securities.",
        "No Debt Management: Coach will not hold, handle, manage, or distribute Client's money, nor will Coach make payments to creditors on Client's behalf.",
        "No Creditor Negotiation: Coach will not contact, negotiate with, or attempt to settle balances with Client's creditors, collectors, or credit bureaus.",
        "No Professional Licensing: This service does not constitute legal, tax, or certified public accounting (CPA) advice. Client should consult a licensed attorney, CPA, or financial advisor for advice in those areas.",
      ],
    },
    { type: "heading", text: "3. Client Responsibility & No Guaranteed Outcomes" },
    {
      type: "bullets",
      items: [
        "Client Control: Client retains full control over their financial decisions and is solely responsible for executing their own budget and making timely payments to creditors.",
        "No Guaranteed Outcomes: Coach provides strategies and guidance but makes no guarantees regarding specific financial outcomes, total money saved, or the speed of debt elimination.",
      ],
    },
    { type: "heading", text: "4. Fees and Payment Terms" },
    { type: "label", label: "Financial Foundation (one-time)", value: "$399, due in full before the Foundation Intake begins." },
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
      text: "The Financial Foundation fee is refundable upon Client's request at any time before Client submits their Foundation Intake. Once Client submits their Foundation Intake, the Financial Foundation fee becomes non-refundable.",
    },
    {
      type: "paragraph",
      emphasis: true,
      text: "Every Accountability Track billing cycle is non-refundable in full once billed, regardless of usage.",
    },
    {
      type: "paragraph",
      text: "Client may cancel their Accountability Track at any time; cancellation takes effect at the end of the current paid billing cycle, and no partial-period refund is issued.",
    },
    { type: "heading", text: "5. Data Retention & Export" },
    {
      type: "paragraph",
      text: "Upon cancellation of the Accountability Track, completion of the program, or closure of the account for any other reason, Client will have thirty (30) days to download a copy of their Financial Foundation Plan and related records through the client portal. Coach will send periodic reminder emails during this period.",
    },
    {
      type: "paragraph",
      text: "On the thirtieth day, Client's financial documents, statements, and plan data are permanently deleted from Coach's systems, whether or not Client has exported a copy. This deletion is final and cannot be reversed.",
    },
    { type: "heading", text: "6. Confidentiality" },
    {
      type: "paragraph",
      text: "Coach will keep Client's financial information confidential and will use it only to provide the services described in this Agreement, except as required by law or as necessary to process payment through Coach's payment processor.",
    },
    { type: "heading", text: "7. Limitation of Liability" },
    {
      type: "paragraph",
      text: "To the maximum extent permitted by law, Coach's total liability arising out of or related to this Agreement shall not exceed the total fees paid by Client to Coach in the twelve (12) months preceding the claim.",
    },
    { type: "heading", text: "8. Term & Termination" },
    {
      type: "paragraph",
      text: "This Agreement begins on the date signed below and continues until the Accountability Track is canceled or the engagement is otherwise closed. Either party may terminate the Accountability Track at any time; termination triggers the Data Retention & Export terms in Section 5.",
    },
    { type: "heading", text: "9. Governing Law" },
    {
      type: "paragraph",
      text: `This Agreement shall be governed by, construed, and enforced in accordance with the laws of the State of Texas. Any legal disputes arising under this Agreement shall be handled in ${GOVERNING_COUNTY} County, Texas.`,
    },
  ];
}
