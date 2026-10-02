import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Repeat, AlertTriangle, MinusCircle } from "lucide-react";

function getLoopFlag(rate, committed, selfReportOnly) {
  if (committed === 0) return { label: "No commitments", icon: MinusCircle, color: "text-slate-400", bg: "bg-slate-50" };
  if (rate != null && rate < 30) return { label: "Low demonstration", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" };
  if (selfReportOnly > 0 && (rate == null || rate < 50)) return { label: "Self-report only", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" };
  return null;
}

export default function TeamAdoptionRollup({ subordinateEmails = [] }) {
  const emails = subordinateEmails.filter(Boolean);

  const { data: trendsByUser = {}, isLoading } = useQuery({
    queryKey: ["adoption-team", emails.sort().join(",")],
    queryFn: async () => {
      const results = {};
      for (const email of emails) {
        try {
          const rows = await base44.entities.ManagerTrends.filter({ user_email: email }, "-last_trend_computed_at", 1);
          if (rows[0]) results[email] = rows[0];
        } catch {}
      }
      return results;
    },
    enabled: emails.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (emails.length === 0) return null;

  const hasAnyData = Object.keys(trendsByUser).length > 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      <div className="h-0.5 w-full" style={{ backgroundColor: "#0202ff" }} />
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100">
        <Repeat className="w-4 h-4 text-[#0202ff]" />
        <p className="text-sm font-semibold text-slate-900">Behavioral Adoption</p>
        <span className="text-[10px] text-slate-400 ml-auto">behaviors demonstrated in real situations</span>
      </div>

      {isLoading ? (
        <div className="px-4 py-6 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0202ff] rounded-full animate-spin" />
        </div>
      ) : !hasAnyData ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-slate-500">No adoption data yet for your direct reports.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {emails.map(email => {
            const t = trendsByUser[email];
            if (!t) return null;
            const committed = t.behavioral_committed_count ?? 0;
            const demonstrated = t.behavioral_demonstrated_count ?? 0;
            const rate = t.behavioral_adoption_rate;
            const selfReport = t.behavioral_self_report_only_count ?? 0;
            const flag = getLoopFlag(rate, committed, selfReport);
            const FlagIcon = flag?.icon;

            return (
              <div key={email} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{email}</p>
                  <p className="text-[10px] text-slate-400">
                    {committed > 0 ? `${demonstrated}/${committed} demonstrated` : "No commitments"}
                  </p>
                </div>
                {flag && FlagIcon ? (
                  <div className={`flex items-center gap-1 ${flag.bg} px-2 py-1 rounded-md`}>
                    <FlagIcon className={`w-3 h-3 ${flag.color}`} />
                    <span className={`text-[10px] font-medium ${flag.color}`}>{flag.label}</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {rate != null ? `${rate}%` : "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}