import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, X, ChevronDown, ChevronUp, Filter } from "lucide-react";

const ADMIN_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Platform Admin", "Partner Business Administrator"];
const LEVELS = [
  "Level 1 (Leading Self)",
  "Level 2 (Leading Others)",
  "Level 3 (Leading Managers)",
  "Level 4 (Leading Functions)",
  "Level 5 (Leading Organizations)",
  "HiPo Individual Contributor",
];

export default function JourneyAssigneePicker({ selected = [], onChange, users = [], currentUser }) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dept, setDept] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [level, setLevel] = useState("");

  const canSelectAnyone = ADMIN_ROLES.includes(currentUser?.app_role);
  const isUserLevel2 = currentUser?.app_role === "User Level 2";

  // For User Level 2, only direct reports are selectable (from their own record).
  const selectableUsers = useMemo(() => {
    if (canSelectAnyone) return users;
    if (isUserLevel2) {
      const subs = currentUser?.subordinate_emails || [];
      return users.filter((u) => subs.includes(u.email));
    }
    return [];
  }, [users, canSelectAnyone, isUserLevel2, currentUser]);

  const departments = useMemo(() => {
    const set = new Set();
    selectableUsers.forEach((u) => { if (u.department) set.add(u.department); });
    return Array.from(set).sort();
  }, [selectableUsers]);

  const managers = useMemo(() => {
    const set = new Set();
    selectableUsers.forEach((u) => { if (u.manager_email) set.add(u.manager_email); });
    return Array.from(set).sort();
  }, [selectableUsers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return selectableUsers.filter((u) => {
      if (q && !(`${u.full_name || u.display_name || ""} ${u.email}`.toLowerCase().includes(q))) return false;
      if (dept && u.department !== dept) return false;
      if (managerEmail && u.manager_email !== managerEmail) return false;
      if (level && u.leadership_level !== level) return false;
      return true;
    });
  }, [selectableUsers, search, dept, managerEmail, level]);

  const bulkMatchCount = useMemo(() => {
    return selectableUsers.filter((u) => {
      if (dept && u.department !== dept) return false;
      if (managerEmail && u.manager_email !== managerEmail) return false;
      if (level && u.leadership_level !== level) return false;
      return true;
    }).length;
  }, [selectableUsers, dept, managerEmail, level]);

  const toggle = (email) => {
    if (selected.includes(email)) onChange(selected.filter((e) => e !== email));
    else onChange([...selected, email]);
  };

  const addBulk = () => {
    const matches = selectableUsers.filter((u) => {
      if (dept && u.department !== dept) return false;
      if (managerEmail && u.manager_email !== managerEmail) return false;
      if (level && u.leadership_level !== level) return false;
      return true;
    });
    const merged = Array.from(new Set([...selected, ...matches.map((u) => u.email)]));
    onChange(merged);
  };

  const hasFilters = dept || managerEmail || level;

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1">
              {email}
              <button type="button" onClick={() => toggle(email)}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}

      {isUserLevel2 && !canSelectAnyone ? (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
          You can assign this journey to your direct reports only.
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Bulk assign toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#0202ff] hover:underline"
          >
            <Filter className="w-3.5 h-3.5" />
            {showFilters ? "Hide bulk assign" : "Bulk assign by team / department / level"}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFilters && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2.5">
              <div className="grid grid-cols-1 gap-2">
                <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
                  <option value="">All departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
                  <option value="">All teams (any manager)</option>
                  {managers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
                  <option value="">All leadership levels</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{bulkMatchCount} user{bulkMatchCount === 1 ? "" : "s"} match</span>
                <button
                  type="button"
                  onClick={addBulk}
                  disabled={bulkMatchCount === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0202ff] text-white hover:bg-[#0101dd] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add all matching
                </button>
              </div>
              {hasFilters && (
                <button type="button" onClick={() => { setDept(""); setManagerEmail(""); setLevel(""); }} className="text-xs text-gray-500 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* User list */}
          <ScrollArea className="h-56 rounded-xl border border-gray-100 bg-white">
            <div className="p-2 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No users found</div>
              ) : (
                filtered.map((u) => {
                  const isSelected = selected.includes(u.email);
                  return (
                    <label key={u.id} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggle(u.email)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.display_name || u.email}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}{u.department ? ` · ${u.department}` : ""}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}