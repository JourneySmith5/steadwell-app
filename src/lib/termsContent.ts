// Plain-content source for the Terms of Service — the finalized,
// attorney-reviewed text delivered as a PDF alongside the Coaching
// Agreement and Privacy Policy. Rendered by src/app/terms/page.tsx via the
// same block renderer the Agreement uses. §1.2's Privacy Policy URL is
// filled in from src/lib/agreementContent.ts's PRIVACY_POLICY_URL — the
// same constant the Agreement's own §7.2 reference uses — per legal's
// "Next Steps" note ("use the same URL you will add to the Coaching
// Agreement's Section 7.2").
import { LEGAL_EFFECTIVE_DATE, PRIVACY_POLICY_URL } from "@/lib/agreementContent";
import type { AgreementBlock } from "@/lib/agreementContent";

export function getTermsBlocks(): AgreementBlock[] {
  return [
    { type: "label", label: "Effective Date", value: LEGAL_EFFECTIVE_DATE },
    { type: "label", label: "Last Updated", value: LEGAL_EFFECTIVE_DATE },
    {
      type: "paragraph",
      text: 'These Terms of Service (the "Terms") govern your access to and use of the Steadwell platform, including the website, web application, client portal, and all related features and services (collectively, the "Platform"), operated by Boldly Built LLC, a Texas limited liability company doing business as Steadwell ("Steadwell," "we," "us," or "our").',
    },
    {
      type: "paragraph",
      text: "By creating an account, accessing, or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.",
    },

    { type: "heading", text: "1. Relationship to Other Agreements" },
    {
      type: "paragraph",
      text: 'These Terms govern your use of the Platform itself. Your purchase and use of Steadwell\'s financial coaching services are governed by the Financial Coaching Services Agreement (the "Coaching Agreement"), which you accept separately before purchasing services. If there is a conflict between these Terms and the Coaching Agreement regarding the coaching services, the Coaching Agreement controls; if there is a conflict regarding your use of the Platform, these Terms control.',
    },
    {
      type: "paragraph",
      text: `Our collection, use, sharing, and protection of your personal information is governed by our Privacy Policy, available at ${PRIVACY_POLICY_URL}. The Privacy Policy is incorporated into these Terms by reference.`,
    },

    { type: "heading", text: "2. Eligibility" },
    {
      type: "paragraph",
      text: "To use the Platform, you must be: (i) at least eighteen (18) years of age; (ii) a resident of a state or territory of the United States; and (iii) legally competent to enter into a binding agreement. By creating an account, you represent and warrant that you meet all of these requirements.",
    },

    { type: "heading", text: "3. Account Registration and Security" },
    {
      type: "paragraph",
      text: "3.1 Account Creation. To access the Platform's features, you must create an account by providing accurate and complete information, including your name and a valid email address. You agree to update your account information promptly if it changes.",
    },
    {
      type: "paragraph",
      text: "3.2 Account Security. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately at info@boldlybuilt.group if you become aware of any unauthorized access to or use of your account.",
    },
    {
      type: "paragraph",
      text: "3.3 One Account Per Person. Each account is for a single individual. You may not share your account credentials with others or allow others to access the Platform through your account.",
    },
    {
      type: "paragraph",
      text: "3.4 Account Accuracy. You agree that all information you provide through the Platform — including financial information submitted for coaching purposes — is accurate and complete to the best of your knowledge. We rely on your self-reported information to deliver our services, and you understand that inaccurate information may result in guidance that does not serve your interests.",
    },

    { type: "heading", text: "4. Use of the Platform" },
    {
      type: "paragraph",
      text: "4.1 License to Use. Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for your personal, non-commercial purposes in connection with Steadwell's financial coaching services.",
    },
    {
      type: "paragraph",
      text: "4.2 Platform Availability. We strive to keep the Platform available and functional, but we do not guarantee uninterrupted or error-free access. The Platform may be temporarily unavailable due to scheduled maintenance, updates, or circumstances beyond our reasonable control. We will make reasonable efforts to provide advance notice of planned maintenance when feasible.",
    },

    { type: "heading", text: "5. Acceptable Use" },
    { type: "paragraph", text: "You agree not to use the Platform in any way that:" },
    {
      type: "bullets",
      items: [
        "Violates any applicable federal, state, or local law or regulation.",
        "Infringes or misappropriates the intellectual property, privacy, or other rights of any third party.",
        "Involves transmitting any malicious code, virus, worm, or other harmful technology.",
        "Attempts to gain unauthorized access to the Platform, other user accounts, or any systems or networks connected to the Platform.",
        "Interferes with, disrupts, or places an unreasonable burden on the Platform or its infrastructure.",
        "Uses any automated system, including bots, scrapers, or crawlers, to access or extract data from the Platform without our prior written consent.",
        "Reverse engineers, decompiles, disassembles, or otherwise attempts to derive the source code of the Platform.",
        "Removes, alters, or obscures any proprietary notices, labels, or marks on the Platform.",
        "Uses the Platform to collect, store, or transmit the personal information of other users.",
        "Uses the Platform for any purpose other than its intended use as a personal financial coaching tool.",
      ],
    },

    { type: "heading", text: "6. In-App Messaging" },
    {
      type: "paragraph",
      text: "6.1 Purpose. The Platform includes an in-app messaging feature designed for communication between you and your coach related to your coaching engagement. You agree to use in-app messaging only for this purpose.",
    },
    {
      type: "paragraph",
      text: "6.2 Prohibited Content. You may not use in-app messaging to send content that is: (i) threatening, abusive, harassing, defamatory, or obscene; (ii) fraudulent or deceptive; (iii) in violation of any applicable law; or (iv) spam, solicitations, or advertising of any kind.",
    },
    {
      type: "paragraph",
      text: "6.3 No Expectation of Real-Time Response. In-app messages are not monitored in real time. Response times may vary based on your coach's availability and your service tier.",
    },
    {
      type: "paragraph",
      text: "6.4 Retention. In-app messages are retained in accordance with the data retention and deletion terms described in our Privacy Policy and your Coaching Agreement. Upon account closure, messages are subject to the thirty (30) day export and permanent deletion process described in those documents.",
    },

    { type: "heading", text: "7. User Content" },
    {
      type: "paragraph",
      text: '7.1 Your Content. You may submit, upload, or share information through the Platform in connection with your coaching engagement, including financial data, notes, goals, and messages (collectively, "User Content"). You retain ownership of your User Content.',
    },
    {
      type: "paragraph",
      text: "7.2 License to Steadwell. By submitting User Content, you grant Steadwell a limited, non-exclusive, non-transferable license to use, process, and store your User Content solely for the purpose of providing the coaching services and operating the Platform. This license terminates when your User Content is deleted from our systems in accordance with the data retention terms in our Privacy Policy and your Coaching Agreement.",
    },
    {
      type: "paragraph",
      text: "7.3 Your Responsibility. You are solely responsible for the accuracy, legality, and appropriateness of your User Content. We do not monitor, verify, or endorse User Content.",
    },

    { type: "heading", text: "8. Intellectual Property" },
    {
      type: "paragraph",
      text: "8.1 Platform Ownership. The Platform, including its design, code, features, functionality, user interface, graphics, logos, and all related documentation, is the exclusive property of Steadwell and is protected by copyright, trademark, trade secret, and other intellectual property laws. Nothing in these Terms grants you any ownership interest in the Platform.",
    },
    {
      type: "paragraph",
      text: "8.2 Coaching Materials. Ownership and permitted use of coaching frameworks, templates, methodologies, and your Financial Foundation Plan are governed by the Intellectual Property provisions of your Coaching Agreement.",
    },
    {
      type: "paragraph",
      text: '8.3 Trademarks. "Steadwell," the Steadwell logo, "Financial Foundation Plan," "Accountability Track," and related names and marks are trademarks of Boldly Built LLC. You may not use these marks without our prior written consent.',
    },
    {
      type: "paragraph",
      text: "8.4 Feedback. If you provide feedback, suggestions, or ideas regarding the Platform, we may use them without restriction or compensation, as further described in your Coaching Agreement.",
    },

    { type: "heading", text: "9. Third-Party Services" },
    {
      type: "paragraph",
      text: "The Platform integrates with third-party services to deliver its functionality, including Stripe for payment processing, Google Calendar for scheduling, Supabase for data storage, Vercel for hosting, and Resend for transactional email. Your use of these third-party services is subject to their respective terms and privacy policies. We are not responsible for the acts, omissions, or policies of any third-party service provider.",
    },

    { type: "heading", text: "10. Disclaimers" },
    {
      type: "paragraph",
      text: 'Platform Provided "As Is." To the maximum extent permitted by law, the Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express, implied, or statutory, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.',
    },
    {
      type: "paragraph",
      text: "No Warranty of Results. We do not warrant that the Platform will meet your requirements, that access will be uninterrupted, timely, secure, or error-free, or that any defects will be corrected.",
    },
    {
      type: "paragraph",
      text: "Educational Services Only. All services accessible through the Platform are educational financial coaching services, not regulated financial services. The disclaimers and limitations in your Coaching Agreement apply in full.",
    },

    { type: "heading", text: "11. Limitation of Liability" },
    {
      type: "paragraph",
      emphasis: true,
      text: "To the maximum extent permitted by law, Steadwell's total aggregate liability arising out of or related to these Terms or your use of the Platform, whether in contract, tort, or otherwise, shall not exceed the total fees actually paid by you to Steadwell in the twelve (12) months preceding the event giving rise to the claim, or one hundred dollars ($100), whichever is greater.",
    },
    {
      type: "paragraph",
      text: "In no event shall Steadwell be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, loss of savings, or financial losses resulting from your financial decisions, even if Steadwell has been advised of the possibility of such damages.",
    },
    {
      type: "paragraph",
      text: "These limitations reflect a fair allocation of risk between the parties and are an essential basis of the bargain between you and Steadwell. Steadwell would not provide the Platform without these limitations.",
    },

    { type: "heading", text: "12. Indemnification" },
    {
      type: "paragraph",
      text: "You agree to indemnify, defend, and hold harmless Steadwell and its members, managers, officers, employees, and agents from and against any claims, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (i) your violation of these Terms; (ii) your use of the Platform; (iii) your User Content; or (iv) your violation of any applicable law or the rights of any third party.",
    },

    { type: "heading", text: "13. Account Suspension and Termination" },
    {
      type: "paragraph",
      text: "13.1 Termination by You. You may close your account at any time by contacting us at info@boldlybuilt.group or through the account settings on the Platform. Closing your account triggers the data retention and export terms in the Privacy Policy and your Coaching Agreement.",
    },
    {
      type: "paragraph",
      text: "13.2 Suspension or Termination by Steadwell. We may suspend or terminate your access to the Platform, without prior notice and without liability, if we reasonably believe that you have: (i) violated these Terms or the Coaching Agreement; (ii) engaged in conduct that is harmful or potentially harmful to Steadwell, other users, or third parties; (iii) created legal or regulatory risk for Steadwell; or (iv) failed to pay fees when due.",
    },
    {
      type: "paragraph",
      text: "13.3 Effect of Termination. Upon termination for any reason: (i) your license to use the Platform immediately ends; (ii) you must stop using the Platform; and (iii) the data retention and export provisions of the Privacy Policy and Coaching Agreement apply. Termination does not relieve you of any obligation to pay fees already owed.",
    },
    {
      type: "paragraph",
      text: "13.4 Survival. Sections 1 (Relationship to Other Agreements), 7.2 (License to Steadwell), 8 (Intellectual Property), 10 (Disclaimers), 11 (Limitation of Liability), 12 (Indemnification), 14 (Dispute Resolution), 16 (General Provisions), and 17 (Governing Law) survive termination of these Terms.",
    },

    { type: "heading", text: "14. Dispute Resolution" },
    {
      type: "paragraph",
      text: "14.1 Consistent with Coaching Agreement. The dispute resolution procedures in these Terms mirror those in the Coaching Agreement so that all disputes related to Steadwell — whether about the Platform or the coaching services — follow the same process.",
    },
    {
      type: "paragraph",
      text: "14.2 Informal Resolution. Before initiating any formal dispute proceeding, the Party raising the dispute shall send written notice to the other Party at the email address on file describing the dispute in reasonable detail. The Parties shall attempt in good faith to resolve the dispute through direct communication for a period of thirty (30) days from the date of such notice.",
    },
    {
      type: "paragraph",
      text: `14.3 Binding Arbitration. If the dispute is not resolved through the informal process described in Section 14.2, either Party may submit the dispute to final and binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules then in effect. The arbitration shall be conducted remotely by videoconference unless both Parties agree in writing to an in-person proceeding, in which case the arbitration shall take place in Harris County, Texas. The arbitrator's decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction. The Parties agree that the Federal Arbitration Act (9 U.S.C. §§ 1 et seq.) governs the interpretation and enforcement of this arbitration provision.`,
    },
    {
      type: "paragraph",
      text: "14.4 Class Action Waiver. You and Steadwell each agree that any dispute resolution proceeding will be conducted only on an individual basis and not as part of a class, consolidated, or representative action. If for any reason a claim proceeds in court rather than in arbitration, you and Steadwell each waive any right to a jury trial.",
    },
    {
      type: "paragraph",
      text: "14.5 Small Claims Exception. Either Party may bring an individual action in small claims court if the claim falls within that court's jurisdictional limits. You may file in the small claims court in your county of residence or in Harris County, Texas. Steadwell may file in Harris County, Texas.",
    },
    {
      type: "paragraph",
      text: "14.6 Severability of Dispute Resolution Provisions. If any portion of the arbitration agreement or class action waiver in this Section 14 is found to be unenforceable under the law of your state of residence, that portion shall be severed and the remaining provisions of this Section 14 shall continue in full force and effect. If the class action waiver in Section 14.4 is found unenforceable with respect to a particular claim, that claim and only that claim must be severed from arbitration and may proceed in court, while the remaining claims shall be arbitrated.",
    },
    {
      type: "paragraph",
      text: "14.7 Fees. Each Party shall bear its own costs and attorneys' fees in any dispute, unless the arbitrator or court determines that a claim was frivolous, in which case the non-prevailing Party shall pay the prevailing Party's reasonable attorneys' fees.",
    },

    { type: "heading", text: "15. Changes to These Terms" },
    {
      type: "paragraph",
      text: 'We may update these Terms from time to time. When we make material changes, we will update the "Last Updated" date at the top of this page and notify you by email at the address associated with your account or by posting a prominent notice on the Platform at least thirty (30) days before the changes take effect. Your continued use of the Platform after the effective date of revised Terms constitutes your acceptance of the changes. If you do not agree to the revised Terms, you must stop using the Platform and close your account.',
    },

    { type: "heading", text: "16. General Provisions" },
    {
      type: "paragraph",
      text: "16.1 Entire Agreement. These Terms, together with the Coaching Agreement and the Privacy Policy, constitute the entire agreement between you and Steadwell with respect to the Platform and supersede all prior or contemporaneous communications, representations, or agreements, whether oral or written.",
    },
    {
      type: "paragraph",
      text: "16.2 Severability. If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court or arbitrator of competent jurisdiction, the remaining provisions shall remain in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving the original intent.",
    },
    {
      type: "paragraph",
      text: "16.3 Waiver. The failure of either Party to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver must be in writing and signed by the waiving Party to be effective.",
    },
    {
      type: "paragraph",
      text: "16.4 Assignment. You may not assign or transfer these Terms or any rights under them without our prior written consent. Steadwell may assign these Terms in connection with a merger, acquisition, or sale of substantially all of its assets without your consent.",
    },
    {
      type: "paragraph",
      text: "16.5 Notices. Any notice required under these Terms shall be sent to the email address on file for each Party and shall be deemed received on the date sent. Notices to Steadwell may also be sent to info@boldlybuilt.group.",
    },
    {
      type: "paragraph",
      text: "16.6 Force Majeure. Steadwell shall not be liable for any delay or failure to perform under these Terms due to causes beyond Steadwell's reasonable control, including natural disasters, government actions, internet or technology failures, pandemics, or other force majeure events.",
    },
    {
      type: "paragraph",
      text: "16.7 Headings. Section headings are for convenience only and do not affect the interpretation of these Terms.",
    },
    {
      type: "paragraph",
      text: "16.8 Electronic Communications. By creating an account on the Platform, you consent to receive electronic communications from Steadwell, including emails sent through Resend and in-app messages. You agree that all agreements, notices, disclosures, and other communications we provide to you electronically satisfy any legal requirement that such communications be in writing.",
    },

    { type: "heading", text: "17. Governing Law" },
    {
      type: "paragraph",
      text: "These Terms shall be governed by, construed, and enforced in accordance with the laws of the State of Texas, without regard to its conflict-of-laws principles. The arbitration provision in Section 14 is governed by the Federal Arbitration Act.",
    },

    { type: "heading", text: "18. Contact Us" },
    { type: "paragraph", text: "If you have questions about these Terms, contact us at:" },
    { type: "paragraph", text: "Steadwell (Boldly Built LLC)" },
    { type: "paragraph", text: "5900 Balcones Dr #15349, Austin, TX 78731" },
    { type: "paragraph", text: "info@boldlybuilt.group" },
  ];
}
