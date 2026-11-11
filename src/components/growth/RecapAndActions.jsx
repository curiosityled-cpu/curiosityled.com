import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const emilio = [
  {
    a: "Send signed-out users from the check-in link to login, then back to the check-in rather than into the app.",
    why: "The daily email is the product's front door; this was the first thing raised on the call.",
    status: <Tag tone="danger">Blocker</Tag>,
  },
  {
    a: "Fix missed check-in backfill so AI-generated questions are included when a check-in is backdated.",
    why: "Backdating is sold as a feature; without the AI questions a backfilled record is not comparable to a live one.",
    status: <Tag tone="warning">Correctness</Tag>,
  },
  {
    a: "Clean up development records, the K-box and the talent scorecard to leave a fresh environment.",
    why: "Every demo and new invite currently shows old demo noise. Cheap to fix, disproportionate effect on trust.",
    status: <Tag tone="default">Housekeeping</Tag>,
  },
  {
    a: "Fix dark-mode contrast where controls such as \"complete missed check-in\" are invisible.",
    why: "A primary action that disappears is a support ticket every single time, and it is the kind of thing reviewers write down.",
    status: <Tag tone="warning">UI</Tag>,
  },
  {
    a: "Configure Microsoft SSO once the tenant ID and API connection details arrive from Yhan.",
    why: "SSO is a procurement gate above roughly 100 managers, so it belongs in paid bands, not the free tier.",
    status: <Tag tone="accent">Gate</Tag>,
  },
  {
    a: "Add the development card to the homepage so training and learning content is visible.",
    why: "Content already bought but not surfaced is the cheapest retention win available.",
    status: <Tag tone="good">Quick win</Tag>,
  },
  {
    a: "Propose a pricing model including a starter or small-business package.",
    why: "Answered by this brief — see the Pricing & packaging and FREE strategy tabs.",
    status: <Tag tone="good">Done here</Tag>,
  },
];

const yhan = [
  {
    a: "Return the updated user import template and the finalised check-in question list by end of day.",
    why: "The question list defines what the product measures; the template defines whether onboarding works on the first try.",
    status: <Tag tone="danger">Blocker</Tag>,
  },
  {
    a: "Invite Ebony now and prepare Rain's access by end of week.",
    why: "Two real users with real titles is the point at which the hierarchy and the reminders are genuinely tested.",
    status: <Tag tone="warning">Sequenced</Tag>,
  },
  {
    a: "Ensure job titles are entered correctly in the hierarchy before each user is added.",
    why: "Title drives tier and track, which drive which check-in questions a person sees. Wrong title, wrong questions.",
    status: <Tag tone="accent">Data quality</Tag>,
  },
  {
    a: "Explore the Homebase API so attendance can feed the platform.",
    why: "The differentiator Yhan returned to three times: objective attendance beside subjective self-report.",
    status: <Tag tone="good">Wedge</Tag>,
  },
];

const recapBlocks = [
  {
    t: "Access and domain",
    d: "Check-ins were not opening from the app — a redirect problem, fixed. Yhan recovered his Microsoft account, is taking the domain over from Clive to rename and set up properly, and is finishing the question list for review today. Both agreed questions get revisited once real users give feedback.",
  },
  {
    t: "System issues and integration",
    d: "Testing and technical validation of the links ran during the call. Yhan wants team alignment before presenting to stakeholders, and named the Homebase API as the way to answer the metrics and attendance questions.",
  },
  {
    t: "Single sign-on",
    d: "SSO needs an API connection and a Microsoft tenant ID, then a feed test. Users land on the lead page after signing in. Check-ins can be backdated; administrators see detail pages, regular users receive emailed links instead.",
  },
  {
    t: "HRIS and roles",
    d: "Staff data and notifications run through Teams and email. Development records and the talent scorecard get cleaned before Ebony and Rain arrive. Emilio walked the role ladder — user levels, analyst, admin levels — and Yhan asked for it reordered to follow hierarchy.",
  },
  {
    t: "Pricing and features",
    d: "Configuration is offered, customisation is not, because of current technical limits. Flat rate of $35,000 per year for 3,000–5,000 people; smaller organisations pay less with consulting attached; competitive positioning against Engagedly was discussed.",
  },
  {
    t: "Pricing strategy",
    d: "Yhan proposed competing on price at $3–5K against Engagedly's $7K for 40 users, opening with a free tier or limited-time access to attract smaller clients, then moving up to BPOs of 1,500–7,000 employees. He demonstrated Breezy HR's tiered model; Emilio agreed to consider the model and to add training features.",
  },
];

