/**
 * TeamPeopleList — the flat roster for the team card's List tab.
 *
 * One row per person in the reporting tree: who they are and who they report
 * to. Team-level metrics stay in the Talent Scorecard, so this list never
 * repeats them; people with per-member detail still expand to their own record.
 */
import React from "react";
import { AlertCircle, Users } from "lucide-react";
import TeamMemberRow from "@/components/team/TeamMemberRow";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function PlainRow({ person, isAtRisk, managerName }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-[#0202ff]/10 text-[#0202ff] flex items-center justify-center text-xs font-semibold flex-shrink-0">
        {initials(person.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-card-foreground truncate">
            {person.full_name || person.email}
          </p>
          {isAtRisk && <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {person.current_role || person.email}
          {managerName ? ` · reports to ${managerName}` : ""}
        </p>
      </div>
      {person.report_count > 0 && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
          <Users className="w-3 h-3" />
          {person.report_count}
        </span>
      )}
    </div>
  );
}

export default function TeamPeopleList({ hierarchy = [], members = [], atRisk = [] }) {
  const memberByEmail = new Map(members.map((m) => [m.email, m]));
  const atRiskEmails = new Set(atRisk.map((r) => r.email));
  const nameByEmail = new Map(hierarchy.map((n) => [n.email, n.full_name || n.email]));

  const people = hierarchy.length > 0
    ? hierarchy
    : members.map((m) => ({
        email: m.email,
        full_name: m.full_name,
        current_role: m.current_role,
        parent_email: m.manager_email || null,
        report_count: 0,
      }));

  if (people.length === 0) {
    return (
      <p className="px-4 py-6 text-xs text-muted-foreground text-center">
        No one reports to you yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {people.map((p) => {
        const member = memberByEmail.get(p.email);
        return member ? (
          <TeamMemberRow
            key={p.email}
            member={member}
            isAtRisk={atRiskEmails.has(p.email)}
            hideStats
          />
        ) : (
          <PlainRow
            key={p.email}
            person={p}
            isAtRisk={atRiskEmails.has(p.email)}
            managerName={p.parent_email ? nameByEmail.get(p.parent_email) : null}
          />
        );
      })}
    </div>
  );
}