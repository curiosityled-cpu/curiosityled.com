import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function PointValueManager() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityPoints, setActivityPoints] = useState({
    learning_resource: 50,
    assessment: 100,
    goal: 200,
    coaching_session: 150,
    certification: 500,
    program_completion: 1000,
    journey_completion: 300,
    class_attendance: 75,
    onboarding_milestone: 100
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const allSettings = await base44.entities.GamificationSettings.filter({
        client_id: user.client_id
      });
      
      if (allSettings.length > 0) {
        const s = allSettings[0];
        setSettings(s);
        if (s.default_activity_points) {
          setActivityPoints({ ...activityPoints, ...s.default_activity_points });
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.functions.invoke('updateGamificationSettings', {
        default_activity_points: activityPoints
      });
      toast.success("Point values updated successfully");
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleReset = () => {
    setActivityPoints({
      learning_resource: 50,
      assessment: 100,
      goal: 200,
      coaching_session: 150,
      certification: 500,
      program_completion: 1000,
      journey_completion: 300,
      class_attendance: 75,
      onboarding_milestone: 100
    });
  };

  const updateValue = (key, value) => {
    setActivityPoints({ ...activityPoints, [key]: parseInt(value) || 0 });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const activities = [
    { key: 'learning_resource', label: 'Learning Resource Completion', description: 'When a user completes a learning resource' },
    { key: 'assessment', label: 'Assessment Completion', description: 'When a user completes an assessment' },
    { key: 'goal', label: 'Goal Achievement', description: 'When a user completes a goal' },
    { key: 'coaching_session', label: 'Coaching Session Attendance', description: 'When a user attends a coaching session' },
    { key: 'certification', label: 'Certification Earned', description: 'When a user earns an external certification' },
    { key: 'program_completion', label: 'Program Completion', description: 'When a user completes a full program' },
    { key: 'journey_completion', label: 'Journey Completion', description: 'When a user completes a learning journey' },
    { key: 'class_attendance', label: 'Class Attendance', description: 'When a user attends a class' },
    { key: 'onboarding_milestone', label: 'Onboarding Milestone', description: 'When a user completes an onboarding milestone' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Point Value Configuration
        </CardTitle>
        <CardDescription>Set default point values for various activities across your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.key}>
                  <TableCell className="font-medium">{activity.label}</TableCell>
                  <TableCell className="text-sm text-gray-600">{activity.description}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={activityPoints[activity.key]}
                      onChange={(e) => updateValue(activity.key, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These are default values. You can override them for specific programs, journeys, or resources 
            by setting a custom <code>points_value</code> field on individual items.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}