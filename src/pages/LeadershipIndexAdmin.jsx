import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, Database, CheckCircle, AlertCircle, 
  Loader2, Upload, Download, BarChart3, 
  FileText, Users, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import PageHeader from "@/components/common/PageHeader";
import { createPageUrl } from "@/utils";

function LeadershipIndexAdmin() {
  const [systemStatus, setSystemStatus] = useState({
    competencies: { loaded: false, count: 0, status: 'checking' },
    questions: { loaded: false, count: 0, status: 'checking' },
    submissions: { loaded: false, count: 0, status: 'checking' }
  });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const [competencies, questions, submissions] = await Promise.all([
        base44.entities.Competency.filter({ is_platform_default: true }),
        base44.entities.AssessmentQuestion.list('-created_date', 10),
        base44.entities.AssessmentSubmission.list('-created_date', 10)
      ]);

      setSystemStatus({
        competencies: {
          loaded: competencies.length >= 6,
          count: competencies.length,
          status: competencies.length >= 6 ? 'ready' : 'needs_init'
        },
        questions: {
          loaded: questions.length > 0,
          count: questions.length,
          status: questions.length > 0 ? 'ready' : 'needs_import'
        },
        submissions: {
          loaded: true,
          count: submissions.length,
          status: 'ready'
        }
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      toast.error('Failed to check system status');
    } finally {
      setLoading(false);
    }
  };

  const initializeCompetencies = async () => {
    if (systemStatus.competencies.loaded) {
      toast.info('Competencies already initialized');
      return;
    }

    setInitializing(true);
    try {
      await base44.functions.invoke('initializeLeadershipIndex');
      toast.success('Competencies initialized successfully');
      await checkSystemStatus();
    } catch (error) {
      console.error('Error initializing competencies:', error);
      toast.error('Failed to initialize competencies');
    } finally {
      setInitializing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'needs_init':
        return <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="w-3 h-3 mr-1" />Needs Init</Badge>;
      case 'needs_import':
        return <Badge className="bg-blue-100 text-blue-800"><Upload className="w-3 h-3 mr-1" />Needs Import</Badge>;
      default:
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Checking</Badge>;
    }
  };

  const adminActions = [
    {
      title: 'Question Editor',
      description: 'Add, edit, and manage assessment questions',
      icon: Database,
      color: 'purple',
      action: () => window.location.href = createPageUrl('QuestionEditor'),
      available: true
    },
    {
      title: 'Question Bank Import',
      description: 'Bulk import questions from JSON format',
      icon: Upload,
      color: 'blue',
      action: () => window.location.href = createPageUrl('QuestionBankImport'),
      available: true
    },
    {
      title: 'Analytics Dashboard',
      description: 'View comprehensive analytics and insights',
      icon: BarChart3,
      color: 'green',
      action: () => window.location.href = createPageUrl('LeadershipIndexAnalytics'),
      available: true
    },
    {
      title: 'Assessment Results',
      description: 'View individual assessment results and reports',
      icon: FileText,
      color: 'amber',
      action: () => window.location.href = createPageUrl('AssessmentResults'),
      available: true
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Leadership Index Administration"
          subtitle="System configuration and management tools"
          badges={[
            { text: 'Platform Admin', className: "bg-white text-purple-600" },
            { text: 'Admin Tools', className: "bg-white text-blue-600" }
          ]}
          onRefresh={checkSystemStatus}
          headerColor="#9333EA"
        />

        {/* System Status */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Competencies */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Core Competencies</p>
                    <p className="text-sm text-gray-600">
                      {systemStatus.competencies.count} competencies defined
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(systemStatus.competencies.status)}
                  {!systemStatus.competencies.loaded && (
                    <Button
                      onClick={initializeCompetencies}
                      disabled={initializing}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {initializing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Initialize
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Questions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Assessment Questions</p>
                    <p className="text-sm text-gray-600">
                      {systemStatus.questions.count} questions in bank
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(systemStatus.questions.status)}
                  {!systemStatus.questions.loaded && (
                    <Button
                      onClick={() => window.location.href = createPageUrl('QuestionBankImport')}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Questions
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Submissions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Assessment Submissions</p>
                    <p className="text-sm text-gray-600">
                      {systemStatus.submissions.count} total submissions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(systemStatus.submissions.status)}
                  {systemStatus.submissions.count > 0 && (
                    <Button
                      onClick={() => window.location.href = createPageUrl('LeadershipIndexAnalytics')}
                      variant="outline"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Administration Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminActions.map((action, idx) => {
                const Icon = action.icon;
                const colorClasses = {
                  purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
                  blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
                  green: 'bg-green-100 text-green-600 hover:bg-green-200',
                  amber: 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                };

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <button
                      onClick={action.action}
                      disabled={!action.available}
                      className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[action.color]}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        {(!systemStatus.competencies.loaded || !systemStatus.questions.loaded) && (
          <Card className="border-0 shadow-lg mt-8 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Start Guide</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Initialize Core Competencies</p>
                    <p className="text-sm text-gray-600">
                      Click "Initialize" above to create the 6 default Leadership Index competencies
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Import Assessment Questions</p>
                    <p className="text-sm text-gray-600">
                      Use the Question Bank Import tool to bulk upload questions in JSON format
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Test the Assessment</p>
                    <p className="text-sm text-gray-600">
                      Take a test assessment to verify everything is working correctly
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default withAuthProtection(LeadershipIndexAdmin, {
  allowedRoles: ['Platform Admin']
});