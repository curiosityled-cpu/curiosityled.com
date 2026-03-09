import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Loader2,
  Brain,
  TrendingUp,
  AlertTriangle,
  Award,
  Eye,
  UserPlus,
  Star,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import AssignAssessmentModal from "@/components/assignment/AssignAssessmentModal";

export default function TeamAssessmentsView() {
  const { user, appRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamAssessments, setTeamAssessments] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  const canAssign = ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(appRole);

  useEffect(() => {
    if (user) {
      loadTeamData();
    }
  }, [user]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const subordinateEmails = user.subordinate_emails || [];
      
      let members = [];
      if (subordinateEmails.length > 0) {
        members = await base44.entities.User.filter({ email: { $in: subordinateEmails } });
      }

      let assessments = [];
      if (subordinateEmails.length > 0) {
        const allAssessments = await base44.entities.Assessment.list('-created_date');
        assessments = allAssessments.filter(a => subordinateEmails.includes(a.email));
      }

      setTeamMembers(members);
      setTeamAssessments(assessments);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichedData = useMemo(() => {
    return teamMembers.map(member => {
      const memberAssessments = teamAssessments.filter(a => a.email === member.email);
      const latestAssessment = memberAssessments[0];
      
      return {
        ...member,
        assessmentCount: memberAssessments.length,
        latestAssessment,
        overallScore: latestAssessment?.overall_pct || null,
        siScore: latestAssessment?.si_pct || null,
        dmScore: latestAssessment?.dm_pct || null,
        commScore: latestAssessment?.comm_pct || null,
        rmScore: latestAssessment?.rm_pct || null,
        smScore: latestAssessment?.sm_pct || null,
        pmScore: latestAssessment?.pm_pct || null,
        archetype: latestAssessment?.archetype_label || null,
        lastAssessmentDate: latestAssessment?.submission_ts || null
      };
    });
  }, [teamMembers, teamAssessments]);

  const metrics = useMemo(() => {
    const withAssessments = enrichedData.filter(m => m.assessmentCount > 0);
    const scores = withAssessments.filter(m => m.overallScore !== null).map(m => m.overallScore);
    const siScores = withAssessments.filter(m => m.siScore !== null).map(m => m.siScore);
    
    return {
      totalMembers: enrichedData.length,
      highPerformerCount: scores.filter(s => s >= 85).length,
      avgSiScore: siScores.length > 0 ? Math.round(siScores.reduce((a, b) => a + b, 0) / siScores.length) : 0,
      highPotentialCount: scores.filter(s => s >= 70 && s < 85).length,
      successionReadyCount: scores.filter(s => s >= 80).length,
      needsDevelopmentCount: scores.filter(s => s < 55).length
    };
  }, [enrichedData]);

  const competencyAverages = useMemo(() => {
    const withScores = enrichedData.filter(m => m.latestAssessment);
    if (withScores.length === 0) return [];

    return [
      { name: 'Decision Making', score: Math.round(withScores.reduce((sum, m) => sum + (m.dmScore || 0), 0) / withScores.length) },
      { name: 'Communication', score: Math.round(withScores.reduce((sum, m) => sum + (m.commScore || 0), 0) / withScores.length) },
      { name: 'Resource Mgmt', score: Math.round(withScores.reduce((sum, m) => sum + (m.rmScore || 0), 0) / withScores.length) },
      { name: 'Stakeholder Mgmt', score: Math.round(withScores.reduce((sum, m) => sum + (m.smScore || 0), 0) / withScores.length) },
      { name: 'Performance Mgmt', score: Math.round(withScores.reduce((sum, m) => sum + (m.pmScore || 0), 0) / withScores.length) },
      { name: 'Situational Intelligence', score: Math.round(withScores.reduce((sum, m) => sum + (m.siScore || 0), 0) / withScores.length) }
    ].sort((a, b) => b.score - a.score);
  }, [enrichedData]);

  const teamStrengths = competencyAverages.slice(0, 2);
  const developmentFocus = competencyAverages.slice(-2);

  const atRiskMembers = useMemo(() => {
    return enrichedData
      .filter(m => m.overallScore && m.overallScore < 70)
      .sort((a, b) => (a.overallScore || 0) - (b.overallScore || 0))
      .slice(0, 3);
  }, [enrichedData]);

  const getStatusBadge = (score) => {
    if (!score) return { label: 'pending', color: 'bg-gray-100 text-gray-600' };
    if (score >= 85) return { label: 'exceeds', color: 'bg-green-100 text-green-700' };
    if (score >= 70) return { label: 'meets', color: 'bg-blue-100 text-blue-700' };
    if (score >= 55) return { label: 'developing', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'high', color: 'bg-red-100 text-red-700' };
  };

  const getRiskLevel = (score) => {
    if (!score) return 'unknown';
    if (score >= 70) return 'low';
    if (score >= 55) return 'medium';
    return 'high';
  };

  const toggleCardExpand = (memberId) => {
    setExpandedCards(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card className="border-0 shadow-lg text-center py-12">
        <CardContent>
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Members</h3>
          <p className="text-gray-600">Add subordinates to your profile to view their assessment data</p>
        </CardContent>
      </Card>
    );
  }

  const totalTeamSize = enrichedData.reduce((sum, m) => sum + (m.subordinate_emails?.length || 0), 0) + enrichedData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Leadership Team</h2>
        <p className="text-gray-600">
          {user.job_title || 'VP Operations'} • Managing {metrics.totalMembers} manager{metrics.totalMembers !== 1 ? 's' : ''} across {totalTeamSize} team members
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalMembers}</p>
            <p className="text-xs text-gray-500">Direct Reports</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.highPerformerCount}</p>
            <p className="text-xs text-gray-500">High Performers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgSiScore}</p>
            <p className="text-xs text-gray-500">Avg SI Score</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-2">
              <Star className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.highPotentialCount}</p>
            <p className="text-xs text-gray-500">High Potential</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.successionReadyCount}</p>
            <p className="text-xs text-gray-500">Succession Ready</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <Target className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.needsDevelopmentCount}</p>
            <p className="text-xs text-gray-500">Need Development</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Competencies & Strategic Impact */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Leadership Competencies & Strategic Impact</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Competency Scores */}
                <div>
                  <div className="space-y-3 mb-6">
                    {competencyAverages.map((comp, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-36 truncate">{comp.name}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${comp.score}%`,
                              backgroundColor: comp.score >= 75 ? '#0202ff' : comp.score >= 60 ? '#6366f1' : '#a5b4fc'
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8">{comp.score}</span>
                      </div>
                    ))}
                  </div>

                  {/* Team Strengths & Development */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Team Strengths</p>
                      <p className="text-sm text-gray-600">
                        Strong {teamStrengths.map(s => s.name.toLowerCase()).join(' and ')} capabilities
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Development Focus</p>
                      <p className="text-sm text-gray-600">
                        {developmentFocus.map(s => s.name).join(' and ')} skills need attention
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Goal Alignment */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Business Goal Alignment</p>
                  <div className="space-y-3">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-900">Strategic Execution</p>
                      <p className="text-xs text-purple-700 mt-1">
                        Strong decision making capabilities enable rapid strategic pivots and execution
                      </p>
                      <p className="text-[10px] text-purple-500 mt-2">
                        Key Metrics: 45% faster escalations, faster strategic decision cycles
                      </p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-900">Leadership Pipeline</p>
                      <p className="text-xs text-green-700 mt-1">
                        Effective performance management creates sustainable leadership bench strength
                      </p>
                      <p className="text-[10px] text-green-500 mt-2">
                        Key Metrics: 82% succession readiness, reduced external hiring costs
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900">Organizational Alignment</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Superior stakeholder management drives cross-functional collaboration
                      </p>
                      <p className="text-[10px] text-blue-500 mt-2">
                        Key Metrics: Improved organizational alignment, enhanced stakeholder satisfaction
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Leadership Competencies */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">Core Leadership Competencies</p>
                <div className="space-y-3">
                  {competencyAverages.slice(0, 5).map((comp, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{comp.name}</span>
                        <Badge 
                          className={comp.score >= 75 ? 'bg-green-100 text-green-700' : comp.score >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}
                        >
                          {comp.score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {comp.score >= 75 
                          ? `Strong ${comp.name.toLowerCase()} across teams`
                          : comp.score >= 60 
                          ? `Developing ${comp.name.toLowerCase()} capabilities`
                          : `Focus area for ${comp.name.toLowerCase()} improvement`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Risk Management & Selected Manager */}
        <div className="space-y-6">
          {/* Team Risk Management */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Team Risk Management</h3>
              </div>

              {atRiskMembers.length > 0 ? (
                <div className="space-y-3">
                  {atRiskMembers.map((member) => {
                    const riskLevel = getRiskLevel(member.overallScore);
                    return (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{member.full_name}</span>
                          <Badge className={riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                            {riskLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {riskLevel === 'high' 
                            ? 'Performance management scores consistently low'
                            : 'Team engagement declining, needs attention'}
                        </p>
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Decision Assistant
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Award className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No at-risk team members</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Manager Details */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {selectedMember ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedMember.full_name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{selectedMember.job_title || 'Manager'}</p>
                  {/* Add detailed view here */}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">Select a Manager</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click on any manager to see detailed insights and development recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Direct Reports Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Direct Reports</h3>
        <div className="space-y-4">
          {enrichedData.map((member) => {
            const statusBadge = getStatusBadge(member.overallScore);
            const isExpanded = expandedCards[member.id];
            
            // Simulated metrics (in real app, these would come from actual data)
            const teamEngagement = member.overallScore ? Math.min(100, member.overallScore + Math.floor(Math.random() * 15)) : null;
            const retention = member.overallScore ? Math.min(100, member.overallScore + Math.floor(Math.random() * 10)) : null;
            const productivity = member.overallScore ? Math.min(130, 80 + Math.floor(Math.random() * 50)) : null;

            const topCompetencies = [
              { name: 'Decision Making', score: member.dmScore },
              { name: 'Communication', score: member.commScore },
              { name: 'Resource Mgmt', score: member.rmScore },
              { name: 'Stakeholder Mgmt', score: member.smScore },
              { name: 'Performance Mgmt', score: member.pmScore }
            ].filter(c => c.score).sort((a, b) => b.score - a.score);

            const strengths = topCompetencies.slice(0, 2);
            const developmentAreas = topCompetencies.slice(-2).reverse();

            return (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card 
                  className={`border-0 shadow-lg cursor-pointer transition-all ${selectedMember?.id === member.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedMember(member)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                            {member.overallScore >= 85 && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                            {member.overallScore >= 70 && member.overallScore < 85 && <Award className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-sm text-gray-600">
                            {member.job_title || 'Manager'} • {member.subordinate_emails?.length || 0} reports • {member.tenure || '2y'} tenure
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                        <div className="text-right">
                          <span className="text-sm text-gray-500">SI Score: </span>
                          <span className="font-semibold">{member.siScore || '-'}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardExpand(member.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    {member.overallScore && (
                      <div className="grid grid-cols-3 gap-6 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Team Engagement</p>
                          <p className="text-lg font-bold text-gray-900">{teamEngagement}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 mb-1">Retention</p>
                          <p className="text-lg font-bold text-gray-900">{retention}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-purple-600 mb-1">Productivity</p>
                          <p className="text-lg font-bold text-gray-900">{productivity}%</p>
                        </div>
                      </div>
                    )}

                    {/* Risk Areas (if applicable) */}
                    {member.overallScore && member.overallScore < 70 && (
                      <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-800 mb-1">Risk Areas</p>
                        <p className="text-xs text-red-700">
                          {member.overallScore < 55 
                            ? 'Below-benchmark performance management, team retention concerns'
                            : 'Low team engagement trends, performance management gaps'}
                        </p>
                      </div>
                    )}

                    {/* Development Focus */}
                    {member.overallScore && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Development Focus:</p>
                        <div className="flex flex-wrap gap-2">
                          {developmentAreas.map((comp, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {comp.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && member.overallScore && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t space-y-4"
                      >
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Top Strengths:</p>
                          <div className="flex flex-wrap gap-2">
                            {strengths.map((comp, idx) => (
                              <Badge key={idx} className="bg-green-100 text-green-700 text-xs">
                                {comp.name} ({comp.score}%)
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link to={`${createPageUrl('AssessmentDetails')}?assessmentId=${member.latestAssessment?.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3 mr-1" />
                              View Full Profile
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Schedule 1:1
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Assign Action */}
      {canAssign && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Assign Assessments</h3>
                <p className="text-sm text-gray-600">Send assessment invitations to your team members</p>
              </div>
              <Button onClick={() => setShowAssignModal(true)} className="bg-green-600 hover:bg-green-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AssignAssessmentModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={loadTeamData}
      />
    </div>
  );
}