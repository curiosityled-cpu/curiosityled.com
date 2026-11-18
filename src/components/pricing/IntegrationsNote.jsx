import React from "react";

// The connectors claim, kept truthful: this list is the authorized set and
// nothing else. A connector is named here only once it is live.
const CONNECTORS = [
  { name: "Microsoft Teams", detail: "check-in cards for frontline staff" },
  { name: "Outlook calendar", detail: "1:1s and meetings" },
  { name: "Google Calendar", detail: "1:1s and meetings" },
  { name: "HubSpot", detail: "contacts and companies" },
];

export default function IntegrationsNote() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 sm:w-40 sm:pt-1">
          Connected today
        </p>
        <div className="flex-1">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {CONNECTORS.map((connector) => (
              <li key={connector.name} className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{connector.name}</span>
                <span className="text-gray-500"> — {connector.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            That is the whole list. We would rather name four live connectors than promise a
            roadmap.
          </p>
        </div>
      </div>
    </div>
  );
}