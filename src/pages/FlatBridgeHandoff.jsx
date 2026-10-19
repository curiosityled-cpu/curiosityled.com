/**
 * FlatBridgeHandoff — share-ready implementation summary for Go Flat Bridge.
 * Public page (no auth required) that describes the account/assignment model,
 * role boundaries, check-in questions, provisional KPI interpretation, required
 * roster inputs, and channel/cadence assumptions in plain, nontechnical language.
 *
 * Route: /flat-bridge-handoff
 */
import React from "react";
import { CheckCircle2, Clock, Users, Building2, Truck, Mail, MessageSquare, Link2, AlertTriangle, FileText, ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    icon: Building2,
    title: "How we model your workforce",
    body: [
      "Flat Bridge LTD is set up as one tenant in Curiosity Led. Beneath that tenant, we keep a separate directory of the customer accounts you serve — for example, each freight customer or logistics client you haul for.",
      "Your staff are connected to those customer accounts through effective-dated assignments. One employee can work on multiple accounts, and one account can have many employees. This is separate from who reports to whom — the reporting hierarchy stays independent.",
      "Managers are given portfolio visibility for specific customer accounts. A manager can oversee multiple accounts, and an account can have multiple managers. Managers only see workforce and check-in data for the accounts in their portfolio.",
    ],
  },
  {
    icon: FileText,
    title: "The daily check-in questions",
    body: [
      "Each frontline team member completes one short check-in per day at 3:00 PM local time. It has five questions: three fixed operational questions and two wellbeing questions that change daily.",
    ],
    questions: [
      {
        text: "How many assigned work activities did you complete during this shift?",
        type: "Number",
        note: "We use one shared definition of a 'work activity' for now. Once you provide your KPI definitions, we will tailor this to each task type (pickup, loading, transport, unloading). Counts are not compared across different types of work.",
      },
      {
        text: "How much of the work planned for your shift did you complete?",
        type: "Anchored choices",
        note: "Options: None · Less than half · About half · Most, but not all · All · More than planned · Work was unavailable or blocked. The last option helps tell blocked work apart from incomplete work.",
      },
      {
        text: "How confident are you that the work you completed followed the required quality and safety procedures?",
        type: "1–5 scale + Not sure/Not applicable",
        note: "This is a self-assessment, not a verified safety or quality record. It is never a substitute for safety reporting, inspections, or QA data.",
      },
      {
        text: "AI-generated wellbeing question about workload and strain",
        type: "Changes daily",
        note: "Wording varies naturally day to day. The exact text shown to each person is preserved with their response.",
      },
      {
        text: "AI-generated wellbeing question about feeling supported and able to grow",
        type: "Changes daily",
        note: "Wording varies naturally day to day. The exact text shown to each person is preserved with their response.",
      },
    ],
  },
  {
    icon: Truck,
    title: "Provisional work-unit count",
    body: [
      "Until you share your KPI definitions, all frontline staff use the same shared 'work activity' count. This means a driver's count and a loader's count are not directly comparable — they measure different kinds of work.",
      "When you provide task-specific KPI definitions (for example, loads picked up, trucks loaded, miles driven, deliveries unloaded), we will configure each role's count to match. Until then, the shared count is a rough pulse, not a performance target.",
    ],
  },
  {
    icon: Clock,
    title: "When and how check-ins are sent",
    body: [
      "Check-ins are sent once per day, Monday through Friday, at 3:00 PM in your tenant's configured business timezone. Sending does not activate until you set your business timezone.",
      "Each team member can complete the check-in through any of these channels:",
    ],
    channels: [
      { icon: MessageSquare, label: "Microsoft Teams", desc: "An Adaptive Card arrives in their Teams chat. They answer directly in the card and tap Submit." },
      { icon: Mail, label: "Email", desc: "An email arrives with the questions listed and a prominent button linking to a secure web page. They click the button to complete the check-in." },
      { icon: Link2, label: "Secure web link", desc: "A private, unguessable link opens a simple web form. No login required — the link itself is the credential." },
    ],
  },
  {
    icon: AlertTriangle,
    title: "About completing check-ins inside the email",
    body: [
      "Most email clients (Gmail, Outlook, Yahoo, Apple Mail) strip interactive forms and block JavaScript from emails. This means a true 'complete it right in the email' form is not reliable across email clients.",
      "Our approach: the email lists the questions so team members know what to expect, with a prominent button that opens a secure web page where they complete the check-in. This works reliably in every email client.",
    ],
  },
  {
    icon: Users,
    title: "What we need from you to get started",
    body: [
      "To set up the roster and start sending check-ins, we need:",
    ],
    checklist: [
      "Your business timezone (so check-in dates and send times are correct).",
      "A roster of frontline staff: name, email, team or shift label, and their manager's email.",
      "The customer accounts you serve (name and industry is enough to start).",
      "Which staff are assigned to which customer accounts (can be a simple list or spreadsheet).",
      "Which managers oversee which customer accounts.",
      "Your KPI definitions when you are ready (to replace the provisional shared work-unit count with task-specific counts).",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Who sees what",
    body: [
      "Frontline team members are roster-only participants. They are not invited into the platform and do not have app accounts. They only interact through the check-in card, email, or web link.",
      "Managers see workforce and check-in data only for the customer accounts in their assigned portfolio. They cannot see data for accounts outside their portfolio.",
      "HR administrators and tenant admins can see all data within the Flat Bridge tenant. No one at Flat Bridge can see data from other Curiosity Led tenants.",
    ],
  },
];

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#0202ff]" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function FlatBridgeHandoff() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0202ff] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b887847_CuriosityLedIcon_20241030_085533_0000.png"
              alt="Curiosity Led"
              className="w-10 h-10 object-contain bg-white rounded-lg p-1"
            />
            <span className="text-sm font-medium opacity-90">Curiosity Led</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Flat Bridge LTD — Implementation Summary</h1>
          <p className="text-sm opacity-80 max-w-xl">
            A plain-language overview of how daily check-ins and workforce data work for your
            frontline teams. Share this with anyone at Go Flat Bridge who needs to understand
            the setup.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <SectionCard key={i} icon={Icon} title={s.title}>
              <div className="space-y-3">
                {s.body.map((p, j) => (
                  <p key={j} className="text-sm text-gray-600 leading-relaxed">{p}</p>
                ))}

                {s.questions && (
                  <div className="space-y-3 mt-4">
                    {s.questions.map((q, j) => (
                      <div key={j} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-900 mb-1">{q.text}</p>
                        <p className="text-xs text-[#0202ff] font-medium mb-2">{q.type}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{q.note}</p>
                      </div>
                    ))}
                  </div>
                )}

                {s.channels && (
                  <div className="grid gap-3 mt-4">
                    {s.channels.map((c, j) => {
                      const CIcon = c.icon;
                      return (
                        <div key={j} className="flex items-start gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <CIcon className="w-5 h-5 text-[#0202ff] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {s.checklist && (
                  <ul className="space-y-2 mt-4">
                    {s.checklist.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>
          );
        })}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            Curiosity Led · Prepared for Go Flat Bridge · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}