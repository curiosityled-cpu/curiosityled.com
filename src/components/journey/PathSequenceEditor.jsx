import React, { useEffect, useMemo } from "react";
import { ArrowDown, ArrowUp, BookOpen, Briefcase } from "lucide-react";

const iconFor = (kind) => (kind === "experience" ? Briefcase : BookOpen);

/**
 * Arranges the whole path in one list. Experiences and learning resources are stored
 * separately, so this is where the author puts them in the order a learner should meet
 * them — a workshop, then a course, then another workshop.
 */
export default function PathSequenceEditor({ learningItems = [], experiences = [], value = [], onChange }) {
  const entries = useMemo(() => {
    const all = [
      ...learningItems.map((item, index) => ({
        key: `resource:${item.resource_id || index}`,
        label: item.title || "Learning resource",
        kind: "resource",
      })),
      ...experiences.map((exp, index) => ({
        key: `experience:${index}`,
        label: exp.title || "Experience",
        kind: "experience",
      })),
    ];
    const byKey = new Map(all.map((entry) => [entry.key, entry]));
    const arranged = (value || []).map((key) => byKey.get(key)).filter(Boolean);
    const unplaced = all.filter((entry) => !(value || []).includes(entry.key));
    return [...arranged, ...unplaced];
  }, [learningItems, experiences, value]);

  // Newly added items join the end of the arrangement rather than dropping out of it.
  useEffect(() => {
    if (!value?.length || !entries.length) return;
    const keys = entries.map((entry) => entry.key);
    if (keys.join("|") !== value.join("|")) onChange?.(keys);
  }, [entries, value, onChange]);

  if (!entries.length) return null;

  const move = (index, offset) => {
    const next = [...entries];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange?.(next.map((entry) => entry.key));
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-gray-600">Path order</label>
      <p className="mb-2 text-xs text-gray-400">
        Arrange the steps in the order a learner should meet them. This is the trail they follow.
      </p>
      <ol className="space-y-1.5">
        {entries.map((entry, index) => {
          const Icon = iconFor(entry.kind);
          return (
            <li
              key={entry.key}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-2"
            >
              <span className="w-4 text-[11px] font-semibold tabular-nums text-gray-400">{index + 1}</span>
              <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">
                {entry.label}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move earlier"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === entries.length - 1}
                aria-label="Move later"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}