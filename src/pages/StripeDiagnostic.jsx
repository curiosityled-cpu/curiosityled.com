import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function StripeDiagnostic() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeDiagnostic");
      const payload = res?.data ?? res;
      setData(payload);
      toast.success("Diagnostics complete");
    } catch (e) {
      toast.error("Diagnostics failed: " + (e?.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const apiKeyOk = data?.apiKeyStatus === "valid";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-red-600" />
              Stripe Diagnostics
            </h1>
            <p className="text-sm text-gray-500">Payment system health & configuration</p>
          </div>
        </div>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Run Diagnostics</>
          )}
        </Button>
      </div>

      {!data && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Run diagnostics to check your Stripe API key, webhooks, products, and customers.
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          {/* Status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">API Key Status</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {data.apiKeyStatus || "unknown"}
                  </p>
                </div>
                {apiKeyOk ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Webhook Status</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                    {data.webhookStatus || "unknown"}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-gray-400" />
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {data.errors?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Errors</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.errors.map((err, i) => (
                  <div key={i} className="text-sm bg-red-50 border border-red-100 rounded-lg p-3">
                    <span className="font-medium text-red-800">{err.step}:</span>{" "}
                    <span className="text-red-700">{err.error}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Products
                <Badge>{data.products?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.products?.length > 0 ? (
                <div className="space-y-2">
                  {data.products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="text-gray-500">{p.id} · {p.active ? "active" : "inactive"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No products found.</p>
              )}
            </CardContent>
          </Card>

          {/* Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Customers
                <Badge>{data.customers?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.customers?.length > 0 ? (
                <div className="space-y-2">
                  {data.customers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                      <span className="font-medium text-gray-900">{c.email || "(no email)"}</span>
                      <span className="text-gray-500">{c.id}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No customers found.</p>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400">
            Last run: {data.timestamp ? new Date(data.timestamp).toLocaleString() : "—"}
          </p>
        </div>
      )}
    </div>
  );
}