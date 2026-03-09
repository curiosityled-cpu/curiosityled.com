import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle, AlertCircle, X, FileUp, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function BulkRoleAssignment({ open, onClose, onSuccess }) {
  const [csvData, setCsvData] = useState([]);
  const [uploadStep, setUploadStep] = useState('upload');
  const [processing, setProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState({ valid: [], invalid: [] });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  const loadRoles = async () => {
    try {
      const rolesList = await base44.entities.CustomRole.list('-created_date');
      setRoles(rolesList || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const downloadTemplate = () => {
    const template = `user_email,role_name
john.doe@company.com,Content Manager
jane.smith@company.com,Analytics Viewer
bob.johnson@company.com,Program Coordinator`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_role_assignment_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Template downloaded');
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setProcessing(true);
    try {
      const uploadResult = await base44.integrations.invoke('Core', 'UploadFile', { file });
      
      if (!uploadResult.file_url) {
        toast.error('Failed to upload file');
        setProcessing(false);
        return;
      }

      const extractResult = await base44.integrations.invoke('Core', 'ExtractDataFromUploadedFile', {
        file_url: uploadResult.file_url,
        json_schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user_email: { type: "string" },
                  role_name: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const assignments = Array.isArray(extractResult.output) 
          ? extractResult.output 
          : extractResult.output.assignments || [];
        
        if (assignments.length === 0) {
          toast.error('No valid assignments found in CSV');
          setProcessing(false);
          return;
        }

        await validateAssignments(assignments);
        setCsvData(assignments);
        setUploadStep('preview');
      } else {
        toast.error('Failed to process CSV file');
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error('Error uploading CSV: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const validateAssignments = async (assignments) => {
    const results = { valid: [], invalid: [] };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userEmailMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u]));

    // Create role name map
    const roleNameMap = new Map(roles.map(r => [r.role_name.toLowerCase(), r]));

    for (const assignment of assignments) {
      const errors = [];

      // Email validation
      if (!assignment.user_email || !assignment.user_email.trim()) {
        errors.push('User email is required');
      } else if (!emailRegex.test(assignment.user_email.trim())) {
        errors.push('Invalid email format');
      } else {
        const user = userEmailMap.get(assignment.user_email.trim().toLowerCase());
        if (!user) {
          errors.push('User not found in system');
        } else {
          assignment.user_id = user.id;
          assignment.user_name = user.full_name;
        }
      }

      // Role validation
      if (!assignment.role_name || !assignment.role_name.trim()) {
        errors.push('Role name is required');
      } else {
        const role = roleNameMap.get(assignment.role_name.trim().toLowerCase());
        if (!role) {
          errors.push(`Role "${assignment.role_name}" not found`);
        } else if (!role.is_active) {
          errors.push(`Role "${assignment.role_name}" is inactive`);
        } else {
          assignment.role_id = role.id;
          assignment.role_color = role.color;
        }
      }

      if (errors.length > 0) {
        results.invalid.push({ assignment, errors });
      } else {
        results.valid.push(assignment);
      }
    }

    setValidationResults(results);
  };

  const handleConfirmAssignment = async () => {
    setProcessing(true);
    try {
      const assignmentPromises = validationResults.valid.map(assignment =>
        base44.functions.invoke('assignRoleToUser', {
          userId: assignment.user_id,
          roleId: assignment.role_id
        })
      );

      const results = await Promise.allSettled(assignmentPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.data?.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully assigned roles to ${successful} users!`);
      }
      if (failed > 0) {
        toast.warning(`${failed} role assignments failed`);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setUploadStep('upload');
    setCsvData([]);
    setValidationResults({ valid: [], invalid: [] });
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Bulk Role Assignment
          </DialogTitle>
        </DialogHeader>

        {uploadStep === 'upload' && (
          <div className="space-y-6">
            <Alert className="border-purple-200 bg-purple-50">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <strong>CSV Format:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li><strong>Required columns:</strong> user_email, role_name</li>
                  <li>Use exact role names (case-insensitive)</li>
                  <li>Users must exist in the system</li>
                  <li>Roles must be active custom roles</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download CSV Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="csv-role-upload"
                disabled={processing}
              />
              <label htmlFor="csv-role-upload" className="cursor-pointer">
                <div className="space-y-3">
                  {processing ? (
                    <Loader2 className="w-12 h-12 text-purple-600 mx-auto animate-spin" />
                  ) : (
                    <FileUp className="w-12 h-12 text-gray-400 mx-auto" />
                  )}
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {processing ? 'Processing CSV...' : 'Upload CSV File'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {processing ? 'This may take a moment' : 'Click to browse or drag and drop'}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {uploadStep === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Assignment Preview</h3>
                <p className="text-sm text-gray-600">Review role assignments before applying</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {validationResults.valid.length} Valid
                </Badge>
                {validationResults.invalid.length > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validationResults.invalid.length} Invalid
                  </Badge>
                )}
              </div>
            </div>

            {validationResults.invalid.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>{validationResults.invalid.length} assignments have errors and will be skipped:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    {validationResults.invalid.slice(0, 5).map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.assignment.user_email || 'Unknown'}:</strong> {item.errors.join(', ')}
                      </li>
                    ))}
                    {validationResults.invalid.length > 5 && (
                      <li className="text-gray-600">...and {validationResults.invalid.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>User Email</TableHead>
                      <TableHead>User Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.valid.map((assignment, idx) => (
                      <TableRow key={idx} className="bg-white">
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Valid
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{assignment.user_email}</TableCell>
                        <TableCell>{assignment.user_name || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            className="text-white"
                            style={{ backgroundColor: assignment.role_color }}
                          >
                            {assignment.role_name}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {validationResults.invalid.map((item, idx) => (
                      <TableRow key={`inv-${idx}`} className="bg-red-50">
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Invalid
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.assignment.user_email || 'N/A'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <span className="text-xs text-red-600">{item.errors.join('; ')}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAssignment}
                disabled={processing || validationResults.valid.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning Roles...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assign {validationResults.valid.length} Roles
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}