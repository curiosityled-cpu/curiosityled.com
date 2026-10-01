import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Brain, Clock, Edit2, Play, Lock, Search, Loader2, Sparkles, CheckCircle2, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import AtreusCoach from "@/components/ai/AtreusCoach";
import ConversationalModuleBuilderDialog from "@/components/dev-manager/ConversationalModuleBuilderDialog";

export default function ConversationalModulesLibrary() {
  const { user, hasPermission } = useAuth();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAtreus, setShowAtreus] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);

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
    loadData();
  };

  const openNewModuleBuilder = () => {
    setEditingModuleId(null);
    setBuilderOpen(true);
  };

  const openEditModuleBuilder = (mod) => {
    setEditingModuleId(mod.id);
    setBuilderOpen(true);
  };

  const handleBuilderSaved = () => {
    setBuilderOpen(false);
    setEditingModuleId(null);
    loadData();
  };

  const filtered = modules.filter(m =>
    !search ||
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = progress.filter(p => p.status === "completed").length;
  const inProgressCount = progress.filter(p => p.status === "in_progress" || p.status === "started").length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Modules', value: modules.length, color: 'text-[#0202ff]', icon: BookOpen },
          { label: 'Completed', value: completedCount, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'In Progress', value: inProgressCount, color: 'text-amber-600', icon: Sparkles },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search modules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {canCreate && (
          <Button onClick={openNewModuleBuilder} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
            <Plus className="w-4 h-4 mr-1" /> Create Module
          </Button>
        )}
      </div>

      {/* Module Grid */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">{search ? "No modules match your search" : "No modules yet"}</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? "Try a different search term." : "Conversational learning modules will appear here once created."}
            </p>
            {!search && canCreate && (
              <Button onClick={openNewModuleBuilder} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs mt-4">
                <Plus className="w-4 h-4 mr-1" /> Create First Module
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((module, index) => {
            const moduleProgress = getProgressForModule(module.id);
            const locked = isModuleLocked(module);
            const isCompleted = moduleProgress?.status === "completed";

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className={`shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full flex flex-col ${locked ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 flex flex-col flex-1">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4.5 h-4.5 text-purple-600" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isCompleted && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                            Completed
                          </span>
                        )}
                        {locked && <Lock className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Title + description */}
                    <p className="font-medium text-gray-900 leading-snug line-clamp-2 mb-1">{module.title}</p>
                    {module.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{module.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {module.estimated_duration_minutes || 30} min
                      </span>
                      {module.competencies?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {module.competencies.length} competenc{module.competencies.length === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </div>

                    {/* Competency tags */}
                    {module.competencies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {module.competencies.slice(0, 3).map(comp => (
                          <span key={comp} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {comp}
                          </span>
                        ))}
                        {module.competencies.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            +{module.competencies.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress */}
                    {moduleProgress && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium text-gray-700">{moduleProgress.progress_percentage || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0202ff] rounded-full transition-all"
                            style={{ width: `${moduleProgress.progress_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      {canCreate && (
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEditModuleBuilder(module)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={`${canCreate ? 'flex-1' : 'w-full'} h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white`}
                        disabled={locked}
                        onClick={() => handleStartModule(module)}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        {isCompleted ? "Review" : moduleProgress ? "Continue" : "Start"}
                      </Button>
                    </div>

                    {locked && (
                      <p className="text-xs text-gray-400 text-center mt-2">Complete prerequisites to unlock</p>
                    )}
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

      <ConversationalModuleBuilderDialog
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingModuleId(null); }}
        moduleId={editingModuleId}
        onSaved={handleBuilderSaved}
      />
    </div>
  );
}