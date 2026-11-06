import React, { useState } from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Play, RefreshCw, AlertTriangle } from "lucide-react";
import TenantCleanupSummary from "@/components/admin/TenantCleanupSummary";
import TenantCleanupTable from "@/components/admin/TenantCleanupTable";

function countOf(target) {
  if (target.action === "purge") return (target.customerScoped || 0) + (target.harness || 0);
  if (target.action === "rehome") return target.unscoped || 0;
  return 0;
}

function previousMap(targets) {
  const map = {};
  (targets || []).forEach((t) => { map[t.entity] = countOf(t); });
  return map;
}

/**
 * TenantCleanup — the Platform Admin console for the tenant rollout.
 *
 * Dry run first: it reads the database and reports exactly what would change,
 * without writing. Only then can the cleanup run, and only after the reviewer
 * confirms in the dialog. Afterwards the same table is re-read from the
 * database, so the result on screen is what is actually stored.
 */
export default function TenantCleanup() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async (mode, confirm = false) => {
    setRunning(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("tenantDataHygiene", { mode, confirm });
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Cleanup could not run");
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  };

  const targets = result?.executed ? result.after : result?.targets;
  const previous = result?.executed ? previousMap(result.targets) : null;

  return (
    <MVPPageLayout
      title="Tenant cleanup"
      subtitle="Bring every customer tenant to a clean slate while the HealthCo test tenant keeps its fixtures."
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => run("inventory")} disabled={running}>
            {running && !result?.executed ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Dry run
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={running || !result}
            className="bg-[#0202ff] hover:bg-[#0101dd]"
          >
            <Play className="w-4 h-4 mr-2" />
            Run cleanup
          </Button>
        </div>
      }
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="text-sm text-gray-600 leading-relaxed">
            <p className="text-gray-900 font-semibold">
              {result?.testTenant?.name || "HealthCo"} is the test tenant and is never modified.
            </p>
            <p className="mt-1">
              Activity is removed from{" "}
              <span className="font-medium text-gray-900">
                {result?.customerTenants?.length
                  ? result.customerTenants.map((c) => c.name).join(", ")
                  : "every other client"}
              </span>
              . Seed content that no client owns is re-stamped onto the test tenant instead of
              deleted, so authored material survives while every other client starts blank.
              Check-In configuration is kept exactly as set.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!result && !running && (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm font-medium text-gray-900">Nothing has been changed yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Run a dry run to see every record type the rollout would touch, and how many records
            each one holds.
          </p>
        </div>
      )}

      {running && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Reading every tenant-scoped record type…</p>
        </div>
      )}

      {result && !running && (
        <>
          <TenantCleanupSummary
            totals={result.executed ? result.afterTotals : result.totals}
            previousTotals={result.executed ? result.totals : null}
          />

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                result.executed
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
              }
            >
              {result.executed ? "Cleanup complete" : "Dry run — nothing written"}
            </Badge>
            <span className="text-xs text-gray-500">
              {result.executed
                ? "Counts below were re-read from the database after the run."
                : "Counts below are what the run would change."}
            </span>
          </div>

          <TenantCleanupTable targets={targets} previousByEntity={previous} />
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run the tenant cleanup?</DialogTitle>
            <DialogDescription>
              Activity records for every customer tenant are permanently removed, and tenant-less
              seed content moves to {result?.testTenant?.name || "the test tenant"}. Configuration
              is untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={running}>
              Cancel
            </Button>
            <Button
              onClick={() => run("execute", true)}
              disabled={running}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run cleanup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MVPPageLayout>
  );
}