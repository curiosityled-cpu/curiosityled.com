import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Edit2, Trash2, Search, Filter, Power, PowerOff, Rocket,
  Users, Clock, Loader2, MessageSquare, MoreVertical, X
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import AssignConversationalModuleModal from "@/components/learning/AssignConversationalModuleModal";

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  published: { label: "Published", className: "bg-green-100 text-green-700 border-green-200" },
  archived: { label: "Archived", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function ConversationalLearningTab() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignModule, setAssignModule] = useState(null);
  const [deleteModule, setDeleteModule] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isAdmin = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"].includes(appRole);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ConversationalLearningModule.list("-created_date", 200);
      setModules(data || []);
    } catch (e) {
      console.error("Error loading modules:", e);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return modules.filter(m => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (search && !m.title?.toLowerCase().includes(search.toLowerCase()) &&
          !m.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [modules, search, statusFilter]);

  const handleToggleActive = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, { is_active: !mod.is_active });
      toast.success(mod.is_active ? "Module disabled" : "Module enabled");
      loadModules();
    } catch (e) {
      toast.error("Failed to toggle module");
    }
  };

  const handlePublish = async (mod) => {
    const newStatus = mod.status === "published" ? "draft" : "published";
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, { status: newStatus });
      toast.success(newStatus === "published" ? "Module published — learners can now access it" : "Module unpublished");
      loadModules();
    } catch (e) {
      toast.error("Failed to change status");
    }
  };

  const handleDelete = async () => {
    if (!deleteModule) return;
    setDeleting(true);
    try {
      await base44.entities.ConversationalLearningModule.delete(deleteModule.id);
      toast.success("Module deleted");
      setDeleteModule(null);
      loadModules();
    } catch (e) {
      toast.error("Failed to delete module");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conversational Learning Modules</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create, publish, and assign AI-guided learning flows aligned to your competency library
          </p>
        </div>
        {isAdmin && (
          <Link to={createPageUrl("ConversationalModuleBuilder")}>
            <Button className="bg-[#0202ff] hover:bg-[#0202ff]/90">
              <Plus className="w-4 h-4 mr-2" /> Create Module
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          {["all", "draft", "published", "archived"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-[#0202ff] text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Module grid */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No modules found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {modules.length === 0 ? "Create your first conversational learning module to get started." : "Try adjusting your filters."}
            </p>
            {isAdmin && modules.length === 0 && (
              <Link to={createPageUrl("ConversationalModuleBuilder")}>
                <Button className="bg-[#0202ff] hover:bg-[#0202ff]/90">
                  <Plus className="w-4 h-4 mr-2" /> Create First Module
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`shadow-sm border transition-all hover:shadow-md ${!mod.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_CONFIG[mod.status]?.className || "bg-gray-100 text-gray-700"}>
                          {STATUS_CONFIG[mod.status]?.label || mod.status}
                        </Badge>
                        {!mod.is_active && (
                          <Badge variant="outline" className="text-xs text-gray-500">Disabled</Badge>
                        )}
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl("ConversationalModuleBuilder")}?moduleId=${mod.id}`}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePublish(mod)}>
                              <Rocket className="w-3.5 h-3.5 mr-2" />
                              {mod.status === "published" ? "Unpublish" : "Publish"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(mod)}>
                              {mod.is_active ? (
                                <><PowerOff className="w-3.5 h-3.5 mr-2" /> Disable</>
                              ) : (
                                <><Power className="w-3.5 h-3.5 mr-2" /> Enable</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssignModule(mod)}>
                              <Users className="w-3.5 h-3.5 mr-2" /> Assign to Team
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteModule(mod)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{mod.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{mod.description}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {mod.estimated_duration_minutes || 30} min
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {mod.conversation_structure?.length || 0} steps
                      </span>
                    </div>

                    {mod.competencies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {mod.competencies.slice(0, 3).map(c => (
                          <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {mod.competencies.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{mod.competencies.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link to={`${createPageUrl("ConversationalModule")}?moduleId=${mod.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                          Preview
                        </Button>
                      </Link>
                      {isAdmin && mod.status === "published" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#0202ff] hover:bg-[#0202ff]/90"
                          onClick={() => setAssignModule(mod)}
                        >
                          <Users className="w-3 h-3 mr-1" /> Assign
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Assignment modal */}
      <AssignConversationalModuleModal
        open={!!assignModule}
        onClose={() => setAssignModule(null)}
        onSuccess={loadModules}
        moduleData={assignModule}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteModule} onOpenChange={(o) => !o && setDeleteModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteModule?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module and cannot be undone. Learner progress records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}