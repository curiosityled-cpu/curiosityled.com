/**
 * TeamHierarchyView — indented org chart for a manager's reporting tree.
 *
 * Renders the flat node list returned by getTeamRollup (email, parent_email,
 * depth, report_count, at_risk) as a collapsible tree, so the team card can be
 * read as a structure instead of a flat roster.
 */
import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, UserRound } from "lucide-react";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Branch({ node, byParent, collapsed, toggle, depth }) {
  const kids = byParent.get(node.email) || [];
  const open = !collapsed.has(node.email);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 pr-1 rounded-lg hover:bg-muted/40 transition-colors"
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

  const roots = byParent.get(null) || [];

  // Deep levels start collapsed so the chart opens at a readable size.
  const [collapsed, setCollapsed] = useState(
    () => new Set(nodes.filter((n) => (n.depth || 0) >= 2).map((n) => n.email))
  );

  const toggle = (email) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

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
    <div className="max-h-[420px] overflow-y-auto px-3 py-2">
      {roots.map((root) => (
        <Branch
          key={root.email}
          node={root}
          byParent={byParent}
          collapsed={collapsed}
          toggle={toggle}
          depth={0}
        />
      ))}
    </div>
  );
}