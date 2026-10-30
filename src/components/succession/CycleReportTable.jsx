import React from "react";
import { Badge } from "@/components/ui/badge";

const COVERAGE_STYLE = {
  covered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  thin: "bg-amber-50 text-amber-700 border-amber-200",
  gap: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATE_STYLE = {
  ratified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  awaiting_ratification: "bg-amber-50 text-amber-700 border-amber-200",
  returned: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  acknowledged: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
};

function renderValue(columnKey, value) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300">—</span>;
  }
  if (columnKey === "coverage") {
    return (
      <Badge variant="outline" className={COVERAGE_STYLE[value] || "text-gray-600"}>
        {value}
      </Badge>
    );
  }
  if (columnKey === "status" || columnKey === "knowledge_plan") {
    return (
      <Badge variant="outline" className={STATE_STYLE[value] || "text-gray-600"}>
        {String(value).replace(/_/g, " ")}
      </Badge>
    );
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return text.replace(/_/g, " ");
}

/**
 * One section of the cycle report, rendered as a table. Sections carry their
 * own columns, so the same component prints bench, decisions, holds and
 * knowledge transfer without knowing what any of them mean.
 */
export default function CycleReportTable({ section }) {
  const rows = section.rows || [];

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </div>
        {section.note && <p className="text-xs text-gray-500 mt-0.5">{section.note}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400">Nothing recorded in this cycle.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {section.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-gray-100">
                  {section.columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-gray-700 align-top">
                      {renderValue(column.key, row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}