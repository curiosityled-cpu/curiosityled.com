import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, PlayCircle } from "lucide-react";
import { toast } from "sonner";

export default function PrivacyTrainingTracker({ user, isCompleted, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [moduleProgress, setModuleProgress] = useState({
    introduction: true,
    dataProtection: false,
    phiRules: false,
    userRights: false,
    incidentResponse: false
  });

  const modules = [
    { 
      key: "introduction", 
      title: "Introduction to Privacy", 
      duration: "5 min",
      description: "Overview of privacy principles and regulations"
    },
    { 
      key: "dataProtection", 
      title: "Data Protection Basics", 
      duration: "10 min",
      description: "How we protect your information"
    },
    { 
      key: "phiRules", 
      title: "PHI & Healthcare Data", 
      duration: "15 min",
      description: "Critical rules for healthcare organizations"
    },
    { 
      key: "userRights", 
      title: "Your Privacy Rights", 
      duration: "7 min",
      description: "Understanding your rights and controls"
    },
    { 
      key: "incidentResponse", 
      title: "Incident Reporting", 
      duration: "8 min",
      description: "What to do if you suspect a breach"
    }
  ];

  const completedCount = Object.values(moduleProgress).filter(Boolean).length;
  const progressPercentage = (completedCount / modules.length) * 100;

  const handleStartModule = (moduleKey) => {
    // In a real implementation, this would open the training module
    toast.info("Training module would open here");
    
    // Simulate completion
    setTimeout(() => {
      setModuleProgress({ ...moduleProgress, [moduleKey]: true });
      toast.success("Module completed!");
      
      // Check if all modules are done
      const allComplete = Object.values({ ...moduleProgress, [moduleKey]: true }).every(Boolean);
      if (allComplete) {
        completeTraining();
      }
    }, 2000);
  };

  const completeTraining = async () => {
    try {
      setLoading(true);
      
      await base44.auth.updateMe({
        privacy_training_completed: true,
        privacy_training_completed_date: new Date().toISOString()
      });

      await base44.entities.ActivityLog.create({
        timestamp: new Date().toISOString(),
        initiator_user_email: user.email,
        action_type: "PRIVACY_TRAINING_COMPLETED",
        metadata: {
          completion_date: new Date().toISOString()
        }
      });

      toast.success("Privacy training completed!");
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error completing training:", error);
      toast.error("Failed to save training completion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Privacy Training Progress
          </CardTitle>
          <CardDescription>
            Complete all modules to meet compliance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold">{completedCount} of {modules.length} modules</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {isCompleted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Training completed! You meet compliance requirements.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Modules */}
      <div className="space-y-3">
        {modules.map((module) => {
          const completed = moduleProgress[module.key];
          return (
            <Card key={module.key} className={completed ? "bg-green-50 border-green-200" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      completed ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      {completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{module.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {module.duration}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>
                  </div>
                  {!completed && (
                    <Button
                      size="sm"
                      onClick={() => handleStartModule(module.key)}
                      className="bg-[#0202ff] hover:bg-[#0101dd]"
                    >
                      Start
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Privacy training is required for all users, especially those in 
            healthcare organizations. Completion is tracked and may be required for continued platform access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}