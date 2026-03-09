import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Download, CheckCircle, AlertCircle, X, FileUp, Loader2, Copy, ExternalLink, ClipboardList, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import BulkInviteUsers from "./BulkInviteUsers";

export default function BulkUserUpload({ onSuccess, onCancel }) {
  const [csvData, setCsvData] = useState([]);
  const [uploadStep, setUploadStep] = useState('upload');
  const [processing, setProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState({ valid: [], invalid: [], duplicates: [] });
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [addonRoles, setAddonRoles] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [requirementsOpen, setRequirementsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const [clientsList, partnersList, rolesList] = await Promise.all([
        base44.entities.Client.list('-created_date'),
        base44.entities.Partner.list('-created_date'),
        base44.entities.CustomRole.filter({ is_addon: true, is_active: true })
      ]);
      setClients(clientsList || []);
      setPartners(partnersList || []);
      setAddonRoles(rolesList || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const downloadTemplate = () => {
    const template = `email,full_name,display_name,app_role,addon_role,current_role,department,sector,leadership_level,manager_email,start_date,temporary_password,client_name,partner_name
john.doe@company.com,John Doe,John,User Level 1,,Senior Manager,Operations,Technology,Level 1 (Leading Self),manager@company.com,2024-01-15,,Acme Corporation,
jane.smith@company.com,Jane Smith,Jane,User Level 2,Team Leader Add-on,Director of Engineering,Technology,,Level 2 (Leading Others),vp@company.com,2023-06-01,TempPass123!,TechCorp Inc,
bob.analyst@company.com,Bob Analyst,,Analyst,Analyst Add-on,Business Analyst,Finance,,Level 1 (Leading Self),cfo@company.com,2023-03-01,,Acme Corporation,
super.admin@healthco.com,Maria Toni,,Super Administrator,User Add-on,Talent Management Manager,HR,,Level 3 (Leading Managers),ceo@healthco.com,2023-09-18,,HealthCo,
partner.admin@consulting.com,Pat Johnson,,Partner Business Administrator,,Senior Consultant,Consulting,,Level 2 (Leading Others),partner-lead@consulting.com,2023-01-01,,Big Consulting Firm`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Template downloaded');
  };

  const parseCSV = (text) => {
    // Handle different line endings (Windows \r\n, Mac \r, Unix \n)
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse header row - also handle BOM character at start of file
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Handle CSV with quoted values
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      // Map values to headers
      const user = {};
      headers.forEach((header, idx) => {
        user[header] = values[idx] || '';
      });
      
      // Only add if email exists
      if (user.email && user.email.trim()) {
        users.push(user);
      }
    }
    
    return users;
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setProcessing(true);
    try {
      // Read file directly in browser
      const text = await file.text();
      const users = parseCSV(text);
      
      if (users.length === 0) {
        toast.error('No valid user data found in CSV. Make sure your file has a header row and at least one data row.');
        setProcessing(false);
        return;
      }

      await validateCsvData(users);
      setCsvData(users);
      setUploadStep('preview');
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error('Error reading CSV file: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const validateCsvData = async (users) => {
    const results = { valid: [], invalid: [], duplicates: [] };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validAppRoles = ["User Level 1", "User Level 2", "Analyst", "Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"];
    
    // Map friendly role names to internal role values
    const roleNameMap = {
      'user': 'User Level 1',
      'team leader': 'User Level 2',
      'analyst': 'Analyst',
      'program admin': 'Admin Level 1',
      'hr admin': 'Admin Level 2',
      'super admin': 'Super Administrator',
      'partner admin': 'Partner Business Administrator',
      'platform admin': 'Platform Admin',
      // Also accept the internal names directly
      'user level 1': 'User Level 1',
      'user level 2': 'User Level 2',
      'admin level 1': 'Admin Level 1',
      'admin level 2': 'Admin Level 2',
      'super administrator': 'Super Administrator',
      'partner business administrator': 'Partner Business Administrator'
    };
    
    const resolveAppRole = (roleInput) => {
      if (!roleInput) return null;
      const normalized = String(roleInput).trim().toLowerCase();
      return roleNameMap[normalized] || null;
    };

    let existingEmails = new Set();
    try {
      // Fetch up to 10000 users for duplicate checking
      const existingUsers = await base44.entities.User.list('-created_date', 10000);
      existingEmails = new Set((existingUsers || []).map(u => u.email?.toLowerCase()).filter(Boolean));
    } catch (userListError) {
      console.warn('Could not fetch existing users for duplicate check:', userListError.message);
      // Continue without duplicate checking - backend will catch duplicates
    }

    // Create lookup maps for clients, partners, and addon roles
    const clientMap = new Map(clients.map(c => [c.name.toLowerCase(), c.id]));
    const partnerMap = new Map(partners.map(p => [p.name.toLowerCase(), p.id]));
    const addonRoleMap = new Map(addonRoles.map(r => [r.role_name.toLowerCase(), r.id]));

    // Track emails within the CSV to detect duplicates in the upload itself
    const emailsInCsv = new Set();

    for (const user of users) {
      const errors = [];

      // Required field validation
      const userEmail = user.email ? String(user.email).trim() : '';
      if (!userEmail) {
        errors.push('Email is required');
      } else if (!emailRegex.test(userEmail)) {
        errors.push('Invalid email format');
      }

      const fullNameStr = user.full_name ? String(user.full_name).trim() : '';
      if (!fullNameStr || fullNameStr.length < 2) {
        errors.push('Full name is required (min 2 characters)');
      }

      const currentRoleStr = user.current_role ? String(user.current_role).trim() : '';
      if (!currentRoleStr) {
        errors.push('Current role is required');
      }

      const departmentStr = user.department ? String(user.department).trim() : '';
      if (!departmentStr) {
        errors.push('Department is required');
      }

      const managerEmailStr = user.manager_email ? String(user.manager_email).trim() : '';
      if (!managerEmailStr) {
        errors.push('Manager email is required');
      } else if (!emailRegex.test(managerEmailStr)) {
        errors.push('Invalid manager email format');
      } else if (userEmail && managerEmailStr.toLowerCase() === userEmail.toLowerCase()) {
        errors.push('User cannot be their own manager');
      }

      // App role validation
      const appRoleInput = user.app_role ? String(user.app_role).trim() : '';
      const appRoleStr = appRoleInput ? resolveAppRole(appRoleInput) : '';
      if (appRoleInput && !appRoleStr) {
        errors.push(`Invalid app_role "${appRoleInput}". Valid options: User, Team Leader, Analyst, Program Admin, HR Admin, Super Admin, Partner Admin, Platform Admin`);
      }
      // Store the resolved role back to user object for backend
      if (appRoleStr) {
        user.app_role = appRoleStr;
      }

      // Date validation
      const startDateStr = user.start_date ? String(user.start_date).trim() : '';
      if (startDateStr) {
        const date = new Date(startDateStr);
        if (isNaN(date.getTime())) {
          errors.push('Invalid start_date format (use YYYY-MM-DD)');
        } else if (date > new Date()) {
          errors.push('Start date cannot be in the future');
        }
      }

      // Organization validation - map names to IDs
      let client_id = null;
      let partner_id = null;

      const clientNameStr = user.client_name ? String(user.client_name).trim() : '';
      if (clientNameStr) {
        client_id = clientMap.get(clientNameStr.toLowerCase());
        if (!client_id) {
          errors.push(`Client "${clientNameStr}" not found`);
        }
      }

      const partnerNameStr = user.partner_name ? String(user.partner_name).trim() : '';
      if (partnerNameStr) {
        partner_id = partnerMap.get(partnerNameStr.toLowerCase());
        if (!partner_id) {
          errors.push(`Partner "${partnerNameStr}" not found`);
        }
      }

      // Check if user has both client and partner
      if (client_id && partner_id) {
        errors.push('User can belong to either a Client OR a Partner, not both');
      }

      // Addon role validation
      let custom_role_id = null;
      const addonRoleStr = user.addon_role ? String(user.addon_role).trim() : '';
      if (addonRoleStr) {
        custom_role_id = addonRoleMap.get(addonRoleStr.toLowerCase());
        if (!custom_role_id) {
          errors.push(`Addon role "${addonRoleStr}" not found. Available: ${addonRoles.map(r => r.role_name).join(', ')}`);
        }
      }

      // Add resolved IDs to user object
      // Use null for empty strings to allow clearing organization on updates
      user.client_id = client_id;
      user.partner_id = partner_id;
      user.custom_role_id = custom_role_id;
      
      // Preserve display_name if provided
      const displayNameStr = user.display_name ? String(user.display_name).trim() : '';
      user.display_name = displayNameStr || null;
      
      // If user explicitly provided empty client_name or partner_name, set to null to clear
      if (user.client_name !== undefined && !clientNameStr) {
        user.client_id = null;
      }
      if (user.partner_name !== undefined && !partnerNameStr) {
        user.partner_id = null;
      }

      // Sector validation (optional field, just needs type coercion)
      const sectorStr = user.sector ? String(user.sector).trim() : '';

      // Check for duplicates within the CSV file itself
      const emailLower = userEmail.toLowerCase();
      const isDuplicateInCsv = emailLower && emailsInCsv.has(emailLower);
      if (isDuplicateInCsv) {
        errors.push('Duplicate email within CSV file');
      }
      
      // Track this email (only if valid email)
      if (emailLower && !errors.some(e => e.includes('Email is required') || e.includes('Invalid email format'))) {
        emailsInCsv.add(emailLower);
      }

      // Check for duplicates against existing users - but only if no other validation errors and not a CSV duplicate
      if (userEmail && existingEmails.has(emailLower) && !isDuplicateInCsv) {
        if (errors.length > 0) {
          // Duplicate with other errors - mark as invalid (can't update with bad data)
          errors.push('Email already exists in system');
          results.invalid.push({ user, errors });
        } else {
          // Valid duplicate - can be updated
          results.duplicates.push({ user, errors: ['Email already exists in system'] });
        }
      } else if (errors.length > 0) {
        results.invalid.push({ user, errors });
      } else {
        results.valid.push(user);
      }
    }

    setValidationResults(results);
  };

  const handleConfirmImport = async () => {
    setProcessing(true);
    toast.loading('Uploading CSV...', { id: 'bulk-upload' });
    
    try {
      // Create CSV content from valid users
      const headers = Object.keys(validationResults.valid[0]);
      const csvRows = [
        headers.join(','),
        ...validationResults.valid.map(user => 
          headers.map(h => `"${(user[h] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');
      const csvFile = new File([csvContent], 'users.csv', { type: 'text/csv' });

      // Upload CSV to Base44 storage
      toast.loading('Uploading CSV to storage...', { id: 'bulk-upload' });
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: csvFile });
      const fileUrl = uploadResponse.file_url;

      // Call the new backend function with the file URL
      toast.loading('Sending invitations...', { id: 'bulk-upload' });
      const response = await base44.functions.invoke('bulkInviteUsers', { fileUrl });

      const result = response?.data || response;
      toast.dismiss('bulk-upload');
      
      if (result.success) {
        toast.success(result.message);
        
        // Show detailed results if there were failures
        if (result.failedCount > 0) {
          console.log('Invitation details:', result.details);
          toast.warning(`${result.failedCount} invitations failed. Check console for details.`);
        }
        
        onSuccess();
      } else {
        toast.error(result.error || 'Bulk invitation failed');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.dismiss('bulk-upload');
      toast.error('Failed to send invitations: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  if (uploadStep === 'upload') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={downloadTemplate} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download CSV Template
          </Button>
        </div>

        <div 
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            processing ? 'border-gray-300 bg-gray-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!processing) {
              e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
            if (!processing) {
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }
          }}
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
            id="csv-file-upload"
            disabled={processing}
          />
          <label htmlFor="csv-file-upload" className="cursor-pointer">
            <div className="space-y-3">
              {processing ? (
                <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
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

        <Collapsible open={requirementsOpen} onOpenChange={setRequirementsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm text-gray-600 hover:text-gray-900 px-2">
              <span className="font-medium">CSV Format Requirements</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${requirementsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2">
            <div className="text-xs text-gray-600 space-y-1.5 border-l-2 border-gray-200 pl-3">
              <div><span className="font-semibold">Required:</span> email, full_name, current_role, department, manager_email</div>
              <div><span className="font-semibold">Optional:</span> display_name, app_role (defaults to "User Level 1"), addon_role, sector, leadership_level, temporary_password, start_date (YYYY-MM-DD), client_name, partner_name</div>
              <div><span className="font-semibold">App Roles:</span> User Level 1, User Level 2, Analyst, Admin Level 1, Admin Level 2, Super Administrator, Partner Business Administrator, Platform Admin</div>
              <div><span className="font-semibold">Leadership Levels:</span> Level 1 (Leading Self), Level 2 (Leading Others), Level 3 (Leading Managers), Level 4 (Leading Functions), Level 5 (Leading Organizations), HiPo Individual Contributor</div>
              <div><span className="font-semibold">Addon Roles:</span> User Add-on, Team Leader Add-on, Analyst Add-on, Program Admin Add-on, HR Admin Add-on</div>
              <div><span className="font-semibold">Organizations:</span> Use exact client/partner names from your platform. User can belong to Client OR Partner (not both)</div>
              <div><span className="font-semibold">Temporary Password:</span> Optional. If not provided, one will be auto-generated. Min 8 characters with uppercase, number, and special character</div>
              <div><span className="font-semibold">Onboarding:</span> Each user will receive a welcome email with their temporary password and be required to change it on first login</div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {onCancel && (
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (uploadStep === 'preview') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Import Preview</h3>
            <p className="text-sm text-gray-600">Review the data before importing</p>
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
            {validationResults.duplicates.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                {validationResults.duplicates.length} Duplicates
              </Badge>
            )}
          </div>
        </div>

        {validationResults.duplicates.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <div className="flex items-center justify-between">
                <span>{validationResults.duplicates.length} users with existing email addresses found.</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateDuplicates}
                    onChange={(e) => setUpdateDuplicates(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-orange-600"
                  />
                  <span className="text-sm font-medium">Update existing user profiles</span>
                </label>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {validationResults.invalid.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>{validationResults.invalid.length} rows have errors and will be skipped:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {validationResults.invalid.slice(0, 5).map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.user.email || 'Unknown'}:</strong> {item.errors.join(', ')}
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
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Organization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationResults.valid.map((user, idx) => (
                  <TableRow key={idx} className="bg-white">
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Valid
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell className="text-gray-600">{user.display_name || '-'}</TableCell>
                    <TableCell>{user.app_role || 'User Level 1'}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      {user.client_name && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Client: {user.client_name}
                        </Badge>
                      )}
                      {user.partner_name && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          Partner: {user.partner_name}
                        </Badge>
                      )}
                      {!user.client_name && !user.partner_name && (
                        <span className="text-xs text-gray-500">No org</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {validationResults.duplicates.map((item, idx) => (
                  <TableRow key={`dup-${idx}`} className="bg-orange-50">
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Duplicate
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.user.email}</TableCell>
                    <TableCell>{item.user.full_name}</TableCell>
                    <TableCell className="text-gray-600">{item.user.display_name || '-'}</TableCell>
                    <TableCell>{item.user.app_role || 'User Level 1'}</TableCell>
                    <TableCell>{item.user.department}</TableCell>
                    <TableCell>
                      {item.user.client_name && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {item.user.client_name}
                        </Badge>
                      )}
                      {item.user.partner_name && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          {item.user.partner_name}
                        </Badge>
                      )}
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
                    <TableCell className="font-medium">{item.user.email || 'N/A'}</TableCell>
                    <TableCell>{item.user.full_name || 'N/A'}</TableCell>
                    <TableCell className="text-gray-600">{item.user.display_name || '-'}</TableCell>
                    <TableCell>{item.user.app_role || 'N/A'}</TableCell>
                    <TableCell>{item.user.department || 'N/A'}</TableCell>
                    <TableCell colSpan={1}>
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
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                setUploadStep('upload');
                setCsvData([]);
                setValidationResults({ valid: [], invalid: [], duplicates: [] });
                setUpdateDuplicates(false);
              }
            }}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={processing || (validationResults.valid.length === 0 && (!updateDuplicates || validationResults.duplicates.length === 0))}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Users...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {validationResults.valid.length > 0 && updateDuplicates && validationResults.duplicates.length > 0 
                  ? `Prepare ${validationResults.valid.length} & Update ${validationResults.duplicates.length} Users`
                  : validationResults.valid.length > 0 
                    ? `Prepare ${validationResults.valid.length} Users for Invite`
                    : `Update ${validationResults.duplicates.length} Users`
                }
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (uploadStep === 'bulk-invite') {
    return (
      <BulkInviteUsers
        pendingUsers={pendingUsers}
        onComplete={() => {
          // Reset and call success
          setUploadStep('upload');
          setCsvData([]);
          setValidationResults({ valid: [], invalid: [], duplicates: [] });
          setUpdateDuplicates(false);
          setPendingUsers([]);
          onSuccess();
        }}
        onCancel={() => {
          setUploadStep('upload');
          setCsvData([]);
          setValidationResults({ valid: [], invalid: [], duplicates: [] });
          setUpdateDuplicates(false);
          setPendingUsers([]);
        }}
      />
    );
  }

  return null;
}