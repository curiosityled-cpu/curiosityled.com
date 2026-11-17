import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RefreshCw, ShieldOff } from "lucide-react";

const MODE_CLASS = {
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  block: "bg-rose-50 text-rose-700 border-rose-200",
};

const PKG_CLASS = {
  essentials: "bg-emerald-50 text-emerald-700 border-emerald-200",
  growth: "bg-blue-50 text-blue-700 border-blue-200",
  organization: "bg-violet-50 text-violet-700 border-violet-200",
  internal: "bg-gray-100 text-gray-700 border-gray-200",
  unknown: "bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * ModuleGatePanel — what each tenant's package would take away, and how often
 * that module has actually been reached for. Read-only: assigning a package and
 * moving a tenant to block happen on the client record, not here.
 */
export default function ModuleGatePanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("getModuleGateStatus", {});
      setStatus(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Boundaries could not be read");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ShieldOff className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Package boundaries</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xl leading-relaxed">
              What each tenant&apos;s package includes, and which modules it would lose. A tenant on
              an unset or internal package keeps everything, and a warn-mode tenant keeps access
              while the attempt is recorded.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !status && (
        <div className="p-8 flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <p className="text-xs text-gray-500">Reading tenant packages…</p>
        </div>
      )}

      {status?.tenants?.length > 0 && (
        <div className="divide-y divide-gray-100">
          {status.tenants.map((tenant) => (
            <div key={tenant.client_id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                <Badge variant="outline" className={`text-[10px] ${PKG_CLASS[tenant.package] || PKG_CLASS.unknown}`}>
                  {tenant.package}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${MODE_CLASS[tenant.enforcement_mode]}`}>
                  {tenant.enforcement_mode} mode
                </Badge>
                {tenant.permissive && (
                  <span className="text-[11px] text-gray-500">everything included by design</span>
                )}
              </div>

              {tenant.excluded_modules.length === 0 ? (
                <div className="mt-2 space-y-1">
                  {tenant.previews?.map((p) => (
                    <p key={p.package} className="text-xs text-gray-500 leading-relaxed">
                      <span className="font-medium text-gray-700 capitalize">{p.package}</span> would remove{" "}
                      {p.modules.length} module{p.modules.length === 1 ? "" : "s"} — {p.modules.join(", ")}.
                    </p>
                  ))}
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tenant.excluded_modules.map((m) => (
                    <div
                      key={m.module}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                        m.outcome === "blocked"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <span className="font-medium">{m.label}</span>
                      <span className="opacity-70">
                        {m.outcome === "permissive" ? "included" : m.outcome}
                      </span>
                      <span className="font-semibold">
                        {m.attempts > 0 ? `${m.attempts}×` : "0×"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {status?.rule && (
        <p className="px-4 py-3 text-[11px] leading-relaxed text-gray-500 bg-gray-50 border-t border-gray-100">
          {status.rule}
        </p>
      )}
    </div>
  );
}