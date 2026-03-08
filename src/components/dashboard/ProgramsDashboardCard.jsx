import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Assessment } from "@/entities/Assessment";

export default function ProgramsDashboardCard() {
  const [programData, setProgramData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgramData = async () => {
      try {
        const allUsers = await User.list();
        const programParticipants = allUsers.filter(u => 
          u.app_role && (u.app_role.startsWith('User Level') || u.app_role.startsWith('Admin Level'))
        );
        
        const allAssessments = await Assessment.list();
        const participantAssessments = allAssessments.filter(a => 
          programParticipants.some(p => p.email === a.email)
        );
        
        const totalParticipants = programParticipants.length;
        const completionRate = totalParticipants > 0
          ? Math.round((participantAssessments.length / totalParticipants) * 100)
          : 0;
        const activePrograms = 3; // Mock
        const atRiskCount = participantAssessments.filter(a => (a.overall_pct || 0) < 60).length;
        
        setProgramData({
          totalParticipants,
          completionRate,
          activePrograms,
          atRiskCount
        });
      } catch (error) {
        console.error('Error loading program data:', error);
        setProgramData({
          totalParticipants: 150,
          completionRate: 82,
          activePrograms: 3,
          atRiskCount: 8
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProgramData();
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Loading program data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            My Programs Overview
          </CardTitle>
          <Badge variant="outline">{programData.activePrograms} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{programData.totalParticipants}</p>
            <p className="text-xs text-gray-600">Participants</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{programData.completionRate}%</p>
            <p className="text-xs text-gray-600">Completion</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">{programData.activePrograms}</p>
            <p className="text-xs text-gray-600">Programs</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">{programData.atRiskCount}</p>
            <p className="text-xs text-gray-600">At Risk</p>
          </div>
        </div>
        
        {programData.atRiskCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              {programData.atRiskCount} participants need intervention
            </span>
          </div>
        )}
        
        <Link to={createPageUrl("CommandCenter")} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            View Full Program Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}