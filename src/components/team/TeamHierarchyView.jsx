/**
 * TeamHierarchyView — interactive indented org chart for a reporting tree.
 *
 * Renders the flat node list returned by getTeamRollup (email, parent_email,
 * depth, report_count, at_risk, goals, assessment_pct, checkins) as a
 * collapsible tree: any manager expands or collapses, and clicking a person
 * opens their read below the chart.
 */
import React, { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, AlertCircle, UserRound, X,
  Users, Target, BarChart3, Calendar,
} from "lucide-react";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Stat({ icon: Icon, label, value, color = "text-muted-foreground" }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

function Branch({ node, byParent, collapsed, toggle, depth, selected, onSelect }) {
  const kids = byParent.get(node.email) || [];
  const open = !collapsed.has(node.email);
  const isSelected = selected === node.email;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 pr-1 rounded-lg transition-colors ${
          isSelected ? "bg-[#0202ff]/[0.07]" : "hover:bg-muted/40"
        }`}
        style={{ paddingLeft: depth * 14 }}
      >
        {kids.length > 0 ? (
          <button
            onClick={() => toggle(node.email)}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label={open ? "Collapse reports" : "Expand reports"}
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <button
          onClick={() => onSelect(node.email)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          aria-pressed={isSelected}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
              isSelected
                ? "bg-[#0202ff] text-white"
                : "bg-[#0202ff]/10 text-[#0202ff]"
            }`}
          >
            {initials(node.full_name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-card-foreground truncate">{node.full_name}</p>
              {node.at_risk && <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {node.current_role || node.email}
            </p>
          </div>

          {kids.length > 0 && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
              {kids.length} {kids.length === 1 ? "report" : "reports"}
            </span>
          )}
        </button>
      </div>

      {open && kids.length > 0 && (
        <div className="ml-[26px] border-l border-border/70">
          {kids.map((k) => (
            <Branch
              key={k.email}
              node={k}
              byParent={byParent}
              collapsed={collapsed}
              toggle={toggle}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamHierarchyView({ nodes = [] }) {
  const byParent = useMemo(() => {
    const map = new Map();
    for (const n of nodes) {
      const key = n.parent_email || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    return map;
  }, [nodes]);

  const byEmail = useMemo(() => new Map(nodes.map((n) => [n.email, n])), [nodes]);
  const roots = byParent.get(null) || [];

  // Deep levels start collapsed so the chart opens at a readable size.
  const [collapsed, setCollapsed] = useState(
    () => new Set(nodes.filter((n) => (n.depth || 0) >= 2).map((n) => n.email))
  );
  const [selected, setSelected] = useState(null);

  const toggle = (email) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(nodes.map((n) => n.email)));

  const selectedNode = selected ? byEmail.get(selected) : null;
  const manager = selectedNode?.parent_email ? byEmail.get(selectedNode.parent_email) : null;

  if (roots.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <UserRound className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No reporting lines set up yet. Assign managers to people and the chart builds itself.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {nodes.length} {nodes.length === 1 ? "person" : "people"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-[10px] font-semibold text-[#0202ff] hover:underline"
          >
            Expand all
          </button>
          <span className="text-[10px] text-border">·</span>
          <button
            onClick={collapseAll}
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
        {roots.map((root) => (
          <Branch
            key={root.email}
            node={root}
            byParent={byParent}
            collapsed={collapsed}
            toggle={toggle}
            depth={0}
            selected={selected}
            onSelect={(email) => setSelected((cur) => (cur === email ? null : email))}
          />
        ))}
      </div>

      {selectedNode && (
        <div className="border-t border-border/70 bg-muted/30 px-3 py-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0202ff] text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
              {initials(selectedNode.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-card-foreground truncate">
                {selectedNode.full_name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {selectedNode.current_role || selectedNode.email}
                {manager ? ` · reports to ${manager.full_name}` : ""}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Close person detail"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <Stat
              icon={Users}
              label="Direct reports"
              value={selectedNode.report_count || 0}
              color="text-[#0202ff]"
            />
            <Stat
              icon={Target}
              label="Goals"
              value={`${selectedNode.goals?.completed || 0}/${selectedNode.goals?.total || 0}`}
              color="text-[#0202ff]"
            />
            <Stat
              icon={BarChart3}
              label="Assessment"
              value={selectedNode.assessment_pct != null ? `${selectedNode.assessment_pct}%` : "—"}
              color="text-emerald-600"
            />
            <Stat
              icon={Calendar}
              label="Check-ins"
              value={selectedNode.checkins || 0}
              color="text-purple-600"
            />
          </div>

          {selectedNode.at_risk && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Flagged: no assessment, low score, no goals or no recent check-ins.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}