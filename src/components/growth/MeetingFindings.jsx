import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets } from "./briefUi";

const evidence = [
  {
    t: "22:27–26:35",
    who: "Yhan / Emilio",
    said:
      "\"I've been getting the check ins daily… it's not resolving my page.\" Resolved by sending signed-out users to login, then back to the check-in.",
    means:
      "The daily check-in email is the front door for the whole product. A broken link there is a broken first impression, and it had been broken long enough for a customer to lead the call with it.",
    so: "Fix and regression-test before inviting Ebony or Orion.",
    tag: "Blocker",
  },
  {
    t: "43:03–43:34",
    who: "Emilio",
    said:
      "SSO needs an API connection and a Microsoft tenant ID; once configured, anyone authorised on the Go Flat Bridge domain signs in with work credentials.",
    means:
      "Microsoft SSO is a hard gate for every serious BPO conversation, and it is configuration rather than engineering.",
    so: "Package SSO into the paid bands, not the free tier.",
    tag: "Gate",
  },
  {
    t: "44:08",
    who: "Emilio",
    said:
      "After the API connection, the Teams app becomes the distribution surface — 'they can go right in, chat and ask questions'.",
    means:
      "Teams is your acquisition channel inside an account. It also means the manager never has to visit a marketing site.",
    so: "Treat Teams install as an activation milestone, not a feature.",
    tag: "Channel",
  },
  {
    t: "39:30–40:37",
    who: "Yhan",
    said:
      "\"The Homebase API… they don't have that… low hanging fruit that we can populate.\" Attendance becomes the fifth point of the story.",
    means:
      "This is the differentiator Yhan keeps returning to: objective operational data next to subjective self-report.",
    so: "Make attendance evidence the spine of the pitch, not a feature list item.",
    tag: "Wedge",
  },
  {
    t: "46:34–47:29",
    who: "Emilio",
    said:
      "\"The people on the ground won't get a page. They'll just get an email with a link to complete their check in.\"",
    means:
      "Frontline staff never log in, so they never consume a seat. This is the single most exploitable pricing fact in the call.",
    so: "Price on managers. Market unlimited frontline check-ins as free.",
    tag: "Pricing",
  },
  {
    t: "52:26–55:08",
    who: "Emilio / Yhan",
    said:
      "Role ladder explained: Staff → User Level 1 → User Level 2 → Analyst → Super Admin → Partner Business Admin; Yhan asked for it reordered to follow hierarchy. Add-on permissions can carry an expiry date.",
    means:
      "Your role model already maps to commercial packaging: Partner Business Admin is a channel/partner licence waiting to be sold.",
    so: "Sell the partner tier explicitly; it is already built.",
    tag: "Packaging",
  },
  {
    t: "56:04–56:34",
    who: "Emilio / Yhan",
    said:
      "Import template needs tier, track, department and sector; sector feeds benchmarking and a sector research agent.",
    means:
      "Sector is a data asset. It also means every signup should capture sector and company size at the door.",
    so: "Capture size band and sector in the free signup form.",
    tag: "Data",
  },
  {
    t: "57:28–59:11",
    who: "Yhan / Emilio",
    said:
      "\"You're not selling them per seat, you're selling them a flat base for the year\" — flat rate based on organisation size; ~$35,000/year for 3,000–5,000 people for the platform alone.",
    means:
      "Your instinct is already flat-by-band, which is the correct model for manager-led accounts and the opposite of Engagedly.",
    so: "Formalise the bands; keep the enterprise anchor at $35k.",
    tag: "Pricing",
  },
  {
    t: "59:58–01:00:06",
    who: "Emilio",
    said:
      "\"Smaller organisations need more consulting… I can charge a smaller rate, but there will be consulting.\"",
    means:
      "Small accounts are consulting-heavy. The platform must be cheap; the human work must be a separate paid line.",
    so: "Split configuration/implementation from platform subscription.",
    tag: "Economics",
  },
  {
    t: "01:00:17–01:05:27",
    who: "Yhan",
    said:
      "A partner pays ~$6,000–7,000/year for Engagedly at ~40 people; used for engagement surveys, kudos and year-end reviews that are 'all subjective'; 'it doesn't track attendance'.",
    means:
      "That is ~$200 per person per year for a product the buyer describes as subjective and incomplete on operations.",
    so: "Anchor the comparison at per-manager cost, not per-employee.",
    tag: "Competitor",
  },
  {
    t: "01:05:59–01:06:33",
    who: "Yhan",
    said:
      "\"Price point and capturing stuff that Engagedly isn't… price point, price point, price point. And something more customised.\"",
    means:
      "Your buyer has told you the entire positioning. Price and specificity, not breadth.",
    so: "Position as the affordable, operational, manager-first alternative.",
    tag: "Positioning",
  },
  {
    t: "01:03:43–01:03:53",
    who: "Yhan",
    said:
      "\"The Caribbean business place wouldn't spend that. But maybe they've come in at two to three grand, which would make sense for them.\"",
    means:
      "Regional willingness to pay for a 40-person firm sits around $2,000–3,000. That is the real ceiling for the entry band.",
    so: "Set the first paid band at $2–3k, not $5k.",
    tag: "Pricing",
  },
  {
    t: "01:06:33–01:07:02",
    who: "Emilio",
    said:
      "\"If it's seven grand for 40 people… I can do like three to five.\"",
    means:
      "You had already landed on $3,000–5,000 before this brief. The bands below simply formalise it.",
    so: "Confirm $3,000 as the opening paid band; test $3,500 later.",
    tag: "Pricing",
  },
  {
    t: "01:07:45–01:08:16",
    who: "Yhan",
    said:
      "Large BPOs of 1,500–7,000 people: a $25,000–30,000 project plus roughly $300/month to keep it running.",
    means:
      "Enterprise is a services-led sale with a small recurring tail. Do not try to run it through self-serve checkout.",
    so: "Keep enterprise as quote-only with implementation attached.",
    tag: "Packaging",
  },
  {
    t: "01:12:41–01:14:15",
    who: "Yhan",
    said:
      "Breezy: free starter pack first ('they baited me in'), then a monthly subscription; stop paying and you revert to the starter pack with data greyed out but downloadable; re-subscribe when the next hiring cycle arrives.",
    means:
      "Free-first, pause-friendly, data-retained. This is the exact mechanic Yhan is telling you to copy.",
    so: "Build pause/resume on the monthly entry plan.",
    tag: "Free entry",
  },
  {
    t: "01:14:34–01:15:08",
    who: "Yhan",
    said:
      "Homebase was free for roughly two years of tracking, and then 'we eventually bought into the product'.",
    means:
      "Free can run for years and still convert, provided the free tier keeps holding the customer's data.",
    so: "Judge free on retention and cost, not on a 30-day conversion deadline.",
    tag: "Free entry",
  },
  {
    t: "01:15:22–01:15:39",
    who: "Emilio / Yhan",
    said:
      "\"Maybe I should think about what would be a high value free version… that gives just enough. Or even access to everything for a limited time.\"",
    means:
      "Two different instruments were proposed and never separated: a scope-capped free tier and a time-capped full-access trial.",
    so: "Run both, never in the same sentence.",
    tag: "Free entry",
  },
  {
    t: "01:07:02–01:07:31",
    who: "Yhan",
    said:
      "Train delivery capacity in Jamaica or India and let them carry the heavy lifting while you sit on top.",
    means:
      "Small-account economics only work with low-cost delivery capacity. This is a prerequisite, not an optimisation.",
    so: "Hire before scaling small accounts beyond ~10 tenants.",
    tag: "Capacity",
  },
  {
    t: "01:18:42–01:20:50",
    who: "Yhan / Emilio",
    said:
      "Yhan wants to load his own client training into the platform; agreed to surface a training card on Practice with completion counts and compliance first.",
    means:
      "Customers want to bring their own content. That is a paid-tier reason and a retention hook.",
    so: "Put learning authoring in paid bands, not free.",
    tag: "Product",
  },
];

