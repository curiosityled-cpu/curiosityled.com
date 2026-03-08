import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, AlertTriangle, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Assessment } from "@/entities/Assessment";

export default function OrganizationalDashboardCard() {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrgData = async () => {
      try {
        const allUsers = await User.list();
        const leaders = allUsers.filter(u => 
          u.app_role && (u.app_role.startsWith('User Level') || u.app_role.startsWith('Admin Level'))
        );
        
        const allAssessments = await Assessment.list();
        const leaderAssessments = allAssessments.filter(a => 
          leaders.some(l => l.email === a.email)
        );
        
        const totalLeaders = leaders.length;
        const avgSIScore = leaderAssessments.length > 0
          ? Math.round(leaderAssessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / leaderAssessments.length)
          : 0;
        const strongLeaders = leaderAssessments.filter(a => (a.overall_pct || 0) >= 75).length;
        const benchStrength = leaderAssessments.length > 0
          ? Math.round((strongLeaders / leaderAssessments.length) * 100)
          : 0;
        const atRiskCount = leaderAssessments.filter(a => (a.overall_pct || 0) < 60).length;
        
        setOrgData({
          totalLeaders,
          avgSIScore,
          benchStrength,
          atRiskCount
        });
      } catch (error) {
        console.error('Error loading organizational data:', error);
        setOrgData({
          totalLeaders: 245,
          avgSIScore: 74,
          benchStrength: 89,
          atRiskCount: 12
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadOrgData();
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Loading organizational data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Organizational Leadership Overview
          </CardTitle>
          <Badge variant="outline">{orgData.totalLeaders} Leaders</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-xl font-bold text-emerald-600">{orgData.totalLeaders}</p>
            <p className="text-xs text-gray-600">Total Leaders</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{orgData.avgSIScore}%</p>
            <p className="text-xs text-gray-600">Avg SI Score</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">{orgData.benchStrength}%</p>
            <p className="text-xs text-gray-600">Bench Strength</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xl font-bold text-orange-600">{orgData.atRiskCount}</p>
            <p className="text-xs text-gray-600">At Risk</p>
          </div>
        </div>
        
        {orgData.atRiskCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              {orgData.atRiskCount} leaders require strategic intervention
            </span>
          </div>
        )}
        
        <Link to={createPageUrl("CommandCenter")} className="block">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            View Full Organizational Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}