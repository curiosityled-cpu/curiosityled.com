import React, { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BOOK_DEMO_URL } from "@/components/pricing/pricingContent";

const BASE_MANAGERS = 10;
const BASE_PARTICIPANTS = 100;
const MANAGER_BLOCK = 5;
const MANAGER_BLOCK_PRICE = 1200;
const PARTICIPANT_BLOCK = 100;
const PARTICIPANT_BLOCK_PRICE = 600;
const BASE_PRICE = 3000;
const IMPLEMENTATION = 750;

const clean = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export default function PackageFitCalculator() {
  const [managers, setManagers] = useState(10);
  const [participants, setParticipants] = useState(100);

  const estimate = useMemo(() => {
    const m = clean(managers);
    const p = clean(participants);
    const managerBlocks = Math.max(0, Math.ceil((m - BASE_MANAGERS) / MANAGER_BLOCK));
    const participantBlocks = Math.max(0, Math.ceil((p - BASE_PARTICIPANTS) / PARTICIPANT_BLOCK));
    const blockCost = managerBlocks * MANAGER_BLOCK_PRICE + participantBlocks * PARTICIPANT_BLOCK_PRICE;
    return {
      managerBlocks,
      participantBlocks,
      blockCost,
      annual: BASE_PRICE + blockCost,
      firstYear: BASE_PRICE + IMPLEMENTATION + blockCost,
      beyond: m > 30 || p > 300,
    };
  }, [managers, participants]);

  const handleBook = () => {
    base44.analytics.track({
      eventName: "package_select",
      properties: {
        package: "essentials_with_blocks",
        page: "pricing",
        managers: clean(managers),
        participants: clean(participants),
      },
    });
  };

  const rows = [
    estimate.managerBlocks > 0 && {
      label: `${estimate.managerBlocks} × +5 manager block`,
      value: `$${(estimate.managerBlocks * MANAGER_BLOCK_PRICE).toLocaleString()} / year`,
    },
    estimate.participantBlocks > 0 && {
      label: `${estimate.participantBlocks} × +100 participant block`,
      value: `$${(estimate.participantBlocks * PARTICIPANT_BLOCK_PRICE).toLocaleString()} / year`,
    },
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-7">
      <h3 className="text-lg font-bold text-gray-900">Size Essentials for your team</h3>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
        Essentials includes 10 manager seats and 100 participant seats. Add capacity blocks as order-form line items rather
        than moving to a new package.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">Managers</span>
          <input
            type="number"
            min="1"
            value={managers}
            onChange={(e) => setManagers(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">Participants (including frontline staff)</span>
          <input
            type="number"
            min="1"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-5">
        <div className="space-y-1.5 text-sm">
          <p className="flex justify-between gap-4 text-gray-600">
            <span>Essentials base</span>
            <span className="font-medium text-gray-900">${BASE_PRICE.toLocaleString()} / year</span>
          </p>
          <p className="flex justify-between gap-4 text-gray-600">
            <span>Implementation</span>
            <span className="font-medium text-gray-900">${IMPLEMENTATION.toLocaleString()} one-time</span>
          </p>
          {rows.map((row) => (
            <p key={row.label} className="flex justify-between gap-4 text-gray-600">
              <span>{row.label}</span>
              <span className="font-medium text-gray-900">{row.value}</span>
            </p>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">First year</p>
            <p className="text-2xl font-bold text-gray-900">${estimate.firstYear.toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-500">${estimate.annual.toLocaleString()} each year after</p>
        </div>
      </div>

      {estimate.beyond && (
        <p className="mt-4 text-sm text-gray-700 leading-relaxed">
          Above 30 managers or 300 participants, blocks stop being the right answer. Growth is the conversation to have.
        </p>
      )}

      <a
        href={BOOK_DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleBook}
        className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white px-5 py-3 rounded-xl hover:opacity-90 transition-all"
        style={{ backgroundColor: "#0202ff" }}
      >
        Take this size into a demo
        <ArrowRight className="w-4 h-4" />
      </a>
      <p className="mt-3 text-[11px] text-gray-500">
        An estimate from published list terms, not a quote. A demo confirms the seats you actually need.
      </p>
    </div>
  );
}