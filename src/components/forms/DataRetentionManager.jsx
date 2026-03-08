import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function DataRetentionManager({ form, onUpdate }) {
  const [retention, setRetention] = useState({
    auto_delete_enabled: false,
    retention_days: 365,
    delete_on_completion: false,
    anonymize_instead_of_delete: false,
    keep_aggregated_data: true,
    last_cleanup_date: null
  });
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    if (form?.config?.retention) {
      setRetention(prev => ({ ...prev, ...form.config.retention }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          retention
        }
      });

      toast.success("Retention settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving retention:", error);
      toast.error("Failed to save retention settings");
    } finally {
      setSaving(false);
    }
  };

  const runCleanup = async () => {
    setCleaning(true);
    try {
      if (!retention.retention_days || retention.retention_days < 1) {
        toast.error("Invalid retention period");
        setCleaning(false);
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retention.retention_days);

      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      });

      const oldSubmissions = submissions.filter(sub => 
        sub.created_date && new Date(sub.created_date) < cutoffDate
      );

      if (oldSubmissions.length === 0) {
        toast.info("No old submissions to clean up");
        setCleaning(false);
        return;
      }

      // Delete or anonymize
      for (const sub of oldSubmissions) {
        if (retention.anonymize_instead_of_delete) {
          await base44.entities.CustomFormSubmission.update(sub.id, {
            submitter_email: "anonymized@system.com",
            submitter_name: "Anonymized User",
            is_anonymous: true
          });
        } else {
          await base44.entities.CustomFormSubmission.delete(sub.id);
        }
      }

      // Update last cleanup date
      const updatedRetention = {
        ...retention,
        last_cleanup_date: new Date().toISOString()
      };

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          retention: updatedRetention
        }
      });

      setRetention(updatedRetention);

      toast.success(`Cleaned up ${oldSubmissions.length} old submissions`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error during cleanup:", error);
      toast.error("Failed to clean up data");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Data Retention
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Manage how long form data is stored
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-Delete */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Auto-Delete Old Data</Label>
            <p className="text-xs text-gray-500">Automatically clean up old submissions</p>
          </div>
          <Switch
            checked={retention.auto_delete_enabled}
            onCheckedChange={(checked) => setRetention({ ...retention, auto_delete_enabled: checked })}
          />
        </div>

        {/* Retention Period */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Retention Period (days)</Label>
          <Input
            type="number"
            value={retention.retention_days}
            onChange={(e) => setRetention({ ...retention, retention_days: parseInt(e.target.value) || 365 })}
            min="1"
            max="3650"
          />
          <p className="text-xs text-gray-500">
            Keep data for {retention.retention_days} days ({Math.floor(retention.retention_days / 365)} years)
          </p>
        </div>

        {/* Anonymization Option */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Anonymize Instead of Delete</Label>
            <p className="text-xs text-gray-500">Remove personal data but keep responses</p>
          </div>
          <Switch
            checked={retention.anonymize_instead_of_delete}
            onCheckedChange={(checked) => setRetention({ ...retention, anonymize_instead_of_delete: checked })}
          />
        </div>

        {/* Keep Aggregated Data */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Keep Aggregated Data</Label>
            <p className="text-xs text-gray-500">Preserve analytics even after deletion</p>
          </div>
          <Switch
            checked={retention.keep_aggregated_data}
            onCheckedChange={(checked) => setRetention({ ...retention, keep_aggregated_data: checked })}
          />
        </div>

        {/* Manual Cleanup */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">Manual Cleanup</p>
                <p className="text-xs text-orange-700">
                  Delete submissions older than {retention.retention_days} days
                </p>
              </div>
            </div>
            <Button
              onClick={runCleanup}
              disabled={cleaning}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {cleaning ? (
                <>
                  <Trash2 className="w-4 h-4 mr-2 animate-pulse" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Run Cleanup Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {retention.last_cleanup_date && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            Last cleanup: {formatDistanceToNow(new Date(retention.last_cleanup_date), { addSuffix: true })}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Retention Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}