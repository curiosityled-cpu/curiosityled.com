import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function RequestStatistics({ clientId, refreshTrigger }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [clientId, refreshTrigger]);

  const loadStatistics = async () => {
    try {
      const { data } = await base44.functions.invoke('getRequestAnalytics', {
        client_id: clientId || user.client_id
      });
      setStats(data.summary);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reqstats-enter mb-6 rounded-[18px] border border-[#e5e7eb] dark:border-[#263248] bg-[#ffffff] dark:bg-[#111827] p-[42px_48px] flex flex-col gap-6 animate-pulse">
        <div className="rounded-[15px] border border-[#e5e7eb] dark:border-[#334155] bg-[#eef2f7] dark:bg-[#1e293b] h-[200px] lg:h-[284px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[76px] rounded-[11px] bg-[#eef2f7] dark:bg-[#182235]" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const chips = [
    { label: "In Progress", value: stats.in_progress, dot: "#f59e0b" },
    { label: "Awaiting Approval", value: stats.awaiting_approval, dot: "#38bdf8" },
    { label: "New Requests", value: stats.new, dot: "#a78bfa" },
    {
      label: "SLA Compliance",
      value: `${stats.sla_compliance_percentage}%`,
      dot: "#34d399",
      badge: `${stats.sla_breaches} breaches`
    },
    { label: "Avg Response Time", value: `${stats.avg_response_time_hours}h`, dot: "#f97316" },
    { label: "Stale Tickets", value: stats.stale_tickets, dot: "#f43f5e" }
  ];

  return (
    <div className="reqstats-enter mb-6 rounded-[18px] border border-[#e5e7eb] dark:border-[#263248] bg-[#ffffff] dark:bg-[#111827] p-[42px_48px] flex flex-col gap-6 overflow-hidden shadow-[0_20px_46px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_46px_rgba(15,23,42,0.22)]">
      {/* Hero — Total Requests */}
      <div className="relative rounded-[15px] border border-[#e5e7eb] dark:border-[#334155] bg-[linear-gradient(135deg,#ffffff,#f4f5ff)] dark:bg-[linear-gradient(135deg,#1e293b,#172033_68%,#162338)] p-[34px_38px] flex flex-col justify-between gap-6 overflow-hidden min-h-[200px] lg:min-h-[284px]">
        <div
          className="reqstats-glow-circle absolute w-[310px] h-[310px] -right-[82px] -top-[144px] rounded-full bg-[#0202ff] dark:bg-[#38bdf8] opacity-10 blur-[2px] pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative text-[#64748b] dark:text-[#94a3b8] text-sm font-semibold tracking-[0.08em] uppercase">
          Total Requests
        </div>
        <div className="relative text-[64px] md:text-[96px] lg:text-[112px] leading-none font-[750] tracking-[-0.075em] text-[#0202ff] dark:text-[#f8fafc]">
          {stats.total_requests}
        </div>
        <div className="relative flex items-center gap-3 text-[#475569] dark:text-[#cbd5e1] text-base font-medium">
          <span className="block w-[9px] h-[9px] rounded-full bg-[#16a34a] dark:bg-[#34d399] shadow-[0_0_0_5px_rgba(22,163,74,0.12)] dark:shadow-[0_0_0_5px_rgba(52,211,153,0.12)]" />
          <span>Completed {stats.completed} / {stats.completion_rate_percentage}% rate</span>
        </div>
      </div>

      {/* Detail chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chips.map((chip) => (
          <div
            key={chip.label}
            tabIndex={0}
            className="group rounded-[11px] border border-[#e5e7eb] dark:border-[#334155] bg-[#ffffff] dark:bg-[#182235] min-h-[76px] px-[18px] py-4 flex items-center gap-[11px] cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:bg-[#f8faff] hover:border-[#0202ff]/30 dark:hover:bg-[#202d43] dark:hover:border-[#4b6684] hover:shadow-[0_7px_18px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_7px_18px_rgba(0,0,0,0.2)] active:bg-[#f0f3fb] dark:active:bg-[#263550] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0202ff] dark:focus-visible:outline-[#38bdf8]"
          >
            <span
              className="shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: chip.dot }}
            />
            <span className="min-w-0 text-[13px] font-semibold text-[#64748b] dark:text-[#94a3b8] whitespace-nowrap">
              {chip.label}
            </span>
            <span className="ml-auto text-[19px] font-[750] text-[#0f172a] dark:text-[#f8fafc] whitespace-nowrap">
              {chip.value}
            </span>
            {chip.badge && (
              <span className="ml-auto px-[7px] py-[3px] rounded-full border border-[#cbd5e1] dark:border-[#475569] text-[#475569] dark:text-[#cbd5e1] text-[11px] font-[650] whitespace-nowrap">
                {chip.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}