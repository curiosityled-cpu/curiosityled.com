import React, { useState } from "react";
import { FlaskConical, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * DemoDataButton — Shows "Load Demo Data" / "Exit Demo" controls in the
 * Succession Workspace header. Platform Admin only.
 *
 * Load: seeds a complete demo scenario in an isolated demo tenant and
 * switches the user's view to that tenant.
 * Exit: clears all demo data and restores the user's original tenant.
 */
export default function DemoDataButton({ isDemoTenant }) {
  const [loading, setLoading] = useState(false);

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("seedSuccessionDemoData", {});
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success(res.data?.message || "Demo data loaded");
      // Hard refresh so all views re-fetch with the new client_id
      window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Failed to load demo data");
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("clearSuccessionDemoData", {});
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success(res.data?.message || "Demo data cleared");
      window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Failed to clear demo data");
    } finally {
      setLoading(false);
    }
  };

  if (isDemoTenant) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Exit Demo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Clear all demo data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all demo succession records (cycles,
              roles, candidates, evidence, readiness conclusions, transitions,
              etc.) from the demo tenant and restore your view to your original
              tenant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDemo}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Clear & Exit Demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FlaskConical className="w-4 h-4 mr-2" />
          )}
          Load Demo Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#0202ff]" />
            Load demo succession data?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will create a complete demo scenario in an isolated "Acme
            Corp" tenant — including 3 candidates at different readiness
            stages, evidence, calibration, a ratified readiness conclusion,
            development plans, and an approved transition. Your view will
            switch to the demo tenant so you can walk through all 9 stages.
            You can exit the demo at any time to return to your real tenant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLoadDemo}
            disabled={loading}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4 mr-2" />
            )}
            Load Demo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}