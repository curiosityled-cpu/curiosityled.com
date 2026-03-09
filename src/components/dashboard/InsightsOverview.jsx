import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  Lightbulb,
  Users,
  Target,
  BarChart3,
  Info,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Award,
  BookOpen,
  Building2,
  Shield,
  Activity,
  Send,
  UserPlus,
  Calendar,
  Database,
  Settings,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Helper to get data from localStorage
const getCachedData = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  // Cache is valid for 1 hour
  if (new Date().getTime() - timestamp > 3600 * 1000) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
};

// Helper to set data in localStorage
const setCachedData = (key, data) => {
  const payload = { data, timestamp: new Date().getTime() };
  localStorage.setItem(key, JSON.stringify(payload));
};

// Skeleton Loader Component
const InsightsSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  </div>
);


export default function InsightsOverview({ hasAssessment: hasAssessmentProp, assessmentData: assessmentDataProp }) {
  const { user, appRole, isUserLevel1, isManagerOfManagers, isOrgLeader, isProgramManager, isAdmin, isSuperAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    setLoading(true);

    const cacheKey = `insights_${user.email}_${appRole}`;
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setInsightsData(cachedData.data);
        setLastUpdated(new Date(cachedData.timestamp));
        setLoading(false);
        return;
      }
    }

    try {
      let data = null;
      if (isUserLevel1) data = await fetchUserLevel1Data();
      else if (isManagerOfManagers) data = await fetchManagerData();
      else if (isOrgLeader) data = await fetchOrgLeaderData();
      else if (isProgramManager) data = await fetchProgramManagerData();
      else if (isAdmin) data = await fetchAdminData();
      else if (isSuperAdmin) data = await fetchSuperAdminData();
      else {
        // Default fallback for roles without specific insights
        data = { keyInsights: [], trends: [], peerComparison: [] };
      }
      
      const timestamp = new Date();
      setInsightsData(data);
      setLastUpdated(timestamp);
      setCachedData(cacheKey, { data, timestamp: timestamp.getTime() });
      if (forceRefresh) toast.success("Insights have been refreshed!");

    } catch (error) {
      console.error("Failed to fetch insights:", error);
      toast.error("Could not load fresh insights.");
      // Set empty data to prevent crashes
      setInsightsData({ keyInsights: [], trends: [], peerComparison: [] });
    } finally {
      setLoading(false);
    }
  }, [user, appRole, isUserLevel1, isManagerOfManagers, isOrgLeader, isProgramManager, isAdmin, isSuperAdmin]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // --- DATA FETCHING LOGIC PER ROLE ---

  const fetchUserLevel1Data = async () => {
    const [latestAssessment, goals, learning, allUsers] = await Promise.all([
      base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1).then(r => r[0]),
      base44.entities.Goal.filter({ created_by: user.email }),
      base44.entities.AssignedLearning.filter({ user_email: user.email }),
      base44.entities.User.list(),
    ]);

    // Trends
    const completedGoals = goals.filter(g => g.completion_percentage === 100);
    const completedLearning = learning.filter(l => l.status === 'completed');
    const trends = [
      { metric: "Goals Completed", value: `${completedGoals.length}/${goals.length}` },
      { metric: "Learning Completed", value: `${completedLearning.length}/${learning.length}` },
    ];

    // Peer Comparison
    const peers = allUsers.filter(u => u.role_level === user.role_level && u.id !== user.id);
    const peerAssessments = await base44.entities.Assessment.filter({ email: { "$in": peers.map(p => p.email) } });
    const avgPeerScore = peerAssessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / (peerAssessments.length || 1);
    const peerComparison = [
      { area: "Situational Intelligence", percentile: Math.round(latestAssessment?.si_pct || 0), description: `You vs. Peer Average (${Math.round(avgPeerScore)}%)`},
    ];

    // AI Insights
    const prompt = `Based on this leader's assessment data: ${JSON.stringify(latestAssessment)}, their goal progress (completed ${completedGoals.length} of ${goals.length} goals), and their learning completion rate of ${learning.length > 0 ? Math.round(completedLearning.length/learning.length * 100) : 0}%, provide 3 specific, actionable insights for their development. Format as a JSON array of objects, where each object has 'title', 'description', 'priority' ('high', 'medium', or 'strength'), and 'actionable' (boolean).`;
    const aiResult = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: { 
          insights: { 
            type: "array", 
            items: { type: "object" } 
          }
        },
        required: ["insights"]
      } 
    });
    const aiInsights = aiResult?.insights || [];

    return { keyInsights: aiInsights, trends, peerComparison };
  };

  const fetchManagerData = async () => {
    const directReports = await base44.entities.User.filter({ manager_email: user.email });
    const reportEmails = directReports.map(r => r.email);
    const [reportAssessments, reportGoals] = await Promise.all([
        base44.entities.Assessment.filter({ email: { "$in": reportEmails } }),
        base44.entities.Goal.filter({ created_by: { "$in": reportEmails } }),
    ]);

    const atRiskCount = reportAssessments.filter(a => (a.overall_pct || 0) < 60).length;
    const topPerformer = reportAssessments.sort((a,b) => (b.si_pct || 0) - (a.si_pct || 0))[0];
    const topPerformerUser = topPerformer ? directReports.find(u => u.email === topPerformer.email) : null;

    const prompt = `You are a leadership coach analyzing a team of ${directReports.length} leaders. ${atRiskCount} members are at risk (score < 60%). The top performer is ${topPerformerUser?.full_name || 'N/A'} with a Situational Intelligence score of ${topPerformer?.si_pct || 'N/A'}%. The team's biggest collective development need is in Communication. Based on this, provide 3 actionable team insights. Format as a JSON array of objects with 'title', 'description', 'priority' ('Urgent', 'Opportunity', 'High Priority'), and 'action' ('Assign Learning', 'Schedule 1:1s', 'Create Dev Plan').`;
    const aiResult = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: { 
          insights: { 
            type: "array", 
            items: { type: "object" } 
          }
        },
        required: ["insights"]
      } 
    });
    const aiInsights = aiResult?.insights || [];
    
    return { keyInsights: aiInsights, trends: [], peerComparison: [] };
  };
  
  // Stubs for other roles to be filled
  const fetchOrgLeaderData = async () => {
    const prompt = "Generate 3 mock strategic insights for an Org Leader. Use priority 'High Risk', 'Strategic Priority', 'Positive Impact'. Use actions 'Review Succession Plan', 'Initiate Development Program', 'View Full Analysis'.";
    const result = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: {
          insights: {
            type: "array", 
            items: { type: "object" }
          }
        },
        required: ["insights"]
      } 
    });
    return { keyInsights: result?.insights || [], trends: [], peerComparison: [] };
  };
  const fetchProgramManagerData = async () => {
    const prompt = "Generate 3 mock program management insights. Use priority 'Attention Needed', 'Urgent', 'Success'. Use actions 'Review Module Content', 'Send Reminder Campaign', 'Analyze Success Factors'.";
    const result = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: {
          insights: {
            type: "array", 
            items: { type: "object" }
          }
        },
        required: ["insights"]
      } 
    });
    return { keyInsights: result?.insights || [], trends: [], peerComparison: [] };
  };
  const fetchAdminData = async () => {
    const prompt = "Generate 3 mock platform admin insights. Use priority 'Review Needed', 'Positive', 'On Schedule'. Use actions 'Review Resources', 'View Analytics', 'View Assessment Dashboard'.";
    const result = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: {
          insights: {
            type: "array", 
            items: { type: "object" }
          }
        },
        required: ["insights"]
      } 
    });
    return { keyInsights: result?.insights || [], trends: [], peerComparison: [] };
  };
  const fetchSuperAdminData = async () => {
    const prompt = "Generate 3 mock super admin insights. Use priority 'Healthy', 'Strong Growth', 'Review Needed'. Use actions 'View System Dashboard', 'View Growth Analytics', 'Run Integrity Check'.";
    const result = await base44.integrations.Core.InvokeLLM({ 
      prompt, 
      response_json_schema: { 
        type: "object", 
        properties: {
          insights: {
            type: "array", 
            items: { type: "object" }
          }
        },
        required: ["insights"]
      } 
    });
    return { keyInsights: result?.insights || [], trends: [], peerComparison: [] };
  };


  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'high priority':
      case 'urgent':
      case 'high risk':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
      case 'attention needed':
      case 'strategic priority':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'strength':
      case 'opportunity':
      case 'positive impact':
      case 'success':
      case 'healthy':
      case 'strong growth':
      case 'positive':
      case 'on schedule':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPercentileColor = (percentile) => {
      if (percentile >= 75) return { bg: "bg-green-50", text: "text-green-800", badge: "bg-green-100 text-green-800" };
      if (percentile >= 50) return { bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-100 text-blue-800" };
      return { bg: "bg-yellow-50", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-800" };
  };
  
  const renderHeader = () => {
    let title = "Insights";
    let icon = <Lightbulb className="w-5 h-5 text-yellow-600" />;
    if(isManagerOfManagers) { title = "AI-Generated Team Insights"; icon = <Sparkles className="w-5 h-5 text-purple-600" />; }
    if(isOrgLeader) { title = "Strategic Organizational Insights"; icon = <Sparkles className="w-5 h-5 text-emerald-600" />; }
    if(isProgramManager) { title = "Program Management Insights"; icon = <Sparkles className="w-5 h-5 text-blue-600" />; }
    if(isAdmin) { title = "Platform Administration Insights"; icon = <Sparkles className="w-5 h-5 text-indigo-600" />; }
    if(isSuperAdmin) { title = "Platform Health & Strategic Insights"; icon = <Shield className="w-5 h-5 text-purple-600" />; }

    return (
        <CardTitle className="text-lg flex items-center gap-2">
            {icon} {title}
        </CardTitle>
    );
  };

  // MAIN RENDER
  if (loading) {
    return <InsightsSkeleton />;
  }

  if (!insightsData || !insightsData.keyInsights || insightsData.keyInsights.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md text-center p-8">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insights Available</h3>
          <p className="text-sm text-gray-600">
            There was an issue generating insights, or no data is available for analysis yet. Please complete an assessment or check back later.
          </p>
        </Card>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-end items-center gap-2 text-xs text-gray-500">
            <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}</span>
            <Button variant="outline" size="sm" onClick={() => fetchInsights(true)}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>

        {/* AI-Generated Insights */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            {renderHeader()}
            <p className="text-sm text-gray-600">Personalized recommendations based on your data</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insightsData.keyInsights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 border rounded-lg ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <Badge className={getPriorityColor(insight.priority)}>
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  {insight.actionable && (
                    <Link to={createPageUrl("LearningLibrary")}>
                      <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-800">
                        Take Action
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trends - Only for User Level 1 */}
        {isUserLevel1 && insightsData.trends && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Performance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {insightsData.trends.map((trend, idx) => (
                  <div key={idx} className="p-4 border rounded-lg text-center">
                    <div className={`text-2xl font-bold mb-1 text-blue-600`}>
                      {trend.value}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{trend.metric}</h4>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Peer Comparison - Only for User Level 1 */}
        {isUserLevel1 && insightsData.peerComparison && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Peer Comparison
              </CardTitle>
              <p className="text-sm text-gray-600">How you compare to similar leaders</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insightsData.peerComparison.map((item, idx) => {
                  const colors = getPercentileColor(item.percentile);
                  return (
                    <div key={idx} className={`p-4 ${colors.bg} rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.area}</span>
                        <Badge className={colors.badge}>{item.percentile}th Percentile</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generic CTA, remains mock */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unlock Advanced Analytics</h3>
            <p className="text-gray-600 mb-4">
              Get deeper insights, team comparisons, and predictive leadership analytics
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open('https://cal.com/curiosityled/discoverycall', '_blank')}
            >
              Upgrade to Premium
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}