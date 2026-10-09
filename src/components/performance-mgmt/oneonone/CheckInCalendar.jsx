import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Moon,
  Plus,
  Pencil,
  Users,
  CalendarDays,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
  parseISO,
} from "date-fns";
import {
  MEASURES,
  shiftET,
  ScorePill,
  QuestionsUsed,
  CustomAnswers,
} from "./checkInShared";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CheckInCalendar({
  filter,
  checkIns,
  teamMembers,
  myEmail,
  myName,
  lookback,
  onAdd,
  onEdit,
}) {
  const todayStr = shiftET(0);
  const minDate = shiftET(-Math.max(0, lookback));
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isAll = filter === "all";

  // People in scope
  const peopleInScope = useMemo(() => {
    if (isAll) {
      return [
        { email: myEmail, name: myName, isSelf: true },
        ...teamMembers.map((m) => ({
          email: m.email.toLowerCase(),
          name: m.name || m.email,
          isSelf: false,
        })),
      ];
    }
    const isSelf = filter.toLowerCase() === myEmail;
    const name = isSelf
      ? myName
      : teamMembers.find(
          (m) => m.email.toLowerCase() === filter.toLowerCase()
        )?.name || filter;
    return [{ email: filter.toLowerCase(), name, isSelf }];
  }, [isAll, filter, myEmail, myName, teamMembers]);

  const scopeEmails = useMemo(
    () => new Set(peopleInScope.map((p) => p.email)),
    [peopleInScope]
  );

  // Date -> records map (scoped)
  const dateMap = useMemo(() => {
    const map = new Map();
    for (const c of checkIns) {
      const email = (c.owner_email || c.user_email || "").toLowerCase();
      if (!scopeEmails.has(email)) continue;
      const date = c.check_in_date;
      if (!date) continue;
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(c);
    }
    return map;
  }, [checkIns, scopeEmails]);

  // Calendar grid
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const getDayStatus = (dateStr) => {
    const records = dateMap.get(dateStr) || [];
    if (isAll) {
      const peopleDone = new Set();
      records.forEach((r) => {
        const email = (r.owner_email || r.user_email || "").toLowerCase();
        if (scopeEmails.has(email)) peopleDone.add(email);
      });
      return {
        completed: peopleDone.size,
        total: scopeEmails.size,
        records,
      };
    }
    const morningDone = records.some(
      (r) => r.check_in_type === "morning" || r.morning_completed
    );
    const eveningDone = records.some(
      (r) => r.check_in_type === "evening" || r.evening_completed
    );
    return { morningDone, eveningDone, records };
  };

  const canBackfill = (dateStr) =>
    lookback > 0 && dateStr >= minDate && dateStr <= todayStr;

  // Selected day
  const selectedRecords = dateMap.get(selectedDate) || [];
  const selectedDateObj = parseISO(selectedDate + "T00:00:00");

  const prevMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => {
    setMonth(new Date());
    setSelectedDate(todayStr);
  };

  return (
    <div className="space-y-4">
      <Card className="border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={prevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {format(month, "MMMM yyyy")}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] px-2 text-gray-500"
                onClick={goToday}
              >
                Today
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={nextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, month);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isFutureDay = dateStr > todayStr;
              const status = getDayStatus(dateStr);
              const hasAny = status.records.length > 0;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={[
                    "relative min-h-[52px] rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs",
                    isSelected ? "bg-[#0202ff] text-white shadow-sm" : "",
                    !isSelected && isToday
                      ? "ring-2 ring-[#0202ff]/40"
                      : "",
                    !isSelected && !isToday && inMonth
                      ? "hover:bg-gray-50"
                      : "",
                    !inMonth ? "opacity-40" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={[
                      "text-xs font-medium",
                      isSelected ? "text-white" : "",
                      !isSelected && isToday
                        ? "text-[#0202ff] font-bold"
                        : "",
                      !isSelected &&
                      !isToday &&
                      isFutureDay
                        ? "text-gray-300"
                        : "",
                      !isSelected &&
                      !isToday &&
                      !isFutureDay &&
                      !inMonth
                        ? "text-gray-300"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {format(day, "d")}
                  </span>

                  {inMonth && !isFutureDay && (
                    isAll ? (
                      <span
                        className={[
                          "text-[9px] font-semibold leading-none",
                          isSelected ? "text-white/80" : "",
                          !isSelected &&
                          hasAny &&
                          status.completed === status.total
                            ? "text-emerald-600"
                            : "",
                          !isSelected &&
                          hasAny &&
                          status.completed < status.total
                            ? "text-amber-600"
                            : "",
                          !isSelected && !hasAny
                            ? "text-gray-300"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {hasAny ? `${status.completed}/${status.total}` : ""}
                      </span>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <span
                          className={[
                            "w-1.5 h-1.5 rounded-full",
                            status.morningDone ? "bg-amber-400" : "",
                            !status.morningDone && isSelected
                              ? "bg-white/30"
                              : "",
                            !status.morningDone &&
                            !isSelected &&
                            canBackfill(dateStr)
                              ? "bg-red-200"
                              : "",
                            !status.morningDone &&
                            !isSelected &&
                            !canBackfill(dateStr)
                              ? "bg-gray-200"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                        <span
                          className={[
                            "w-1.5 h-1.5 rounded-full",
                            status.eveningDone ? "bg-indigo-400" : "",
                            !status.eveningDone && isSelected
                              ? "bg-white/30"
                              : "",
                            !status.eveningDone &&
                            !isSelected &&
                            canBackfill(dateStr)
                              ? "bg-red-200"
                              : "",
                            !status.eveningDone &&
                            !isSelected &&
                            !canBackfill(dateStr)
                              ? "bg-gray-200"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      </div>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            {isAll ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-600">
                    ●
                  </span>
                  <span className="text-[10px] text-gray-400">
                    All checked in
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-600">
                    ●
                  </span>
                  <span className="text-[10px] text-gray-400">Partial</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-gray-400">Morning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] text-gray-400">Evening</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-200" />
                  <span className="text-[10px] text-gray-400">
                    Missed (backfillable)
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-[#0202ff]" />
          <h4 className="text-sm font-semibold text-gray-900">
            {format(selectedDateObj, "EEEE, MMMM d, yyyy")}
          </h4>
          {canBackfill(selectedDate) && (
            <span className="text-[10px] text-gray-400 ml-1">
              · within backfill window
            </span>
          )}
        </div>

        <div className="space-y-2">
          {peopleInScope.map((person) => {
            const personRecords = selectedRecords.filter(
              (r) =>
                (r.owner_email || r.user_email || "").toLowerCase() ===
                person.email
            );
            return (
              <DayPersonEntry
                key={person.email}
                person={person}
                records={personRecords}
                canBackfill={canBackfill(selectedDate)}
                onAdd={() => onAdd(selectedDate, person.email, person.name)}
                onEdit={onEdit}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayPersonEntry({ person, records, canBackfill, onAdd, onEdit }) {
  const record = records[0];
  const morningDone =
    record?.check_in_type === "morning" || record?.morning_completed;
  const eveningDone =
    record?.check_in_type === "evening" || record?.evening_completed;

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-900">
              {person.name}
            </span>
            {person.isSelf && (
              <span className="text-[10px] text-gray-400">(you)</span>
            )}
          </div>
          {record ? (
            person.isSelf ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onEdit(record)}
              >
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : null
          ) : canBackfill ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onAdd}
            >
              <Plus className="w-3 h-3" /> Add check-in
            </Button>
          ) : null}
        </div>

        {record ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MEASURES.map((m) => (
                <ScorePill
                  key={m.key}
                  label={m.label}
                  score={record[m.key]}
                  color={m.color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                  morningDone
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-gray-50 text-gray-400 border border-gray-200"
                }`}
              >
                <Sunrise className="w-3 h-3" />
                {morningDone ? "Morning done" : "Morning missed"}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                  eveningDone
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "bg-gray-50 text-gray-400 border border-gray-200"
                }`}
              >
                <Moon className="w-3 h-3" />
                {eveningDone ? "Evening done" : "Evening missed"}
              </span>
            </div>
            <QuestionsUsed questions={record.questions_used} />
            <CustomAnswers answers={record.custom_answers} />
          </>
        ) : (
          <p className="text-xs text-gray-400">
            No check-in recorded for this day.
          </p>
        )}
      </CardContent>
    </Card>
  );
}