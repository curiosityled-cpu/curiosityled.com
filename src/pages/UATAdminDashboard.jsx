import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
        FileText,
        Download,
        Search,
        CheckCircle2,
        XCircle,
        AlertCircle,
        Clock,
        RefreshCw,
        Menu,
        Plus,
        Users,
        Settings,
        FileDown,
        Lightbulb
      } from "lucide-react";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UATTestCaseTable from "@/components/uat/UATTestCaseTable";
import AddTestCaseModal from "@/components/uat/AddTestCaseModal";
import BulkAssignTestCasesModal from "@/components/uat/BulkAssignTestCasesModal";
import ManualAssignTestCasesModal from "@/components/uat/ManualAssignTestCasesModal";
import UATStatusCharts from "@/components/uat/UATStatusCharts";
import UATAIRecommendations from "@/components/uat/UATAIRecommendations";
import FeatureSuggestionsTable from "@/components/uat/FeatureSuggestionsTable";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function UATAdminDashboard() {
  const { user } = useAuth();
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFeature, setFilterFeature] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showManualAssignModal, setShowManualAssignModal] = useState(false);
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [viewTab, setViewTab] = useState("test-cases");
  const [featureSuggestions, setFeatureSuggestions] = useState([]);

  useEffect(() => {
    loadTestCases();
    loadFeatureSuggestions();
  }, []);

  const loadTestCases = async () => {
    try {
      setLoading(true);
      // Platform Admins can see all test cases via RLS
      const cases = await base44.entities.UATTestCase.list();
      console.log('Loaded UAT test cases:', cases?.length || 0, cases);
      setTestCases(cases || []);
      setSelectedTestCases([]);
    } catch (error) {
      console.error("Error loading test cases:", error);
      toast.error("Failed to load test cases");
      setTestCases([]);
      setSelectedTestCases([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureSuggestions = async () => {
    try {
      const suggestions = await base44.entities.FeatureSuggestion.list('-created_date');
      setFeatureSuggestions(suggestions || []);
    } catch (error) {
      console.error("Error loading feature suggestions:", error);
      setFeatureSuggestions([]);
    }
  };

  // Helper to get latest test run
  const getLatestTestRun = (testCase) => {
    return testCase.test_runs && testCase.test_runs.length > 0 
      ? testCase.test_runs[testCase.test_runs.length - 1] 
      : null;
  };

  // Memoized stats calculation to prevent unnecessary re-renders
  const stats = React.useMemo(() => ({
    total: testCases.length,
    notTested: testCases.filter(t => !t.test_runs || t.test_runs.length === 0).length,
    passed: testCases.filter(t => {
      const latest = getLatestTestRun(t);
      return latest?.status === 'Passed';
    }).length,
    failed: testCases.filter(t => {
      const latest = getLatestTestRun(t);
      return latest?.status === 'Failed';
    }).length,
    blocked: testCases.filter(t => {
      const latest = getLatestTestRun(t);
      return latest?.status === 'Blocked';
    }).length,
    passRate: testCases.length > 0 
      ? ((testCases.filter(t => {
          const latest = getLatestTestRun(t);
          return latest?.status === 'Passed';
        }).length / testCases.length) * 100).toFixed(1)
      : 0,
    criticalIssues: testCases.filter(t => t.test_runs?.some(r => r.status === 'Failed' && r.severity === 'Critical')).length,
    highIssues: testCases.filter(t => t.test_runs?.some(r => r.status === 'Failed' && r.severity === 'High')).length,
    avgRiskScore: testCases.length > 0 
      ? Math.round(testCases.reduce((sum, t) => sum + (t.overall_risk_score || 0), 0) / testCases.length)
      : 0
  }), [testCases]);

  // Memoize feature areas to prevent array recreation
  const featureAreas = React.useMemo(() => 
    [...new Set(testCases.map(t => t.feature_area))].filter(Boolean).sort()
  , [testCases]);

  // Memoized filtered test cases
  const filteredTestCases = React.useMemo(() => 
    testCases.filter(tc => {
      const matchesRole = filterRole === 'all' || tc.role === filterRole;
      const latest = getLatestTestRun(tc);
      const latestStatus = latest?.status || 'Not Tested';
      const matchesStatus = filterStatus === 'all' || latestStatus === filterStatus;
      const matchesFeature = filterFeature === 'all' || tc.feature_area === filterFeature;
      const matchesSearch = searchTerm === '' || 
        (tc.test_case_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (tc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (tc.feature_area?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      if (activeTab !== 'all' && activeTab !== tc.role) return false;
      return matchesRole && matchesStatus && matchesFeature && matchesSearch;
    })
  , [testCases, filterRole, filterStatus, filterFeature, searchTerm, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / (itemsPerPage === -1 ? filteredTestCases.length : itemsPerPage));
  const paginatedTestCases = React.useMemo(() => {
    if (itemsPerPage === -1) return filteredTestCases;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTestCases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTestCases, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterFeature, activeTab]);

  const exportToCSV = () => {
    const headers = ['Test Case ID', 'Role', 'Feature Area', 'Description', 'Expected Outcome', 'Test Runs Count', 'Latest Status', 'Risk Score', 'Latest Tester', 'Latest Test Date'];
    const rows = filteredTestCases.map(tc => {
      const latestRun = getLatestTestRun(tc);
      return [
        tc.test_case_id || '',
        tc.role || '',
        tc.feature_area || '',
        (tc.description || '').replace(/"/g, '""'),
        (tc.expected_outcome || '').replace(/"/g, '""'),
        tc.test_runs?.length || 0,
        latestRun?.status || 'Not Tested',
        tc.overall_risk_score || 0,
        latestRun?.tester_name || '-',
        latestRun?.test_date ? new Date(latestRun.test_date).toLocaleString() : '-'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `uat-test-cases-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    try {
      link.click();
      toast.success("CSV exported successfully");
    } catch (err) {
      toast.error("Failed to download CSV");
      console.error(err);
    } finally {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading UAT test cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 rounded-2xl p-8 text-white" style={{ backgroundColor: '#0201ff' }}>
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">UAT Test Case Management</h1>
              <p className="text-white/90 max-w-2xl">Manage and track all user acceptance testing scenarios</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Hamburger Menu */}
              <DropdownMenu open={showHeaderMenu} onOpenChange={setShowHeaderMenu}>
                <DropdownMenuTrigger asChild>
                  <button className="text-white hover:bg-white/20 p-2 rounded transition-colors">
                    <Menu className="w-6 h-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => {
                    setShowAddModal(true);
                    setShowHeaderMenu(false);
                  }} className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-3" />
                    Add Test Case
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (filteredTestCases.length === 0) return;
                    setShowBulkAssignModal(true);
                    setShowHeaderMenu(false);
                  }} disabled={filteredTestCases.length === 0} className="cursor-pointer">
                    <Users className="w-4 h-4 mr-3" />
                    Bulk Assign Tests
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    if (selectedTestCases.length === 0) return;
                    setShowManualAssignModal(true);
                    setShowHeaderMenu(false);
                  }} disabled={selectedTestCases.length === 0} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-3" />
                    Assign Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Badges */}
              <div className="flex gap-2">
                <Badge className="bg-white/90 text-blue-600 hover:bg-white/80 text-xs">Platform Administrator</Badge>
                <Badge className="bg-white/90 text-blue-600 hover:bg-white/80 text-xs">{testCases.length} Test Cases</Badge>
                <Badge className="bg-white/90 text-blue-600 hover:bg-white/80 text-xs">{((stats.passRate || 0))}% Pass Rate</Badge>
              </div>

              {/* Action Icons */}
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={loadTestCases}
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={exportToCSV}
                  title="Export CSV"
                >
                  <FileText className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => toast.info("PDF export coming soon")}
                  title="Export PDF"
                >
                  <FileDown className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Visualization */}
        <div className="mb-8">
          <UATStatusCharts testCases={testCases} />
        </div>

        {/* AI Recommendations */}
        <div className="mb-8">
          <UATAIRecommendations testCases={testCases} />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Not Tested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold">{stats.notTested}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.passed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold">{stats.failed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold">{stats.blocked}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{stats.passRate}%</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold">{stats.criticalIssues}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">High</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold">{stats.highIssues}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">{stats.avgRiskScore}</span>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search test cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({testCases.length})</SelectItem>
                  <SelectItem value="User">User ({testCases.filter(t => t.role === 'User').length})</SelectItem>
                  <SelectItem value="Team Leader">Team Leader ({testCases.filter(t => t.role === 'Team Leader').length})</SelectItem>
                  <SelectItem value="Analyst">Analyst ({testCases.filter(t => t.role === 'Analyst').length})</SelectItem>
                  <SelectItem value="Program Administrator">Program Admin ({testCases.filter(t => t.role === 'Program Administrator').length})</SelectItem>
                  <SelectItem value="HR Administrator">HR Admin ({testCases.filter(t => t.role === 'HR Administrator').length})</SelectItem>
                  <SelectItem value="Super Administrator">Super Admin ({testCases.filter(t => t.role === 'Super Administrator').length})</SelectItem>
                  <SelectItem value="Partner Business Administrator">Partner ({testCases.filter(t => t.role === 'Partner Business Administrator').length})</SelectItem>
                  <SelectItem value="Platform Administrator">Platform Admin ({testCases.filter(t => t.role === 'Platform Administrator').length})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Not Tested">Not Tested</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
              </Select>

              <Select value={filterFeature} onValueChange={setFilterFeature}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Feature Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Features</SelectItem>
                  {featureAreas.map(feature => (
                    <SelectItem key={feature} value={feature}>{feature}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="ml-auto">
                {filteredTestCases.length} of {testCases.length} cases
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Test Cases and Feature Suggestions */}
        <Tabs value={viewTab} onValueChange={setViewTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="test-cases" className="gap-2">
              <FileText className="w-4 h-4" />
              Test Cases ({testCases.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Feature Suggestions ({featureSuggestions.length})
            </TabsTrigger>
          </TabsList>

          {/* Test Cases Tab */}
          <TabsContent value="test-cases">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Test Cases</CardTitle>
                  <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="-1">All items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTestCases.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No test cases found</p>
                    <p className="text-sm">Try adjusting your filters or add new test cases</p>
                  </div>
                ) : (
                  <>
                    <UATTestCaseTable 
                      testCases={paginatedTestCases} 
                      onUpdate={loadTestCases}
                      onSelectTestCases={setSelectedTestCases}
                    />
                    
                    {/* Pagination Controls */}
                    {itemsPerPage !== -1 && totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTestCases.length)} of {filteredTestCases.length}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-10"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Feature Suggestions
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {featureSuggestions.filter(s => s.status === 'pending').length} Pending
                    </Badge>
                    <Badge variant="outline">
                      {featureSuggestions.filter(s => s.status === 'planned').length} Planned
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FeatureSuggestionsTable 
                  suggestions={featureSuggestions} 
                  onUpdate={loadFeatureSuggestions}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddTestCaseModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={loadTestCases} 
      />

      <BulkAssignTestCasesModal
        open={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        role={activeTab === 'all' ? null : activeTab}
        testCases={filteredTestCases}
        onSuccess={loadTestCases}
      />

      <ManualAssignTestCasesModal
        open={showManualAssignModal}
        onClose={() => setShowManualAssignModal(false)}
        selectedTestCases={selectedTestCases}
        onSuccess={loadTestCases}
      />
    </div>
  );
}

export default withAuthProtection(UATAdminDashboard, {
  allowedRoles: ['Platform Admin']
});