import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function StripeDiagnosticsPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('stripeDiagnostic');
      if (res?.data?.success) {
        setResult(res.data.diagnostics);
      } else {
        toast.error(res?.data?.error || 'Diagnostic failed');
      }
    } catch (e) {
      toast.error(e?.message || 'Diagnostic failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-red-600" /> Stripe Diagnostics</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Check the health of the Stripe payment integration.</p>
            </div>
            <Button onClick={runDiagnostic} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</> : <><RefreshCw className="w-4 h-4 mr-2" />Run Diagnostic</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!result && !loading && (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Run a diagnostic to verify the API key, products, customers, and subscriptions.</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {/* API key status */}
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                {result.apiKeyStatus === 'valid'
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <XCircle className="w-5 h-5 text-red-600" />}
                <div>
                  <p className="font-medium">API Key: {result.apiKeyStatus}</p>
                  <p className="text-xs text-muted-foreground">Checked at {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {/* Products */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Products ({result.products?.length || 0})</h4>
                {result.products?.length ? (
                  <div className="space-y-1.5">
                    {result.products.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded border bg-card">
                        <span className="font-medium">{p.name}</span>
                        <Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No products found.</p>}
              </div>

              {/* Customers */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Customers ({result.customers?.length || 0})</h4>
                {result.customers?.length ? (
                  <div className="space-y-1.5">
                    {result.customers.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded border bg-card">
                        <span>{c.email || c.id}</span>
                        <span className="text-xs text-muted-foreground">{c.id}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No customers found.</p>}
              </div>

              {/* Subscriptions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Subscriptions ({result.subscriptions?.length || 0})</h4>
                {result.subscriptions?.length ? (
                  <div className="space-y-1.5">
                    {result.subscriptions.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded border bg-card">
                        <span className="text-xs text-muted-foreground">{s.id}</span>
                        <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No subscriptions found.</p>}
              </div>

              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">Errors ({result.errors.length})</p>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-700">
                    {result.errors.map((e, i) => (
                      <li key={i}><span className="font-medium">{e.step}:</span> {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}