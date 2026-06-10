import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function AdminDataRestore() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);

  const isAdmin = user && (
    user.app_role === 'Platform Admin' ||
    user.app_role === 'Super Administrator' ||
    user.app_role === 'Admin Level 2' ||
    user.role === 'admin'
  );

  if (!isAdmin) {
    return <div className="p-8 text-center text-gray-500">Access denied.</div>;
  }

  const handleRestore = async () => {
    setStatus('loading');
    setResult(null);
    try {
      const res = await base44.functions.invoke('restoreAssessmentForUser', {
        email: 'eosoria@curiosityled.com',
        scores: {
          response_id: 'tf_restored_eosoria_prod_final',
          submission_ts: '2026-04-17T01:30:00.000Z',
          overall_pct: 72, si_pct: 75, dm_pct: 70, comm_pct: 78,
          rm_pct: 65, sm_pct: 75, pm_pct: 70,
          archetype_label: 'The Collaborative Problem-Solver',
          band_overall: 'Developing',
          sector: 'Healthcare',
          role_level: 'Level 2 (Leading Others)',
          scoring_notes: 'Strong collaboration and stakeholder management skills. Decision-making and resource management could benefit from a more strategic approach.',
          qa_count: 21,
          top_strengths: [
            'Strong stakeholder alignment and collaboration',
            'Clear and effective communication with teams',
            'Proactive engagement with diverse groups',
          ],
          development_areas: [
            'Strategic decision-making under pressure',
            'Resource optimization and budget planning',
            'Performance management and accountability',
          ],
          risk_flags: [],
          summary: 'This leader demonstrates strong collaborative instincts and communication effectiveness, particularly in stakeholder engagement and team coordination. Their Developing proficiency level reflects solid foundational competencies with clear room for growth in strategic thinking and resource management.',
          recommendations: [
            'Seek stretch assignments requiring cross-functional resource allocation',
            'Practice structured decision-making frameworks (e.g., RAPID, DACI)',
            'Request feedback from senior leaders on strategic planning approaches',
            'Enroll in a resource management or project leadership course',
          ],
        }
      });
      setResult(res.data);
      setStatus(res.data?.success ? 'success' : 'error');
    } catch (e) {
      setResult({ error: e.message });
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-lg">Admin Data Restore</CardTitle>
          <p className="text-sm text-gray-500">Restore missing assessment data for eosoria@curiosityled.com</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === null && (
            <Button onClick={handleRestore} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              Restore Assessment + Insights for eosoria
            </Button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Restoring data in production...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Data restored successfully!</span>
              </div>
              <pre className="text-xs bg-gray-100 rounded p-3 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              <p className="text-sm text-gray-600">eosoria can now log in and see their results on the My Leadership page.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Restore failed</span>
              </div>
              <pre className="text-xs bg-gray-100 rounded p-3 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              <Button onClick={handleRestore} variant="outline" className="w-full">Try Again</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}