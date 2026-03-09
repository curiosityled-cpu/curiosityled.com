import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CSVUploadModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error("Please select a valid CSV file");
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV file must contain headers and at least one data row");
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    // Map CSV headers to expected backend field names
    const headerMap = {
      'email': 'email',
      'full_name': 'firstName', // Will split full_name into firstName/lastName
      'firstName': 'firstName',
      'lastName': 'lastName',
      'app_role': 'appRole',
      'appRole': 'appRole',
      'department': 'department',
      'manager_email': 'managerEmail',
      'managerEmail': 'managerEmail',
      'customRoles': 'customRoles',
      'custom_roles': 'customRoles'
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // Skip completely empty rows
      if (values.every(v => !v)) continue;
      
      const record = {};
      let fullName = null;
      
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        const mappedHeader = headerMap[header] || header;
        
        // Handle full_name - split into firstName and lastName
        if (header === 'full_name' && value) {
          fullName = value;
          const parts = value.trim().split(/\s+/);
          if (parts.length >= 2) {
            record.firstName = parts[0];
            record.lastName = parts.slice(1).join(' ');
          } else {
            record.firstName = value;
            record.lastName = value;
          }
        }
        // Handle customRoles as array (semicolon-separated in CSV)
        else if (mappedHeader === 'customRoles' && value) {
          record[mappedHeader] = value.split(';').map(r => r.trim()).filter(Boolean);
        }
        // Handle appRole normalization
        else if (mappedHeader === 'appRole' && value) {
          // Convert "User" or "Admin" to lowercase
          record[mappedHeader] = value.toLowerCase();
        }
        else if (value) {
          record[mappedHeader] = value;
        }
      });

      // Only add records with at least an email
      if (record.email) {
        record.rowNumber = i;
        records.push(record);
      }
    }

    return records;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      
      const text = await file.text();
      const records = parseCSV(text);

      const response = await base44.functions.invoke('provisioningCreateBatch', {
        sourceSystem: 'MANUAL',
        fileName: file.name,
        records,
        strictRoles: false,
        requireDepartment: false,
        disallowPublicEmailDomains: true
      });

      if (response.data) {
        setResult(response.data);
        toast.success(`Batch created: ${response.data.totals.valid} valid, ${response.data.totals.invalid} invalid`);
        
        if (response.data.totals.invalid === 0) {
          setTimeout(() => {
            onSuccess?.();
            onOpenChange(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload CSV File</DialogTitle>
          <DialogDescription>
            Upload a CSV file with user data. Required columns: email, firstName, lastName, appRole (user/admin).
            Optional: department, managerEmail, customRoles (semicolon-separated).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {file && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Upload Summary</div>
                  <div className="text-sm space-y-1">
                    <div>Total Records: {result.totals.total}</div>
                    <div className="text-green-600">Valid: {result.totals.valid}</div>
                    <div className="text-red-600">Invalid: {result.totals.invalid}</div>
                    <div>New Users: {result.totals.newUsers}</div>
                    <div>Existing Users: {result.totals.existingUsers}</div>
                  </div>
                </AlertDescription>
              </Alert>

              {result.invalidRecords?.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Validation Errors</div>
                    <div className="text-sm space-y-2 max-h-40 overflow-y-auto">
                      {result.invalidRecords.slice(0, 10).map((record, idx) => (
                        <div key={idx} className="border-l-2 border-red-300 pl-2">
                          <div className="font-medium">Row {record.rowNumber}: {record.email}</div>
                          {record.errors?.map((err, i) => (
                            <div key={i} className="text-xs">• {err.message}</div>
                          ))}
                        </div>
                      ))}
                      {result.invalidRecords.length > 10 && (
                        <div className="text-xs italic">...and {result.invalidRecords.length - 10} more errors</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result.warnings?.length > 0 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Warnings</div>
                    <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                      {result.warnings.map((record, idx) => (
                        <div key={idx} className="text-xs">
                          Row {record.rowNumber} ({record.email}): {record.warnings?.map(w => w.message).join(', ')}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Validate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}