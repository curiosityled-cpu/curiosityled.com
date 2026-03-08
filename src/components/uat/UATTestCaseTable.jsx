import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2, CheckCircle2, XCircle, AlertCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function UATTestCaseTable({ testCases, onUpdate, onSelectTestCases }) {
  const [editingCase, setEditingCase] = useState(null);
  const [viewingCase, setViewingCase] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedTests, setSelectedTests] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleEdit = (testCase) => {
    setEditingCase(testCase);
    // Reset form to ensure clean state for new test run entry
    setFormData({
      tester_name: '',
      tester_email: '',
      status: 'Not Tested',
      actual_outcome: '',
      severity: '',
      issue_bug_id: '',
      evidence_url: '',
      notes: ''
    });
  };

  const handleEditClose = () => {
    setEditingCase(null);
    setFormData({});
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const calculateRiskScore = (testRuns) => {
    if (!testRuns || testRuns.length === 0) return 0;

    const severityWeights = { Critical: 100, High: 75, Medium: 50, Low: 25 };
    const statusWeights = { Failed: 1, Blocked: 0.8, Passed: 0, 'Not Tested': 0 };
    let riskSum = 0;
    let failureCount = 0;

    testRuns.forEach(run => {
      if (!run || !run.status) return;
      const severityWeight = severityWeights[run.severity] || 0;
      const statusWeight = statusWeights[run.status] || 0;
      // Each run contributes severity * status weight
      riskSum += (severityWeight * statusWeight) / 100;
      if (run.status === 'Failed' || run.status === 'Blocked') {
        failureCount++;
      }
    });

    // Normalize: base risk from severity, weighted by failure rate
    const baseRisk = (riskSum / testRuns.length) * 100;
    const failureRate = (failureCount / testRuns.length) * 100;
    const score = Math.round((baseRisk + failureRate) / 2);
    return Math.min(100, Math.max(0, score));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.tester_name?.trim()) {
      toast.error("Tester name is required");
      return;
    }
    if (!formData.tester_email?.trim()) {
      toast.error("Tester email is required");
      return;
    }
    if (!isValidEmail(formData.tester_email)) {
      toast.error("Invalid email format");
      return;
    }
    if (!formData.status || formData.status === 'Not Tested') {
      toast.error("Please select a test status");
      return;
    }
    if ((formData.status === 'Failed' || formData.status === 'Blocked') && !formData.severity?.trim()) {
      toast.error("Severity is required for failed or blocked tests");
      return;
    }

    try {
      // Fetch fresh data to avoid race condition
      const freshTestCase = await base44.asServiceRole.entities.UATTestCase.filter({ id: editingCase.id });
      const currentCase = freshTestCase?.[0];

      if (!currentCase) {
        toast.error("Test case not found");
        return;
      }

      // Validate test_runs array structure
      const existingRuns = Array.isArray(currentCase.test_runs) ? currentCase.test_runs : [];

      // Create a new test run entry with all required fields
      const newTestRun = {
        tester_name: formData.tester_name.trim(),
        tester_email: formData.tester_email.trim(),
        status: formData.status,
        test_date: new Date().toISOString(),
        actual_outcome: formData.actual_outcome?.trim() || '',
        severity: formData.severity || '',
        issue_bug_id: formData.issue_bug_id?.trim() || '',
        evidence_url: formData.evidence_url?.trim() || '',
        notes: formData.notes?.trim() || ''
      };

      // Add to test_runs array and calculate new risk score
      const updatedTestRuns = [...existingRuns, newTestRun];
      const newRiskScore = calculateRiskScore(updatedTestRuns);

      await base44.entities.UATTestCase.update(editingCase.id, {
        test_runs: updatedTestRuns,
        overall_risk_score: Math.min(100, newRiskScore)
      });
      toast.success("Test run recorded successfully");
      handleEditClose();
      onUpdate();
    } catch (error) {
      toast.error("Failed to update test case");
      console.error(error);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Passed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Blocked': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const toggleTestSelection = (testId) => {
    const newSelected = selectedTests.includes(testId)
      ? selectedTests.filter(id => id !== testId)
      : [...selectedTests, testId];
    setSelectedTests(newSelected);
    onSelectTestCases?.(newSelected.map(id => testCases.find(t => t.id === id)));
  };

  const toggleAllTests = (checked) => {
    if (checked) {
      const allIds = testCases.map(t => t.id);
      setSelectedTests(allIds);
      // Pass full test case objects for bulk operations
      const selectedCases = testCases.filter(t => allIds.includes(t.id));
      onSelectTestCases?.(selectedCases);
    } else {
      setSelectedTests([]);
      onSelectTestCases?.([]);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Passed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Blocked': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-600 text-white';
      case 'Medium': return 'bg-yellow-600 text-white';
      case 'Low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedTestCases = () => {
    if (!sortConfig.key) return testCases;

    return [...testCases].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'test_case_id':
          aValue = a.test_case_id || '';
          bValue = b.test_case_id || '';
          break;
        case 'feature_area':
          aValue = a.feature_area || '';
          bValue = b.feature_area || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'status':
          aValue = a.test_runs?.[a.test_runs.length - 1]?.status || 'Not Tested';
          bValue = b.test_runs?.[b.test_runs.length - 1]?.status || 'Not Tested';
          break;
        case 'severity':
          aValue = a.test_runs?.[a.test_runs.length - 1]?.severity || '';
          bValue = b.test_runs?.[b.test_runs.length - 1]?.severity || '';
          break;
        case 'risk_score':
          aValue = a.overall_risk_score || 0;
          bValue = b.overall_risk_score || 0;
          break;
        case 'tester':
          aValue = a.test_runs?.[a.test_runs.length - 1]?.tester_name || '';
          bValue = b.test_runs?.[b.test_runs.length - 1]?.tester_name || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const sortedTestCases = getSortedTestCases();

  return (
    <>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={selectedTests.length === testCases.length && testCases.length > 0}
                  onChange={(e) => toggleAllTests(e.target.checked)}
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead className="w-32 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('test_case_id')}>
                <div className="flex items-center">
                  Test ID
                  <SortIcon columnKey="test_case_id" />
                </div>
              </TableHead>
              <TableHead className="w-48 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('feature_area')}>
                <div className="flex items-center">
                  Feature Area
                  <SortIcon columnKey="feature_area" />
                </div>
              </TableHead>
              <TableHead className="min-w-[300px] cursor-pointer hover:bg-gray-100" onClick={() => handleSort('description')}>
                <div className="flex items-center">
                  Description
                  <SortIcon columnKey="description" />
                </div>
              </TableHead>
              <TableHead className="w-32 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Status
                  <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="w-28 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('severity')}>
                <div className="flex items-center">
                  Severity
                  <SortIcon columnKey="severity" />
                </div>
              </TableHead>
              <TableHead className="w-24 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('risk_score')}>
                <div className="flex items-center">
                  Risk Score
                  <SortIcon columnKey="risk_score" />
                </div>
              </TableHead>
              <TableHead className="w-40 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tester')}>
                <div className="flex items-center">
                  Tester
                  <SortIcon columnKey="tester" />
                </div>
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTestCases.map((testCase) => (
              <TableRow 
                key={testCase.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setViewingCase(testCase)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(testCase.id)}
                    onChange={() => toggleTestSelection(testCase.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">{testCase.test_case_id}</TableCell>
                <TableCell className="text-sm">{testCase.feature_area}</TableCell>
                <TableCell className="text-sm">
                  <div className="line-clamp-2">{testCase.description}</div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const latestRun = testCase.test_runs?.[testCase.test_runs.length - 1];
                    const status = latestRun?.status || 'Not Tested';
                    return (
                      <Badge className={getStatusColor(status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          {status}
                        </span>
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const latestRun = testCase.test_runs?.[testCase.test_runs.length - 1];
                    return latestRun?.severity ? (
                      <Badge className={getSeverityColor(latestRun.severity)}>
                        {latestRun.severity}
                      </Badge>
                    ) : null;
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const score = testCase.overall_risk_score || 0;
                    let riskColor = 'bg-green-100 text-green-800';
                    if (score >= 75) riskColor = 'bg-red-100 text-red-800';
                    else if (score >= 50) riskColor = 'bg-orange-100 text-orange-800';
                    else if (score > 0) riskColor = 'bg-yellow-100 text-yellow-800';
                    return <Badge className={riskColor}>{score}</Badge>;
                  })()}
                </TableCell>
                <TableCell className="text-sm">
                  {(() => {
                    const latestRun = testCase.test_runs?.[testCase.test_runs.length - 1];
                    return latestRun ? (
                      <div className="text-sm">
                        <div className="font-medium">{latestRun.tester_name}</div>
                        <div className="text-xs text-gray-500">{testCase.test_runs?.length || 0} run{(testCase.test_runs?.length || 0) !== 1 ? 's' : ''}</div>
                      </div>
                    ) : '-';
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(testCase)}
                    title="Record test run"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCase} onOpenChange={handleEditClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Test Run: {editingCase?.test_case_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingCase?.test_runs && editingCase.test_runs.length > 0 && (
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Previous test runs: {editingCase.test_runs.length}</p>
                <p className="text-xs text-blue-700 mt-1">Adding a new test run below</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={formData.status || 'Not Tested'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Tested">Not Tested</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
               <label className="text-sm font-medium mb-2 block">
                 Severity {(formData.status === 'Failed' || formData.status === 'Blocked') && <span className="text-red-600">*</span>}
               </label>
               <Select
                 value={formData.severity || ''}
                 onValueChange={(value) => setFormData({ ...formData, severity: value })}
                 disabled={formData.status !== 'Failed' && formData.status !== 'Blocked'}
               >
                 <SelectTrigger>
                   <SelectValue placeholder={(formData.status === 'Failed' || formData.status === 'Blocked') ? "Select severity" : "Only for failed/blocked tests"} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Critical">Critical</SelectItem>
                   <SelectItem value="High">High</SelectItem>
                   <SelectItem value="Medium">Medium</SelectItem>
                   <SelectItem value="Low">Low</SelectItem>
                 </SelectContent>
               </Select>
             </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tester Name</label>
              <Input
                value={formData.tester_name || ''}
                onChange={(e) => setFormData({ ...formData, tester_name: e.target.value })}
                placeholder="Enter tester name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tester Email</label>
              <Input
                type="email"
                value={formData.tester_email || ''}
                onChange={(e) => setFormData({ ...formData, tester_email: e.target.value })}
                placeholder="Enter tester email"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Actual Outcome</label>
              <Textarea
                value={formData.actual_outcome || ''}
                onChange={(e) => setFormData({ ...formData, actual_outcome: e.target.value })}
                placeholder="Describe what actually happened during testing"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Issue/Bug ID</label>
              <Input
                value={formData.issue_bug_id || ''}
                onChange={(e) => setFormData({ ...formData, issue_bug_id: e.target.value })}
                placeholder="e.g., #123 or JIRA-456"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Evidence URL</label>
              <Input
                value={formData.evidence_url || ''}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional testing notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditClose}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!formData.tester_name?.trim() || !formData.tester_email?.trim() || !formData.status || formData.status === 'Not Tested' || ((formData.status === 'Failed' || formData.status === 'Blocked') && !formData.severity?.trim())}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingCase} onOpenChange={() => {
      setViewingCase(null);
      setFormData({});
      }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{viewingCase?.test_case_id || 'N/A'}</Badge>
          {(() => {
            const latestRun = viewingCase?.test_runs && viewingCase.test_runs.length > 0
              ? viewingCase.test_runs[viewingCase.test_runs.length - 1]
              : null;
            return latestRun ? (
              <Badge className={getStatusColor(latestRun.status)}>
                {latestRun.status}
              </Badge>
            ) : null;
          })()}
        </DialogTitle>
      </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Feature Area</h4>
                <p className="text-sm text-gray-900">{viewingCase?.feature_area}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Risk Score</h4>
                <div>
                  {(() => {
                    const score = viewingCase?.overall_risk_score || 0;
                    let riskColor = 'bg-green-100 text-green-800';
                    if (score >= 75) riskColor = 'bg-red-100 text-red-800';
                    else if (score >= 50) riskColor = 'bg-orange-100 text-orange-800';
                    else if (score > 0) riskColor = 'bg-yellow-100 text-yellow-800';
                    return <Badge className={riskColor}>{score}</Badge>;
                  })()}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-900">{viewingCase?.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expected Outcome</h4>
              <p className="text-sm text-gray-900">{viewingCase?.expected_outcome || 'Not specified'}</p>
            </div>
            {viewingCase?.test_runs && viewingCase.test_runs.length > 0 ? (
               <>
                 <div>
                   <h4 className="text-sm font-semibold text-gray-700 mb-3">Testers ({(() => {
                     const uniqueTesters = new Map();
                     viewingCase.test_runs.forEach(run => {
                       if (run?.tester_email) {
                         uniqueTesters.set(run.tester_email, {
                           name: run.tester_name,
                           email: run.tester_email,
                           runs: (uniqueTesters.get(run.tester_email)?.runs || 0) + 1,
                           lastTest: run.test_date
                         });
                       }
                     });
                     return uniqueTesters.size;
                   })()})</h4>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     {(() => {
                       const uniqueTesters = new Map();
                       viewingCase.test_runs.forEach(run => {
                         if (run?.tester_email) {
                           uniqueTesters.set(run.tester_email, {
                             name: run.tester_name,
                             email: run.tester_email,
                             runs: (uniqueTesters.get(run.tester_email)?.runs || 0) + 1,
                             lastTest: run.test_date
                           });
                         }
                       });
                       return Array.from(uniqueTesters.values()).map((tester, idx) => (
                         <div key={idx} className="border rounded-lg p-3 bg-blue-50">
                           <div className="font-medium text-sm text-gray-900">{tester.name}</div>
                           <div className="text-xs text-gray-600">{tester.email}</div>
                           <div className="text-xs text-gray-500 mt-1">
                             {tester.runs} test run{tester.runs !== 1 ? 's' : ''} • Last: {tester.lastTest ? new Date(tester.lastTest).toLocaleDateString() : 'N/A'}
                           </div>
                         </div>
                       ));
                     })()}
                   </div>
                 </div>
                 <div>
                   <h4 className="text-sm font-semibold text-gray-700 mb-3">Test Run History ({viewingCase.test_runs.length})</h4>
                   <div className="space-y-4">
                     {viewingCase.test_runs.map((run, idx) => (
                       <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                         <div className="flex items-center justify-between mb-2">
                           <div className="font-medium text-sm text-gray-900">Run #{idx + 1}</div>
                           <div className="flex items-center gap-2">
                             {run?.severity && <Badge className={getSeverityColor(run.severity)}>{run.severity}</Badge>}
                             <Badge className={getStatusColor(run?.status || 'Not Tested')}>{run?.status || 'Not Tested'}</Badge>
                           </div>
                         </div>
                         <div className="space-y-2 text-sm">
                           <p><span className="text-gray-600">Tester:</span> {run?.tester_name || 'Unknown'} ({run?.tester_email || '-'})</p>
                           <p><span className="text-gray-600">Date:</span> {run?.test_date ? new Date(run.test_date).toLocaleString() : 'N/A'}</p>
                           {run?.actual_outcome && <p><span className="text-gray-600">Outcome:</span> {run.actual_outcome}</p>}
                           {run?.issue_bug_id && <p><span className="text-gray-600">Issue ID:</span> {run.issue_bug_id}</p>}
                           {run?.evidence_url && (
                             <p><span className="text-gray-600">Evidence:</span> <a href={run.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></p>
                           )}
                           {run?.notes && <p><span className="text-gray-600">Notes:</span> {run.notes}</p>}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-center py-6 text-gray-500">
                 <p className="text-sm">No test runs recorded yet</p>
               </div>
             )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingCase(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}