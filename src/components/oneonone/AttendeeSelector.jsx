import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, UserPlus, Users, GitBranch, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AttendeeSelector — smart 1:1 attendee picker.
 * Shows the manager's Curiosity Led direct reports, an expandable rollup
 * team (leaders-of-leaders), and a manual entry mode for non-users.
 *
 * Props:
 *  - value: { email, name, isUser }
 *  - onChange: (value) => void
 *  - directReports: [{ email, full_name, current_role }]
 *  - rollupReports: [{ email, full_name, current_role }]  (excludes direct reports)
 *  - disabled?: boolean
 */
export default function AttendeeSelector({ value, onChange, directReports = [], rollupReports = [], disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showRollup, setShowRollup] = useState(false);
  const [manualMode, setManualMode] = useState(!!value && !value.isUser && (!!value.name || !!value.email));

  const label = useMemo(() => {
    if (!value || (!value.name && !value.email)) return "Select a direct report…";
    return value.name || value.email;
  }, [value]);

  const filterFn = (r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.full_name || '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  };

  const selectUser = (r) => {
    onChange({ email: r.email, name: r.full_name || r.email, isUser: true });
    setManualMode(false);
    setOpen(false);
  };

  const filteredDirect = directReports.filter(filterFn);
  const filteredRollup = rollupReports.filter(filterFn);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          <span className={value?.name || value?.email ? "text-foreground truncate" : "text-muted-foreground"}>
            {label}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search team members…"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {/* Direct Reports */}
          {filteredDirect.length > 0 && (
            <div className="p-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Direct Reports
              </p>
              {filteredDirect.map(r => (
                <button
                  key={r.email}
                  onClick={() => selectUser(r)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                    {(r.full_name || r.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{r.full_name || r.email}</p>
                    {r.current_role && <p className="text-[11px] text-muted-foreground truncate">{r.current_role}</p>}
                  </div>
                  {value?.email === r.email && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Rollup Team (leaders-of-leaders) */}
          {filteredRollup.length > 0 && (
            <div className="p-1.5 border-t border-border">
              <button
                onClick={() => setShowRollup(s => !s)}
                className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <GitBranch className="w-3 h-3" /> Rollup Team ({filteredRollup.length})
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showRollup ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showRollup && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {filteredRollup.map(r => (
                      <button
                        key={r.email}
                        onClick={() => selectUser(r)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                          {(r.full_name || r.email)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{r.full_name || r.email}</p>
                          {r.current_role && <p className="text-[11px] text-muted-foreground truncate">{r.current_role}</p>}
                        </div>
                        {value?.email === r.email && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Manual entry for non-users */}
          <div className="p-1.5 border-t border-border">
            <button
              onClick={() => setManualMode(m => !m)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 text-left transition-colors"
            >
              <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {manualMode ? "Cancel manual entry" : "Someone not on Curiosity Led…"}
              </span>
            </button>
            <AnimatePresence>
              {manualMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-2 pt-1 space-y-1.5"
                >
                  <input
                    value={value?.name || ""}
                    onChange={e => onChange({ ...(value || {}), name: e.target.value, isUser: false })}
                    placeholder="Name (e.g. Sarah Chen)"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="email"
                    value={value?.email || ""}
                    onChange={e => onChange({ ...(value || {}), email: e.target.value, isUser: false })}
                    placeholder="Email (optional, for invite)"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full text-xs font-medium text-primary py-1.5 rounded-md hover:bg-primary/5"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {filteredDirect.length === 0 && filteredRollup.length === 0 && !manualMode && (
            <p className="text-xs text-muted-foreground text-center py-6 px-3">
              No team members found. Use manual entry to add anyone.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}