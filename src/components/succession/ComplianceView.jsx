import React, { useEffect, useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import LegalHoldsPanel from "@/components/succession/LegalHoldsPanel";
import AdverseImpactPanel from "@/components/succession/AdverseImpactPanel";
import CandidateNoticesPanel from "@/components/succession/CandidateNoticesPanel";

/**
 * ComplianceView — the legal and compliance surface of succession: what is
 * frozen, whether outcomes fall unevenly, and what candidates have been told.
 * These are the three questions an auditor, a works council or opposing counsel
 * asks, and each answer has to be reachable without reading the database.
 */
export default function ComplianceView() {
  const { invoke } = useSuccessionApi();
  const [cycles, setCycles] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await invoke("successionListCycles", {
          operation_id: `compliance-cycles-${Date.now()}`,
        });
        const rows = res?.cycles || res?.rows || [];
        if (!cancelled) setCycles(rows);
      } catch {
        if (!cancelled) setCycles([]);
      } finally {
        if (!cancelled) setLoadingCycles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoke]);

  if (loadingCycles) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Legal &amp; compliance</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Holds, adverse impact and candidate notices — the record a review or an audit asks for
        </p>
      </div>

      <Tabs defaultValue="holds">
        <TabsList>
          <TabsTrigger value="holds">Legal holds</TabsTrigger>
          <TabsTrigger value="impact">Adverse impact</TabsTrigger>
          <TabsTrigger value="notices">Candidate notices</TabsTrigger>
        </TabsList>

        <TabsContent value="holds" className="mt-4">
          <LegalHoldsPanel cycles={cycles} />
        </TabsContent>
        <TabsContent value="impact" className="mt-4">
          <AdverseImpactPanel cycles={cycles} />
        </TabsContent>
        <TabsContent value="notices" className="mt-4">
          <CandidateNoticesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}