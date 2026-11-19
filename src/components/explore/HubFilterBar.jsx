import React from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

export default function HubFilterBar({ filters, values, onChange, status, updated }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <label
            key={f.key}
            className="relative inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 py-1.5 hover:border-gray-300"
          >
            <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">{f.label}</span>
            <select
              value={values[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="appearance-none bg-transparent text-[11px] text-gray-600 outline-none cursor-pointer pr-1"
            >
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 pointer-events-none" />
          </label>
        ))}

        <span className="inline-flex items-center rounded-lg bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-700 border border-red-100">
          {status}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-gray-400">{updated}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0202ff]">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </span>
        </div>
      </div>
    </div>
  );
}