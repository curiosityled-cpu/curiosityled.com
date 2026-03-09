import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function IntegrationContracts() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const docs = await base44.entities.IntegrationDoc.filter({
        is_active: true
      }, '-updated_date');
      setContracts(docs);
      
      if (docs.length > 0 && !selectedContract) {
        setSelectedContract(docs[0]);
      }
    } catch (error) {
      console.error('Load contracts error:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  if (!isPlatformAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <p>Admin access required to view integration contracts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Integration Contracts</h1>
        <p className="text-gray-600 mt-2">API documentation and contracts for external integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar - Contract List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Contracts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contracts.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => setSelectedContract(contract)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedContract?.id === contract.id 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contract.integration_name}</p>
                      <p className="text-xs text-gray-500">{contract.version}</p>
                    </div>
                  </div>
                </button>
              ))}
              
              {contracts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No contracts available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Contract Display */}
        <div className="md:col-span-3">
          {selectedContract ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedContract.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{selectedContract.integration_name}</Badge>
                      <Badge variant="secondary">{selectedContract.version}</Badge>
                      {selectedContract.is_active && (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedContract.content);
                      toast.success('Contract copied to clipboard');
                    }}
                  >
                    Copy Markdown
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ inline, children }) => {
                        if (inline) {
                          return <code className="px-1 py-0.5 rounded bg-gray-100 text-sm">{children}</code>;
                        }
                        return (
                          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                            <code>{children}</code>
                          </pre>
                        );
                      },
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {children} <ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      )
                    }}
                  >
                    {selectedContract.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a contract to view</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}