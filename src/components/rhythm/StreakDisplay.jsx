/**
 * StreakDisplay
 * Renders the streak + days count indicators
 */
import React, { useMemo } from "react";

function localDateKey(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}

export default function StreakDisplay({ checkIns = [] }) {
  const { checkedInDays, streak } = useMemo(() => {
    const today = new Date();
    const map = {};
    
    checkIns.forEach(c => {
      if (!c.check_in_date) return;
      const key = c.check_in_date;
      if (!map[key]) map[key] = true;
    });

    // Build last 28 real days
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = localDateKey(d);
      days.push({ key, date: d, hasCheckIn: !!map[key] });
    }

    const checked = days.filter(d => d.hasCheckIn).length;

    // Calculate streak (consecutive days from today backwards)
    let s = 0;
    const todayKey = localDateKey(new Date());
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].hasCheckIn) s++;
      else if (days[i].key !== todayKey) break;
    }

    return { checkedInDays: checked, streak: s };
  }, [checkIns]);

  return (
    <div className="flex items-center gap-2">
      {streak > 0 && (
        <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
          🔥 {streak}-day streak
        </span>
      )}
      <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
        {checkedInDays}/28 days
      </span>
    </div>
  );
}