const openItems = [
  "Homebase API integration — attendance as the fifth metric. Owner: Emilio. Blocks the core differentiator story.",
  "Microsoft Entra ID / SSO configuration for Go Flat Bridge. Owner: Emilio + Yhan.",
  "Teams app visibility and in-Teams AI conversation — next phase after SSO.",
  "Invite Ebony and Orion once the check-in flow is proven, with real data in place.",
  "Yhan to finish the question list and the user import template with tier, track and sector.",
  "Pricing model still undecided on the call — this brief is the answer.",
  "Clean demo/development records and talent scorecard before inviting the next cohort.",
  "Dark-mode contrast fixes deferred to the back end of the build.",
];

export default function MeetingFindings() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="What the call actually said">Evidence from the implementation call</SectionHeading>
        <Lead>
          Twenty items pulled directly from the transcript, in time order, separated from interpretation.
          Timestamps refer to the recording as transcribed. The transcript is machine-generated, so names and
          figures carry noise — for example the speaker label reads "yhan hendricks", "attendant tracking"
          appears where attendance is meant, and the Homebase billing figures appear as "815437" and "1972".
          Where a number mattered to a decision, this brief uses the spoken context rather than the raw string.
        </Lead>
      </div>

      <DataTable
        dense
        columns={[
          { key: "t", label: "Time", className: "whitespace-nowrap w-[92px]" },
          { key: "said", label: "What was said", className: "w-[42%]" },
          { key: "means", label: "What it means commercially", className: "w-[32%]" },
          { key: "so", label: "So what", className: "w-[22%]" },
        ]}
        rows={evidence.map((e) => ({
          t: (
            <div className="space-y-1">
              <span className="block text-xs font-bold tabular-nums text-foreground">{e.t}</span>
              <span className="block text-[11px] text-muted-foreground">{e.who}</span>
            </div>
          ),
          said: <span className="text-[13px]">{e.said}</span>,
          means: (
            <div className="space-y-1.5">
              <span className="inline-flex rounded-md bg-[#0202ff]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0202ff] dark:text-blue-300">
                {e.tag}
              </span>
              <p className="text-[13px]">{e.means}</p>
            </div>
          ),
          so: <span className="text-[13px] text-muted-foreground">{e.so}</span>,
        }))}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Decisions that were effectively made</p>
          <Bullets
            className="mt-2"
            items={[
              "Flat rate based on organisation size, not per seat.",
              "Small organisations get a lower rate plus paid consulting.",
              "Enterprise (~3,000–5,000 people) anchors at about $35,000/year for the platform.",
              "A starter package for small business should exist.",
              "Staff records live in the platform, but frontline staff never log in.",
              "Partner Business Admin exists to let a partner administer multiple tenants.",
              "Configuration only for now; white-label waits until data can be segregated.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Still open after the call</p>
          <Bullets className="mt-2" items={openItems} />
        </div>
      </div>

      <Callout tone="accent" title="The one sentence to keep">
        <p>
          Yhan said the reason to choose Curiosity Led over Engagedly is "price point, price point, price
          point. And something more customised to me." That is not a discount strategy — it is a
          positioning statement from the buyer's own mouth, and it should be the first line of the pricing
          page.
        </p>
      </Callout>
    </div>
  );
}