import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Brain, Clock, Edit2, Play, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import AtreusCoach from "@/components/ai/AtreusCoach";

export default function ConversationalModulesLibrary() {
  const { user, hasPermission } = useAuth();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAtreus, setShowAtreus] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  const canCreate = hasPermission("content.create");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [modulesData, progressData] = await Promise.all([
        base44.entities.ConversationalLearningModule.filter({ is_active: true }),
        base44.entities.LearnerProgress.filter({ user_email: user.email })
      ]);

      setModules(modulesData);
      setProgress(progressData);
    } catch (error) {
      console.error("Error loading modules:", error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const getProgressForModule = (moduleId) => {
    return progress.find(p => p.conversational_learning_module_id === moduleId);
  };

  const isModuleLocked = (module) => {
    if (!module.prerequisite_module_ids?.length && !module.prerequisite_resource_ids?.length) {
      return false;
    }

    const prereqModules = module.prerequisite_module_ids || [];
    const prereqResources = module.prerequisite_resource_ids || [];

    const modulesCompleted = prereqModules.every(id => {
      const prog = progress.find(p => p.conversational_learning_module_id === id);
      return prog?.status === "completed";
    });

    const resourcesCompleted = prereqResources.every(id => {
      const prog = progress.find(p => p.learning_resource_id === id);
      return prog?.status === "completed";
    });

    return !(modulesCompleted && resourcesCompleted);
  };

  const handleStartModule = (module) => {
    setSelectedModule(module);
    setShowAtreus(true);
  };

  const handleCloseAtreus = () => {
    setShowAtreus(false);
    setSelectedModule(null);
    loadData(); // Refresh progress
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conversational Learning Modules</h2>
          <p className="text-gray-600 mt-1">AI-guided learning experiences with Atreus</p>
        </div>
        {canCreate && (
          <Link to={createPageUrl("ConversationalModuleBuilder")}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Module
            </Button>
          </Link>
        )}
      </div>

      {modules.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No Modules Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Conversational learning modules will appear here
            </p>
            {canCreate && (
              <Link to={createPageUrl("ConversationalModuleBuilder")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Module
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => {
            const moduleProgress = getProgressForModule(module.id);
            const locked = isModuleLocked(module);

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${locked ? "opacity-60" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Brain className="w-8 h-8 text-purple-600" />
                      {locked && <Lock className="w-5 h-5 text-gray-400" />}
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{module.title}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{module.estimated_duration_minutes || 30} minutes</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {module.competencies?.slice(0, 2).map(comp => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                        {module.competencies?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{module.competencies.length - 2}
                          </Badge>
                        )}
                      </div>

                      {moduleProgress && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{moduleProgress.progress_percentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${moduleProgress.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {canCreate && (
                          <Link to={`${createPageUrl("ConversationalModuleBuilder")}?moduleId=${module.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        )}
                        <Button 
                          size="sm" 
                          className={`${canCreate ? 'flex-1' : 'w-full'} bg-purple-600 hover:bg-purple-700`}
                          disabled={locked}
                          onClick={() => handleStartModule(module)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {moduleProgress?.status === "completed" ? "Review" : "Start"}
                        </Button>
                      </div>

                      {locked && (
                        <p className="text-xs text-gray-500 text-center">
                          Complete prerequisites to unlock
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAtreus && selectedModule && (
          <AtreusCoach
            learningModuleMode={true}
            moduleData={selectedModule}
            onClose={handleCloseAtreus}
            onMinimize={handleCloseAtreus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}