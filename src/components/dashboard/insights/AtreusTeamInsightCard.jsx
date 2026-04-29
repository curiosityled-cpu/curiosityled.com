import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, AlertCircle, TrendingDown, Zap } from 'lucide-react';
import { motion } from "framer-motion";
import { useAtreusChat } from '@/components/ai/AtreusContext';
import { base44 } from '@/api/base44Client';

/**
 * AtreusTeamInsightCard — Team/organizational intelligence for team leaders, analysts, and HR admins.
 * Generates 1-2 role-specific insights based on team data, then opens Atreus with coaching context.
 */
export default function AtreusTeamInsightCard({ user, appRole, teamData = {} }) {
  const { openWithContext } = useAtreusChat();
  const [insight, setInsight] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const prompt = buildTeamAnalysisPrompt(appRole, teamData, user);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            insight: { type: 'string' },
            category: { type: 'string', enum: ['risk', 'performance_gap', 'development_opportunity'] },
            recommended_action: { type: 'string' },
            metrics_summary: { type: 'object', additionalProperties: true }
          }
        }
      });
      if (result?.title && result?.insight) {
        setInsight(result);
      }
    } catch (error) {
      console.error('Error generating team insight:', error);
    } finally {
      setGenerating(false);
    }
  };

  const buildTeamAnalysisPrompt = (role, data, user) => `
You are a leadership intelligence expert analyzing team data.
User Role: ${role}
Current User: ${user?.full_name || 'Unknown'}

Team Data Summary:
- Team Members: ${data.team_members_count || 0}
- At-Risk Team Members: ${data.at_risk_count || 0}
- Goals In Progress: ${data.active_goals_count || 0}
- Goals At Risk: ${data.at_risk_goals_count || 0}
- Learning Assignments Overdue: ${data.overdue_learning || 0}
- Average Assessment Score: ${data.avg_assessment_score || 'N/A'}%
- Team Development Plans: ${data.dev_plans_count || 0}

Recent Issues:
${data.recent_issues ? data.recent_issues.map(i => `- ${i}`).join('\n') : '- None noted'}

Generate ONE specific, actionable insight. Rules:
1. Be specific, not generic (reference actual numbers/patterns from data)
2. Focus on 1-2 high-impact issues only
3. Categorize as: risk, performance_gap, or development_opportunity
4. Recommended action must be specific and executable

${role === 'Admin Level 2' || role === 'HR Administrator' ? `
Context: You are advising the HR Administrator on organizational trends.
Focus on systemic issues across teams: attrition risk, skill gaps, development velocity.
Identify patterns that affect multiple teams or the org overall.` : role === 'Analyst' ? `
Context: You are advising a data analyst who focuses on patterns and anomalies.
Look for correlations, statistical anomalies, or data-driven signals.
Be precise about what the metrics indicate and what's unusual.` : `
Context: You are advising a team leader responsible for specific managers/teams.
Focus on execution gaps and individual team member risks.
Highlight who needs attention and why.`}
`;

  // Generate insight on mount
  useEffect(() => {
    if (teamData && Object.keys(teamData).length > 0 && !generating) {
      generateInsight();
    }
  }, [appRole, user?.email, teamData]);

  // Role check — return early if not eligible
  const allowedRoles = ['HR Administrator', 'Admin Level 2', 'Analyst', 'Team Leader', 'User Level 2'];
  if (!allowedRoles.includes(appRole) || dismissed || !insight) {
    return null;
  }

  const handleReviewTeam = () => {
    const contextPayload = {
      source: 'team_intelligence',
      role: appRole,
      team_data: teamData,
      identified_issue: {
        title: insight.title,
        insight: insight.insight,
        category: insight.category,
        recommended_action: insight.recommended_action,
      },
      metrics: insight.metrics_summary || {}
    };
    openWithContext({
      context: contextPayload,
      starterMessage: `Walk me through what's happening with my team and what I should do about "${insight.title}".`
    });
  };

  const categoryConfig = {
    risk: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-l-4 border-l-red-600',
      labelColor: 'bg-red-100 text-red-700'
    },
    performance_gap: {
      icon: TrendingDown,
      bgColor: 'bg-amber-50',
      borderColor: 'border-l-4 border-l-amber-600',
      labelColor: 'bg-amber-100 text-amber-700'
    },
    development_opportunity: {
      icon: Zap,
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-4 border-l-blue-600',
      labelColor: 'bg-blue-100 text-blue-700'
    }
  };

  const config = categoryConfig[insight.category] || categoryConfig.development_opportunity;
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className={`${config.borderColor} ${config.bgColor} shadow-md hover:shadow-lg transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <Sparkles className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-1">
                    {insight.title}
                  </h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${config.labelColor}`}>
                    {insight.category.replace('_', ' ')}
                  </span>
                </div>
                <IconComponent className="w-5 h-5 text-gray-500 flex-shrink-0" />
              </div>

              <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                {insight.insight}
              </p>

              <div className="bg-white/60 rounded-lg p-3 mb-4 border border-gray-200/50">
                <p className="text-xs font-semibold text-gray-600 mb-1">Recommended Action</p>
                <p className="text-sm text-gray-700">
                  {insight.recommended_action}
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleReviewTeam}
                  className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
                >
                  Review Team <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setDismissed(true)}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Ignore
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}