export default function RecapAndActions() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="The meeting record">Platform recap and action items</SectionHeading>
        <Lead>
          The summary the meeting tool produced, reproduced here so the brief carries its own record of what was
          agreed and who owed what. Action items are grouped by owner and each one is annotated with why it
          matters commercially, not just technically.
        </Lead>
      </div>

      <Callout tone="default" title="Quick recap, as recorded">
        <p>
          Emilio and Yhan resolved technical issues with the check-in system, including problems with the app
          redirect and login functionality. They reviewed the user hierarchy, with roles ranging from staff to
          super admin, and discussed configuring Microsoft single sign-on. Yhan shared competitor pricing —
          Engagedly costs $7,000 annually for 40 users — suggesting Curiosity Led could position at $3,000–5,000
          annually for smaller organisations. They also explored adding training features and discussed
          offering a free starter version similar to Breezy's approach.
        </p>
      </Callout>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Where the brief answers the call</p>
          <Bullets
            className="mt-2"
            items={[
              "\"Propose a pricing model including a starter package\" — answered in Pricing & packaging and FREE strategy.",
              "\"Consider the pricing model\" — the band architecture, the $3,000 opening band and the $35,000 enterprise anchor are all specified there.",
              "\"Add training features\" — handled as a packaging decision: learning authoring belongs in paid bands, consumption stays free.",
              "The Homebase attendance feed is sequenced as the enterprise pilot in the 30/60/90 plan rather than left as an open exploration.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What the action list tells you about the business</p>
          <Bullets
            className="mt-2"
            items={[
              "Seven of eleven actions are delivery, not growth. The product still needs hardening before a free tier amplifies it.",
              "Two actions are pure data quality — titles and import templates. Getting those right is what makes tier-based question targeting work.",
              "Only one action is commercial, and it is the one this brief exists to close.",
              "The sequencing is already correct: fix, clean, configure SSO, then invite. Keep that order and the free tier will not leak.",
              "Names differ slightly between the transcript and this summary (Rain vs Orion); Yhan's list is authoritative.",
            ]}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Emilio — product and commercial</p>
        <DataTable
          dense
          columns={[
            { key: "a", label: "Action", className: "w-[46%]" },
            { key: "why", label: "Why it matters commercially", className: "w-[42%]" },
            { key: "status", label: "Type", className: "w-[12%]" },
          ]}
          rows={emilio.map((r) => ({
            a: <span className="text-[13px] font-medium text-foreground">{r.a}</span>,
            why: <span className="text-[13px] text-muted-foreground">{r.why}</span>,
            status: r.status,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Yhan — customer side</p>
        <DataTable
          dense
          columns={[
            { key: "a", label: "Action", className: "w-[46%]" },
            { key: "why", label: "Why it matters commercially", className: "w-[42%]" },
            { key: "status", label: "Type", className: "w-[12%]" },
          ]}
          rows={yhan.map((r) => ({
            a: <span className="text-[13px] font-medium text-foreground">{r.a}</span>,
            why: <span className="text-[13px] text-muted-foreground">{r.why}</span>,
            status: r.status,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">How the conversation broke down</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {recapBlocks.map((b) => (
            <div key={b.t} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[13px] font-bold text-foreground">{b.t}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </div>

      <Callout tone="warning" title="One thing to correct before it spreads">
        <p>
          The summary records that users would be "automatically directed to the lead page after logging in".
          For a manager that is right; for a frontline staff member arriving from an emailed check-in link it is
          exactly the redirect problem that opened the call. Sign-in should return the person to what they were
          doing, and only fall back to the lead page when there was no destination.
        </p>
      </Callout>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3.5">
        <Tag tone="accent">Next checkpoint</Tag>
        <span className="text-sm text-muted-foreground">
          Ebony invited, Rain queued, titles correct, SSO feed tested, and the first paid band published — that
          is a coherent two-week finish line for the list above.
        </span>
      </div>
    </div>
  );
}