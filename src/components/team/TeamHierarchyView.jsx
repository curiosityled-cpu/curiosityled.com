/**
 * TeamHierarchyView — interactive indented org chart for a manager's tree.
 *
 * Renders the flat node list returned by getTeamRollup (email, parent_email,
 * depth, report_count, at_risk) as a collapsible tree. Clicking a person
 * expands their reports and opens a detail panel beneath the chart; the search
 * box filters the tree to a person and their chain of command.
 */
import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, UserRound, Search, Maximize2, Minimize2, X } from "lucide-react";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function groupByParent(nodes) {
  const map = new Map();
  for (const n of nodes) {
    const key = n.parent_email || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  return map;
}

function Branch({ node, byParent, collapsed, selected, onSelect, depth }) {
  const kids = byParent.get(node.email) || [];
  const open = !collapsed.has(node.email);
  const isSelected = selected === node.email;

  return (
    <div>
      <button
        onClick={() => onSelect(node, kids.length > 0)}
        className={`w-full flex items-center gap-2 py-1.5 pr-2 rounded-lg text-left transition-colors ${
          isSelected ? "bg-[#0202ff]/10" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted-foreground">
          {kids.length > 0 && (open
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />)}
        </span>

        <div className="w-7 h-7 rounded-full bg-[#0202ff]/10 text-[#0202ff] flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
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

      {open && kids.length > 0 && (
        <div className="ml-[22px] border-l border-border/70">
          {kids.map((k) => (
            <Branch
              key={k.email}
              node={k}
              byParent={byParent}
              collapsed={collapsed}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamHierarchyView({ nodes = [] }) {
  const [collapsed, setCollapsed] = useState(
    () => new Set(nodes.filter((n) => (n.depth || 0) >= 2).map((n) => n.email))
  );
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const byParentAll = useMemo(() => groupByParent(nodes), [nodes]);

  // Search keeps the matches and their chain of command, so a person is always
  // shown in context rather than pulled out of the tree.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const byEmail = new Map(nodes.map((n) => [n.email, n]));
    const keep = new Set();
    for (const n of nodes) {
      const hay = `${n.full_name || ""} ${n.current_role || ""} ${n.email || ""}`.toLowerCase();
      if (!hay.includes(q)) continue;
      let cur = n;
      while (cur) {
        keep.add(cur.email);
        cur = cur.parent_email ? byEmail.get(cur.parent_email) : null;
      }
    }
    return keep;
  }, [nodes, query]);

  const visibleNodes = useMemo(
    () => (matches ? nodes.filter((n) => matches.has(n.email)) : nodes),
    [nodes, matches]
  );
  const byParent = useMemo(() => groupByParent(visibleNodes), [visibleNodes]);
  const roots = byParent.get(null) || [];
  const effectiveCollapsed = matches ? new Set() : collapsed;

  const toggle = (email) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  const handleSelect = (node, hasReports) => {
    setSelected((prev) => (prev === node.email ? null : node.email));
    if (hasReports && !matches) toggle(node.email);
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(nodes.map((n) => n.email)));

  const selectedNode = selected ? nodes.find((n) => n.email === selected) : null;
  const selectedReports = selectedNode ? byParentAll.get(selectedNode.email) || [] : [];
  const selectedManager = selectedNode?.parent_email
    ? nodes.find((n) => n.email === selectedNode.parent_email)
    : null;

  if (nodes.length === 0) {
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
      {/* Toolbar — find a person, expand or collapse the whole chart */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/70">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person"
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={expandAll}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Expand all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={collapseAll}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Collapse all"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="max-h-[380px] overflow-y-auto px-2 py-2">
        {roots.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">
            No one matches “{query}”.
          </p>
        ) : (
          roots.map((root) => (
            <Branch
              key={root.email}
              node={root}
              byParent={byParent}
              collapsed={effectiveCollapsed}
              selected={selected}
              onSelect={handleSelect}
              depth={0}
            />
          ))
        )}
      </div>

      {/* Selected person */}
      {selectedNode && (
        <div className="border-t border-border/70 bg-muted/30 px-3 py-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 text-[#0202ff] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
              {initials(selectedNode.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-card-foreground truncate">{selectedNode.full_name}</p>
                {selectedNode.at_risk && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                    At risk
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {selectedNode.current_role || selectedNode.email}
              </p>
              {selectedManager && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  Reports to{" "}
                  <button
                    onClick={() => setSelected(selectedManager.email)}
                    className="font-medium text-[#0202ff] hover:underline"
                  >
                    {selectedManager.full_name}
                  </button>
                </p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Close details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedReports.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Direct reports · {selectedReports.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedReports.map((r) => (
                  <button
                    key={r.email}
                    onClick={() => setSelected(r.email)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border border-border bg-card hover:border-[#0202ff]/40 transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#0202ff]/10 text-[#0202ff] flex items-center justify-center text-[8px] font-semibold">
                      {initials(r.full_name)}
                    </span>
                    <span className="text-[10px] font-medium text-card-foreground truncate max-w-[140px]">
                      {r.full_name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}