import React from "react";
import { Callout, DataTable, Stat, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const A = "11 Nov 2026";

const coverage = [
  {
    area: "Pricing page",
    read: "All eight module prices, the \"All the above suites include\" list, the additional suites, and the supported-integrations block.",
    found: "Per user per month, billed annually. A published minimum of $7,500 per year.",
    ok: true,
  },
  {
    area: "Demo path",
    read: "The \"Book a Demo\" button, which is the only call to action offered anywhere on the pricing page.",
    found: "No signup, no card, no self-serve checkout, no price calculator.",
    ok: true,
  },
  {
    area: "Homepage and positioning",
    read: "Positioning statement, customer-count claim, awards, and the six-category product framing.",
    found: "AI talent management, \u201ctrusted by over 5,000 global HR professionals\u201d, Brandon Hall awards.",
    ok: true,
  },
  {
    area: "Partner and marketplace pages",
    read: "The ADP Marketplace integration page and its announcement, plus the integration-partners page.",
    found: "Distribution through ADP's marketplace, including a \u201cStart A Free Trial\u201d button inside that listing.",
    ok: true,
  },
  {
    area: "Content and comparison library",
    read: "Their own buying-guide and versus pages (Engagedly vs PerformYard, best-engagement-software listicles).",
    found: "A large comparison-SEO engine that ranks Engagedly first in its own listicles.",
    ok: true,
  },
  {
    area: "Review sites and third-party write-ups",
    read: "G2 pricing page, Capterra pricing page, Tech.co's pricing guide, ITQlick, CultureMonkey's checked comparison.",
    found: "Corroborates the rates and the $7,500 floor; disagrees sharply on whether a trial exists.",
    ok: true,
  },
  {
    area: "Contract terms, fees, customer count, revenue",
    read: "Looked for published contract length, implementation fee, customer total, and ARR.",
    found: "Not published. One third-party source claims a 3-year contract; unconfirmed by Engagedly.",
    ok: false,
  },
  {
    area: "Inside their sales process",
    read: "Nothing beyond public material exists to read.",
    found: "Sequence after the demo form \u2014 qualification, pilot, procurement \u2014 is unknown and marked as such.",
    ok: false,
  },
];

const pricing = [
  { m: "Performance Suite", p: "$5\u20138", note: "Reviews, 360, goals & OKRs, feedback, 1:1s, competencies, skills" },
  { m: "Learning Suite", p: "$3\u20135", note: "LMS, paths, AI recommendations, compliance, certification" },
  { m: "Engage & Listen Suite", p: "$2", note: "Engagement surveys, Butterfly EI, team pulse, intranet" },
  { m: "Recognize & Reward Suite", p: "$2", note: "Gamification, badges, gift storefront, praise wall" },
  { m: "Talent Mobility Suite", p: "$2", note: "Growth, IDPs, career paths, succession, skill gaps" },
  { m: "Mentoring Suite", p: "$8", note: "Matching, program management, mentoring university add-on" },
  { m: "Manage Compensation", p: "$10", note: "Comp planning, budgets, pay-for-performance, benchmarking" },
  { m: "Deskless Communication", p: "$5", note: "Comms hub, SMS & push, e-learning, surveys, recognition" },
];

const floor = [
  {
    seats: "20 managers",
    calc: "20 \u00d7 $8 \u00d7 12 = $1,920",
    paid: "$7,500 \u2014 the floor",
    per: "$31.25",
  },
  {
    seats: "40 managers (Yhan's account)",
    calc: "40 \u00d7 $8 \u00d7 12 = $3,840",
    paid: "$7,500 \u2014 the floor",
    per: "$15.63",
  },
  {
    seats: "78 managers",
    calc: "78 \u00d7 $8 \u00d7 12 = $7,488",
    paid: "Floor and seat price meet",
    per: "$8.00",
  },
  {
    seats: "125 managers (cheapest suite)",
    calc: "125 \u00d7 $5 \u00d7 12 = $7,500",
    paid: "Floor and seat price meet",
    per: "$5.00",
  },
  {
    seats: "500 managers",
    calc: "500 \u00d7 $8 \u00d7 12 = $48,000",
    paid: "$48,000",
    per: "$8.00",
  },
];

const trialSignals = [
  {
    src: "Engagedly's own pricing page",
    says: "Every path is \u201cBook a Demo\u201d. No free plan, no trial link, no signup.",
    conf: <Tag tone="good">Direct</Tag>,
  },
  {
    src: "ADP Marketplace listing",
    says: "Offers \u201cStart A Free Trial\u201d inside the marketplace, not on Engagedly's own site.",
    conf: <Tag tone="good">Direct</Tag>,
  },
  {
    src: "G2 pricing page",
    says: "\u201cEngagedly offers a free trial\u201d, while also stating the vendor has not listed costs on G2.",
    conf: <Tag tone="warning">Conflict</Tag>,
  },
  {
    src: "Tech.co pricing guide",
    says: "\u201cNo free trial available\u201d, and claims a 3-year contract.",
    conf: <Tag tone="danger">Conflict</Tag>,
  },
  {
    src: "ITQlick",
    says: "No free trial, and no free version, at this time.",
    conf: <Tag tone="danger">Conflict</Tag>,
  },
  {
    src: "PeopleGoal comparison",
    says: "Contrasts itself with Engagedly on the basis that Engagedly offers demos, not a trial.",
    conf: <Tag tone="default">Indirect</Tag>,
  },
];

const acquisition = [
  {
    step: "1. Be found",
    detail:
      "A very large blog and resource library: buying guides, \u201cbest 20 employee engagement tools\u201d listicles that rank Engagedly first, and versus pages against named rivals. Comparison intent is farmed at scale, and the pricing page itself ranks for cost queries.",
    read: "Organic search is the top of their funnel, not ads and not product-led signup.",
  },
  {
    step: "2. Be shortlisted",
    detail:
      "Review-site presence is deliberately worked: 4.6 on Capterra with roughly 90 verified reviews, 4.3 on G2, Brandon Hall awards, and badges used on the homepage. Analysts and review sites are their credibility layer.",
    read: "They win the consideration set, then argue price inside a call rather than on a page.",
  },
  {
    step: "3. Enter through someone else's base",
    detail:
      "Listed on ADP Marketplace, with a trial button inside that listing, plus integration-partner pages for HRIS, SSO, workspace channels and content partners.",
    read: "Distribution is borrowed from payroll and HRIS vendors \u2014 the opposite of self-serve.",
  },
  {
    step: "4. Book a demo \u2014 the single conversion event",
    detail:
      "One form, one promise: explore scalable solutions for your team. No price is given before a human is involved, and no card is taken online.",
    read: "Every deal is sales-assisted. There is no motion for a 30-person firm that wants to start on a Sunday.",
  },
  {
    step: "5. Configure, then commit annually",
    detail:
      "Modules are selected per client and billed annually against a $7,500 minimum. Implementation and onboarding are assisted.",
    read: "The contract structure \u2014 not the feature set \u2014 is what excludes small companies.",
  },
  {
    step: "6. Expand the account",
    detail:
      "Eight stackable suites plus a mentoring-university add-on make land-and-expand the default growth model. Cross-sell into an installed base is cheaper than acquiring a new logo.",
    read: "Their revenue engine is expansion. Yours should be volume at the low end.",
  },
];

const implications = [
  {
    point: "The $7,500 floor is the real competitor price",
    detail:
      "Not the $2 or $5 headline. Anyone under roughly 78\u2013125 seats pays $7,500 a year whatever they pick, so the honest comparison for a 40-person firm is $7,500 versus your band price, not $2 versus $2.",
    where: "Pricing & packaging",
  },
  {
    point: "Yhan's ~$7,000 is essentially the floor",
    detail:
      "It sits just under the published minimum, which fits either a floor-level deal with a small discount or fewer seats than assumed. Either way the number is credible and should be quoted as customer-reported, not list.",
    where: "Assumptions & sources",
  },
  {
    point: "Their pricing page is a lead magnet, not a checkout",
    detail:
      "Publishing module prices buys them comparison traffic while keeping the actual quote human. Copy the transparency, not the gate: publish a real price and let people buy.",
    where: "Pricing & packaging",
  },
  {
    point: "The trial is a partner artefact, not a product strategy",
    detail:
      "Where a trial appears it is inside ADP's marketplace. That is a distribution concession, not a free tier, and it cannot serve a buyer who arrives from search.",
    where: "FREE strategy",
  },
  {
    point: "Their funnel needs a salesperson; yours must not",
    detail:
      "Six steps from discovery to contract, with a human at step four. A free tier is only an advantage if the buyer can complete the same journey alone in minutes.",
    where: "30/60/90 plan",
  },
  {
    point: "They compete on breadth; you should refuse to",
    detail:
      "Eight suites and four tiers of add-ons is a mid-market product. Copying scope means copying cost structure and the demo-led sale that goes with it.",
    where: "Recommendation",
  },
];

const unknown = [
  "Implementation or onboarding fee: not published anywhere we could read.",
  "Contract length: one third-party source says 3 years; Engagedly's own pages do not say so.",
  "Whether a card-less trial exists behind the demo form, granted at a rep's discretion.",
  "Total paying customers and revenue. \u201c5,000 HR professionals\u201d is a reach claim, not a customer count.",
  "Their smallest accepted deal and whether the $7,500 floor is ever discounted.",
  "What actually happens between demo and signature: pilot length, security review, procurement.",
];

const sources = [
  { s: "engagedly.com/pricing/", u: "https://engagedly.com/pricing/", n: "Module rates, suite contents, integrations, $7,500 minimum" },
  { s: "engagedly.com/request-demo/", u: "https://engagedly.com/request-demo/", n: "The demo form that is the only conversion path" },
  { s: "engagedly.com \u2014 ADP Marketplace guide", u: "https://engagedly.com/resources/integrations/adp-marketplace/", n: "\u201cStart A Free Trial\u201d inside the marketplace listing" },
  { s: "engagedly.com \u2014 integration partners", u: "https://engagedly.com/about-engagedly/partnerships/integration-partners/", n: "Partner-distributed integrations" },
  { s: "engagedly.com \u2014 Engagedly vs PerformYard", u: "https://engagedly.com/blog/engagedly-vs-performyard/", n: "Their own comparison content and restated per-seat range" },
  { s: "G2 \u2014 Engagedly pricing", u: "https://www.g2.com/products/engagedly/pricing", n: "$5\u20138 per user, $7,500 platform minimum; claims a free trial" },
  { s: "Capterra \u2014 Engagedly pricing", u: "https://www.capterra.com/p/143298/Engagedly/pricing/", n: "Four plans, from $2 per user per month" },
  { s: "Tech.co \u2014 pricing guide", u: "https://tech.co/hr-software/engagedly-review-pricing", n: "Claims no free trial and a 3-year contract" },
  { s: "ITQlick \u2014 plans and hidden fees", u: "https://www.itqlick.com/engagedly/pricing", n: "No free trial and no free version" },
  { s: "CultureMonkey \u2014 alternatives comparison", u: "https://www.culturemonkey.io/employee-engagement/culture-amp-alternatives/", n: "Prices re-checked against the vendor page in Nov 2026; lists a 500+ team minimum" },
  { s: "PeopleGoal \u2014 Engagedly vs PeopleGoal", u: "https://www.peoplegoal.com/blog/peoplegoal-vs-engagedly/", n: "Confirms Engagedly is demo-led rather than trial-led" },
];

export default function EngagedlyResearch() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker={`Research log \u00b7 ${A}`}>What Engagedly publishes, charges and how it sells</SectionHeading>
        <Lead>
          A sourced pass over Engagedly's own site and the third-party signals around it, to answer three
          questions the brief could previously only guess at: what they actually charge, whether a free or
          self-serve entry exists, and how a stranger becomes a customer. Coverage and its limits are stated
          explicitly below \u2014 including one finding that changes the comparison.
        </Lead>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Published floor" value="$7,500 / yr" sub="Minimum annual pricing stated on their pricing page and corroborated by G2." />
        <Stat label="Free tier" value="None" sub="No free plan, no self-serve signup, no card-only entry anywhere on their own site." />
        <Stat label="Entry motion" value="Demo \u2192 sales" sub="One form, then a human. Every deal is sales-assisted and billed annually." />
      </div>

      <Callout tone="accent" title="The finding that matters: a $7,500 floor, not a $2 price">
        <p>
          Their pricing page states that pricing varies by employee count and bundling, with a{" "}
          <strong className="font-semibold text-foreground">minimum of $7,500 per year</strong>. That single
          line reframes the whole comparison. At $8 per user per month on their most expensive core suite, a
          40-person firm would owe $3,840 \u2014 but pays $7,500. Below roughly 78 seats on the Performance
          Suite, or 125 on the cheapest suite, the floor sets the price and the per-seat rate is decoration.
        </p>
        <p>
          It also means Yhan's ~$7,000 is not an unusually good deal: it is the floor, or just under it. The
          competitor Curiosity Led is priced against is a $7,500 minimum, and that is the number a 40-person
          buyer actually faces.
        </p>
      </Callout>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">What the floor does to the effective per-head price</p>
        <DataTable
          dense
          columns={[
            { key: "seats", label: "Seat count", className: "w-[24%]" },
            { key: "calc", label: "At list price", className: "w-[26%]" },
            { key: "paid", label: "What they actually pay" },
            { key: "per", label: "Effective $/head/mo", className: "w-[16%]" },
          ]}
          rows={floor}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Arithmetic on published list rates at the top of each suite range ($8 Performance, $5 Learning, $2 the
          rest), billed annually. Real quotes may bundle differently; the floor is the constraint that binds.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Published module pricing, as it reads today</p>
        <DataTable
          dense
          columns={[
            { key: "m", label: "Suite", className: "w-[26%]" },
            { key: "p", label: "$/user/mo", className: "whitespace-nowrap w-[90px]" },
            { key: "note", label: "Contents" },
          ]}
          rows={pricing}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Identical to the figures in the Engagedly teardown tab, re-checked on {A}. The difference this pass
          adds is the annual minimum and the fact that quoted pricing \u201cmay vary based on employee count and
          bundling\u201d \u2014 so the page is a negotiation anchor rather than a rate card.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Does a free tier or trial exist? The signals disagree</p>
        <DataTable
          dense
          columns={[
            { key: "src", label: "Source", className: "w-[26%]" },
            { key: "says", label: "What it says" },
            { key: "conf", label: "Confidence", className: "w-[110px]" },
          ]}
          rows={trialSignals.map((r) => ({
            src: <span className="text-[13px] font-semibold text-foreground">{r.src}</span>,
            says: <span className="text-[13px] text-muted-foreground">{r.says}</span>,
            conf: r.conf,
          }))}
        />
        <div className="mt-3">
          <Callout tone="warning" title="Reading the conflict honestly">
            <p>
              The primary evidence is unambiguous: on Engagedly's own site there is no free plan and no trial
              \u2014 only a demo request. The trial that does exist lives inside ADP's marketplace and is a
              channel concession, not a product tier. Third-party sites contradict each other because they
              scrape and guess; where they claim a trial they do not show one.
            </p>
            <p>
              For planning purposes: treat Engagedly as having{" "}
              <strong className="font-semibold text-foreground">no free tier and no self-serve path</strong>, with
              a demo-gated sales-assisted trial at a rep's discretion. Any other reading is unverified.
            </p>
          </Callout>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">How a stranger becomes an Engagedly customer</p>
        <div className="space-y-2.5">
          {acquisition.map((a) => (
            <div key={a.step} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <p className="text-[13px] font-bold text-foreground">{a.step}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-right sm:shrink-0">
                  {a.read}
                </p>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{a.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Steps one to four are observable from public material. Steps five and six are inferred from the
          module structure and annual billing, and are marked as inference, not fact.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What their motion tells you about the market</p>
          <Bullets
            className="mt-2"
            items={[
              "They are not afraid of showing prices. They are afraid of quoting one to a buyer who has not been qualified.",
              "Marketing spend goes into comparison content and review credibility, because that is where HR buyers shortlist.",
              "Marketplace distribution through ADP is how they reach companies too small or too slow to find them by search.",
              "Expansion, not acquisition, drives their revenue: eight stackable suites reward landing one module and growing.",
              "Nobody in this category offers a genuine free tier. That absence, not any single feature, is the opening.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What will not be copied</p>
          <Bullets
            className="mt-2"
            items={[
              "An annual minimum. It converts a fair price into a threshold, and a 25-person firm is priced out by arithmetic rather than by need.",
              "A demo as the only door. It caps reach at the number of sales calls a week can hold.",
              "Per-seat scaling that punishes the frontline, who are the people the product is actually for.",
              "Breadth for its own sake: every additional suite is a support surface and a reason the interface feels heavy.",
            ]}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">So what, for Curiosity Led</p>
        <DataTable
          columns={[
            { key: "point", label: "Implication", className: "w-[30%]" },
            { key: "detail", label: "Why", className: "w-[56%]" },
            { key: "where", label: "Where it lands", className: "w-[14%]" },
          ]}
          rows={implications.map((i) => ({
            point: <span className="text-[13px] font-semibold text-foreground">{i.point}</span>,
            detail: <span className="text-[13px] text-muted-foreground">{i.detail}</span>,
            where: <span className="text-[12px] font-medium text-muted-foreground">{i.where}</span>,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Coverage and its limits</p>
        <DataTable
          dense
          columns={[
            { key: "area", label: "Area", className: "w-[22%]" },
            { key: "read", label: "What was read", className: "w-[36%]" },
            { key: "found", label: "What it yielded" },
            { key: "ok", label: "", className: "w-[64px]" },
          ]}
          rows={coverage.map((c) => ({
            area: <span className="text-[13px] font-semibold text-foreground">{c.area}</span>,
            read: <span className="text-[13px] text-muted-foreground">{c.read}</span>,
            found: <span className="text-[13px] text-muted-foreground">{c.found}</span>,
            ok: c.ok ? <Tag tone="good">Read</Tag> : <Tag tone="warning">Open</Tag>,
          }))}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Engagedly's site runs to hundreds of pages, most of them blog and resource content. The pages a buyer
          actually decides on \u2014 pricing, positioning, demo, marketplace, comparison \u2014 were read in full on{" "}
          {A}. This is not a claim that every page was visited, and no finding below rests on one that was not.
        </p>
      </div>

      <Callout tone="default" title="Still unknown, and worth asking Yhan directly">
        <Bullets items={unknown} />
        <p>
          Two of these are answerable in one conversation with Yhan, who has bought the product: the contract
          length and whether any implementation fee was charged. Both change the total cost of ownership more
          than any feature difference.
        </p>
      </Callout>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Sources, all accessed {A}</p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sources.map((s) => (
            <div key={s.u} className="px-3.5 py-2.5">
              <a
                href={s.u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-[#0202ff] hover:underline dark:text-blue-300"
              >
                {s.s}
              </a>
              <p className="text-[12px] leading-snug text-muted-foreground">{s.n}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Vendor pages are their own claims. G2, Capterra, Tech.co, ITQlick, CultureMonkey and PeopleGoal are
          third-party reports and disagree with each other in places; those disagreements are shown above rather
          than resolved silently. Yhan's ~$7,000 for roughly 40 users is customer-reported and consistent with
          the published floor.
        </p>
      </div>
    </div>
  );
}