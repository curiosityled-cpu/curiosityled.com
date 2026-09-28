import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Searchable, scrollable multi-select for choosing users from the org.
 * Used for peer reviewer selection in the Add Participant modal.
 */
export default function OrgUserPicker({ users, selected, onChange, excludeEmails = [] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return users.filter(u =>
      !excludeEmails.includes(u.email) &&
      (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    );
  }, [users, query, excludeEmails]);

  const toggle = (email) => {
    if (selected.includes(email)) {
      onChange(selected.filter(e => e !== email));
    } else {
      onChange([...selected, email]);
    }
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(email => {
            const u = users.find(x => x.email === email);
            return (
              <Badge key={email} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 gap-1 pr-1">
                {u?.name || email}
                <button type="button" onClick={() => toggle(email)} className="hover:bg-blue-100 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          placeholder="Search users by name or email..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-8 h-9 text-xs"
        />
      </div>
      <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No users found</p>
        ) : (
          filtered.map(u => (
            <label key={u.email} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
              <input
                type="checkbox"
                checked={selected.includes(u.email)}
                onChange={() => toggle(u.email)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff] flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{u.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
              </div>
              {u.department && u.department !== "Unassigned" && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">{u.department}</span>
              )}
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-[10px] text-gray-400">{selected.length} peer reviewer(s) selected</p>
      )}
    </div>
  );
}