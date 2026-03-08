import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function FormVersionHistory({ form, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    loadVersions();
  }, [form.id]);

  const loadVersions = async () => {
    try {
      const versionHistory = form.config?.version_history || [];
      setVersions(versionHistory);
    } catch (error) {
      console.error("Error loading versions:", error);
      setVersions([]);
    }
  };

  const saveCurrentVersion = async (changeDescription) => {
    try {
      const versionEntry = {
        version_number: form.version + 1,
        timestamp: new Date().toISOString(),
        changed_by: (await base44.auth.me()).email,
        change_description: changeDescription,
        config_snapshot: JSON.parse(JSON.stringify(form.config))
      };

      const updatedHistory = [...versions, versionEntry];

      await base44.entities.CustomForm.update(form.id, {
        version: form.version + 1,
        config: {
          ...form.config,
          version_history: updatedHistory
        }
      });

      toast.success("Version saved");
      loadVersions();
    } catch (error) {
      console.error("Error saving version:", error);
      toast.error("Failed to save version");
    }
  };

  const restoreVersion = async (versionEntry) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: versionEntry.config_snapshot,
        version: form.version + 1
      });

      toast.success("Version restored");
      if (onRestore) onRestore();
      setSelectedVersion(null);
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
          <p className="text-xs text-gray-600 mt-1">
            Track changes and restore previous versions
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline">Current: v{form.version || 1}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveCurrentVersion("Manual checkpoint")}
            >
              Save Checkpoint
            </Button>
          </div>

          {versions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No version history yet
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {versions.reverse().map((version, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">v{version.version_number}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(version.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{version.change_description}</p>
                        <p className="text-xs text-gray-500">by {version.changed_by}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedVersion(version)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => restoreVersion(version)}
                          title="Restore this version"
                        >
                          <RotateCcw className="w-4 h-4 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVersion && (
        <Dialog open onOpenChange={() => setSelectedVersion(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Version {selectedVersion.version_number} Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-sm text-gray-600">Changed by</p>
                  <p className="font-medium">{selectedVersion.changed_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Timestamp</p>
                  <p className="font-medium">{new Date(selectedVersion.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Configuration Snapshot</p>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedVersion.config_snapshot, null, 2)}
                </pre>
              </div>

              <Button
                onClick={() => restoreVersion(selectedVersion)}
                className="w-full"
                style={{ backgroundColor: '#0202ff' }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore This Version
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}