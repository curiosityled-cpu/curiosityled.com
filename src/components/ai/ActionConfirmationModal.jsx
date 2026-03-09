import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Mail, 
  Target, 
  Calendar, 
  FileText, 
  BookOpen, 
  Bell,
  Shield,
  Info,
  XCircle
} from "lucide-react";
import { CONFIRMATION_LEVELS } from "./agentTools";

export default function ActionConfirmationModal({ 
  isOpen, 
  onClose, 
  actionDetails, 
  onConfirm,
  isExecuting = false
}) {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  
  if (!actionDetails) return null;

  const { 
    tool_name, 
    parameters, 
    confirmation_message, 
    proposed_changes,
    confirmationLevel = CONFIRMATION_LEVELS.MEDIUM,
    impact,
    preview,
    warnings,
    audit_context
  } = actionDetails;

  const getActionIcon = () => {
    switch(tool_name) {
      case 'generateReport': return <FileText className="w-6 h-6 text-blue-600" />;
      case 'createReminder': return <Bell className="w-6 h-6 text-orange-600" />;
      case 'scheduleNotification': return <Clock className="w-6 h-6 text-purple-600" />;
      case 'assignLearning': return <BookOpen className="w-6 h-6 text-green-600" />;
      case 'assignJourney': return <BookOpen className="w-6 h-6 text-indigo-600" />;
      case 'createGoal': return <Target className="w-6 h-6 text-red-600" />;
      case 'cascadeGoal': return <Target className="w-6 h-6 text-amber-600" />;
      case 'scheduleCalendarEvent': return <Calendar className="w-6 h-6 text-blue-600" />;
      case 'inviteUser': return <Users className="w-6 h-6 text-teal-600" />;
      case 'sendEmail': return <Mail className="w-6 h-6 text-pink-600" />;
      case 'suspendUserAccount': return <Shield className="w-6 h-6 text-red-600" />;
      case 'bulkInviteUsers': return <Users className="w-6 h-6 text-purple-600" />;
      case 'terminateUserSessions': return <Shield className="w-6 h-6 text-red-600" />;
      default: return <CheckCircle className="w-6 h-6 text-gray-600" />;
    }
  };

  const formatActionName = () => {
    return tool_name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getConfirmationLevelBadge = () => {
    const level = confirmationLevel?.level || 'MEDIUM';
    const colors = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[level]}>{level} Risk</Badge>;
  };

  const renderImpactSection = () => {
    if (!impact || !confirmationLevel?.showImpact) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Impact</h4>
            {impact.immediate && impact.immediate.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                {impact.immediate.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {confirmationLevel?.showReversibility && impact.reversible !== undefined && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200">
            {impact.reversible ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">Reversible - This action can be undone</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">Permanent - This action cannot be undone</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAffectedUsers = () => {
    if (!confirmationLevel?.showAffectedUsers || !proposed_changes?.affected_users) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Affected Users ({proposed_changes.affected_users.length})
        </h4>
        <div className="flex flex-wrap gap-1">
          {proposed_changes.affected_users.slice(0, 10).map((email, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {email}
            </Badge>
          ))}
          {proposed_changes.affected_users.length > 10 && (
            <Badge variant="outline" className="text-xs font-semibold">
              +{proposed_changes.affected_users.length - 10} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderPreviewData = () => {
    if (!confirmationLevel?.showPreview || !preview) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Data Preview</h4>
        <ScrollArea className="max-h-48">
          {preview.type === 'table' && preview.data && (
            <div className="text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {preview.columns?.map((col, idx) => (
                      <th key={idx} className="text-left py-1 px-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.data.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {preview.columns?.map((col, colIdx) => (
                        <td key={colIdx} className="py-1 px-2">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.data.length > 5 && (
                <p className="text-gray-500 mt-2">...and {preview.data.length - 5} more rows</p>
              )}
            </div>
          )}
          {preview.type === 'list' && preview.data && (
            <ul className="space-y-1 text-sm">
              {preview.data.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    );
  };

  const renderWarnings = () => {
    if (!confirmationLevel?.showWarnings || !warnings || warnings.length === 0) return null;

    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">⚠️ Warning:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  const renderAuditLog = () => {
    if (!confirmationLevel?.showAuditLog || !audit_context) return null;

    return (
      <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">📝 Audit Log</h4>
        <div className="space-y-1 text-xs text-gray-700">
          {audit_context.reason && <p><span className="font-medium">Reason:</span> {audit_context.reason}</p>}
          {audit_context.initiated_by && <p><span className="font-medium">Initiated by:</span> {audit_context.initiated_by}</p>}
          {audit_context.timestamp && <p><span className="font-medium">Timestamp:</span> {audit_context.timestamp}</p>}
        </div>
      </div>
    );
  };

  const renderProposedChanges = () => {
    if (!proposed_changes) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">What will happen:</h4>
        <div className="space-y-2 text-sm text-gray-700">
          {proposed_changes.summary && (
            <p className="font-medium">{proposed_changes.summary}</p>
          )}
          
          {proposed_changes.items && (
            <ul className="list-disc list-inside space-y-1 ml-2">
              {proposed_changes.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const isConfirmDisabled = () => {
    if (isExecuting) return true;
    if (confirmationLevel?.requireTypedConfirmation) {
      return typedConfirmation.toUpperCase() !== "CONFIRM";
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              {getActionIcon()}
              <div>
                <DialogTitle className="text-xl">
                  {confirmationLevel?.level === 'CRITICAL' ? '⚠️ ' : ''}
                  Confirm Action
                </DialogTitle>
                {getConfirmationLevelBadge()}
              </div>
            </div>
          </div>
          <DialogDescription className="text-base mt-2">
            {confirmation_message || `Atreus wants to ${formatActionName()} on your behalf.`}
          </DialogDescription>
        </DialogHeader>

        {renderWarnings()}
        {renderImpactSection()}
        {renderProposedChanges()}
        {renderAffectedUsers()}
        {renderPreviewData()}
        {renderAuditLog()}

        {confirmationLevel?.requireTypedConfirmation && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-red-900 mb-3">
              Type <code className="bg-red-100 px-2 py-1 rounded">CONFIRM</code> to proceed:
            </p>
            <Input
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder="Type CONFIRM"
              className="font-mono"
              disabled={isExecuting}
            />
          </div>
        )}

        <DialogFooter className="gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isConfirmDisabled()}
            className={
              confirmationLevel?.level === 'CRITICAL' 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isExecuting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {confirmationLevel?.requireTypedConfirmation ? 'Execute Action' : 'Confirm & Execute'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}