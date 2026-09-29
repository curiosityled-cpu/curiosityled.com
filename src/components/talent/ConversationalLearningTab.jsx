import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Edit2, Trash2, Search, Power, PowerOff, Rocket, Archive, RotateCcw,
  Users, Clock, Loader2, MessageSquare, MoreVertical, CheckCircle, XCircle,
  Send, GitBranch, FileText, History, Eye
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import AssignConversationalModuleModal from "@/components/learning/AssignConversationalModuleModal";

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  published: { label: "Live", className: "bg-green-100 text-green-700 border-green-200", icon: Rocket },
  disabled: { label: "Disabled", className: "bg-red-100 text-red-700 border-red-200", icon: PowerOff },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-200", icon: Archive },
};

const APPROVER_ROLES = ["Admin Level 2", "Super Administrator", "Platform Admin"];
const ADMIN_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"];

export default function ConversationalLearningTab() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignModule, setAssignModule] = useState(null);
  const [deleteModule, setDeleteModule] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectModule, setRejectModule] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [historyModuleKey, setHistoryModuleKey] = useState(null);
  const [allVersions, setAllVersions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const canApprove = APPROVER_ROLES.includes(appRole);
  const isAdmin = ADMIN_ROLES.includes(appRole);

  useEffect(() => { loadModules(); }, []);

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

  // Group modules by module_key, showing only current versions by default
  const groupedModules = useMemo(() => {
    const filtered = modules.filter(m => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (search && !m.title?.toLowerCase().includes(search.toLowerCase()) &&
          !m.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    // Group by module_key (or by id if no key)
    const groups = {};
    filtered.forEach(m => {
      const key = m.module_key || m.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // For each group, sort by version_number desc and pick the current/top
    return Object.entries(groups).map(([key, versions]) => {
      const sorted = versions.sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
      const current = sorted.find(v => v.is_current_version) || sorted[0];
      return { key, current, allVersions: sorted, versionCount: sorted.length };
    });
  }, [modules, search, statusFilter]);

  const stats = useMemo(() => ({
    total: modules.length,
    draft: modules.filter(m => m.status === "draft").length,
    awaiting: modules.filter(m => m.status === "awaiting_approval").length,
    live: modules.filter(m => m.status === "published").length,
    disabled: modules.filter(m => m.status === "disabled").length,
    archived: modules.filter(m => m.status === "archived").length,
  }), [modules]);

  const handleSubmitForApproval = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, {
        status: "awaiting_approval",
        submitted_for_approval_at: new Date().toISOString(),
        submitted_for_approval_by: user.email,
      });
      toast.success("Submitted for approval");
      loadModules();
    } catch (e) { toast.error("Failed to submit"); }
  };

  const handleApprove = async (mod) => {
    try {
      // If there's a previously published version, mark it as not current and archive it
      if (mod.module_key) {
        const siblings = modules.filter(m =>
          m.module_key === mod.module_key &&
          m.id !== mod.id &&
          m.status === "published"
        );
        for (const s of siblings) {
          await base44.entities.ConversationalLearningModule.update(s.id, {
            is_current_version: false,
            status: "archived",
          });
        }
      }
      await base44.entities.ConversationalLearningModule.update(mod.id, {
        status: "published",
        is_current_version: true,
        published_at: new Date().toISOString(),
        published_by: user.email,
        approved_at: new Date().toISOString(),
        approved_by: user.email,
        rejection_reason: null,
      });
      toast.success("Module approved and published — now live");
      loadModules();
    } catch (e) { toast.error("Failed to approve"); }
  };

  const handleReject = async () => {
    if (!rejectModule) return;
    setRejecting(true);
    try {
      await base44.entities.ConversationalLearningModule.update(rejectModule.id, {
        status: "draft",
        rejection_reason: rejectReason || "Sent back for revision",
      });
      toast.success("Module sent back to draft");
      setRejectModule(null);
      setRejectReason("");
      loadModules();
    } catch (e) { toast.error("Failed to reject"); }
    finally { setRejecting(false); }
  };

  const handleDisable = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, { status: "disabled" });
      toast.success("Module disabled");
      loadModules();
    } catch (e) { toast.error("Failed to disable"); }
  };

  const handleEnable = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, { status: "published" });
      toast.success("Module re-enabled — now live");
      loadModules();
    } catch (e) { toast.error("Failed to enable"); }
  };

  const handleArchive = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, {
        status: "archived",
        is_current_version: false,
      });
      toast.success("Module archived");
      loadModules();
    } catch (e) { toast.error("Failed to archive"); }
  };

  const handleRestore = async (mod) => {
    try {
      await base44.entities.ConversationalLearningModule.update(mod.id, { status: "draft" });
      toast.success("Module restored to draft");
      loadModules();
    } catch (e) { toast.error("Failed to restore"); }
  };

  const handleDelete = async () => {
    if (!deleteModule) return;
    setDeleting(true);
    try {
      await base44.entities.ConversationalLearningModule.delete(deleteModule.id);
      toast.success("Module deleted");
      setDeleteModule(null);
      loadModules();
    } catch (e) { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const handleCreateNewVersion = async (mod) => {
    try {
      // Ensure the original has a module_key
      let key = mod.module_key;
      if (!key) {
        key = `clm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await base44.entities.ConversationalLearningModule.update(mod.id, { module_key: key });
      }
      // Create new draft version
      const newVersion = await base44.entities.ConversationalLearningModule.create({
        title: mod.title,
        description: mod.description,
        competencies: mod.competencies || [],
        leadership_level: mod.leadership_level,
        estimated_duration_minutes: mod.estimated_duration_minutes,
        conversation_structure: mod.conversation_structure || [],
        prerequisite_resource_ids: mod.prerequisite_resource_ids || [],
        prerequisite_module_ids: mod.prerequisite_module_ids || [],
        related_resource_ids: mod.related_resource_ids || [],
        thumbnail_url: mod.thumbnail_url,
        points_value: mod.points_value,
        workout_type: mod.workout_type,
        client_id: mod.client_id,
        status: "draft",
        module_key: key,
        version_number: (mod.version_number || 1) + 1,
        is_current_version: false,
        version_notes: "",
      });
      toast.success(`Created draft v${newVersion.version_number} — redirecting to builder`);
      window.location.href = `${createPageUrl("ConversationalModuleBuilder")}?moduleId=${newVersion.id}`;
    } catch (e) {
      console.error("Error creating new version:", e);
      toast.error("Failed to create new version");
    }
  };

  const handleViewHistory = async (moduleKey) => {
    setHistoryModuleKey(moduleKey);
    setLoadingHistory(true);
    try {
      const versions = await base44.entities.ConversationalLearningModule.filter(
        { module_key: moduleKey },
        "-version_number"
      );
      setAllVersions(versions || []);
    } catch (e) {
      toast.error("Failed to load version history");
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Draft", value: stats.draft, color: "text-gray-600" },
          { label: "Awaiting", value: stats.awaiting, color: "text-amber-600" },
          { label: "Live", value: stats.live, color: "text-green-600" },
          { label: "Disabled", value: stats.disabled, color: "text-red-600" },
          { label: "Archived", value: stats.archived, color: "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50 border border-gray-100">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search modules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {["all", "draft", "awaiting_approval", "published", "disabled", "archived"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s ? "bg-[#0202ff] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}>
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
        {isAdmin && (
          <Link to={createPageUrl("ConversationalModuleBuilder")}>
            <Button className="bg-[#0202ff] hover:bg-[#0202ff]/90 h-9 text-xs">
              <Plus className="w-4 h-4 mr-1" /> Create Module
            </Button>
          </Link>
        )}
      </div>

      {/* Module grid */}
      {groupedModules.length === 0 ? (
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
            {groupedModules.map(({ key, current, versionCount }, i) => {
              const StatusIcon = STATUS_CONFIG[current.status]?.icon || FileText;
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={`shadow-sm border transition-all hover:shadow-md ${current.status === "disabled" || current.status === "archived" ? "opacity-70" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={STATUS_CONFIG[current.status]?.className}>
                            <StatusIcon className="w-3 h-3 mr-1" /> {STATUS_CONFIG[current.status]?.label}
                          </Badge>
                          {versionCount > 1 && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              <GitBranch className="w-3 h-3 mr-1" />v{current.version_number || 1}
                            </Badge>
                          )}
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`${createPageUrl("ConversationalModuleBuilder")}?moduleId=${current.id}`}>
                                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              {current.status === "draft" && (
                                <DropdownMenuItem onClick={() => handleSubmitForApproval(current)}>
                                  <Send className="w-3.5 h-3.5 mr-2" /> Submit for Approval
                                </DropdownMenuItem>
                              )}
                              {current.status === "awaiting_approval" && canApprove && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(current)}>
                                    <CheckCircle className="w-3.5 h-3.5 mr-2" /> Approve & Publish
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setRejectModule(current); setRejectReason(""); }}>
                                    <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {current.status === "published" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleCreateNewVersion(current)}>
                                    <GitBranch className="w-3.5 h-3.5 mr-2" /> Create New Version
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDisable(current)}>
                                    <PowerOff className="w-3.5 h-3.5 mr-2" /> Disable
                                  </DropdownMenuItem>
                                </>
                              )}
                              {current.status === "disabled" && (
                                <DropdownMenuItem onClick={() => handleEnable(current)}>
                                  <Power className="w-3.5 h-3.5 mr-2" /> Enable
                                </DropdownMenuItem>
                              )}
                              {current.status !== "archived" && (
                                <DropdownMenuItem onClick={() => handleArchive(current)}>
                                  <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                                </DropdownMenuItem>
                              )}
                              {current.status === "archived" && (
                                <DropdownMenuItem onClick={() => handleRestore(current)}>
                                  <RotateCcw className="w-3.5 h-3.5 mr-2" /> Restore to Draft
                                </DropdownMenuItem>
                              )}
                              {current.status === "published" && (
                                <DropdownMenuItem onClick={() => setAssignModule(current)}>
                                  <Users className="w-3.5 h-3.5 mr-2" /> Assign to Team
                                </DropdownMenuItem>
                              )}
                              {versionCount > 1 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleViewHistory(current.module_key)}>
                                    <History className="w-3.5 h-3.5 mr-2" /> Version History ({versionCount})
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteModule(current)} className="text-red-600">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{current.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{current.description}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {current.estimated_duration_minutes || 30} min</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {current.conversation_structure?.length || 0} steps</span>
                        {current.published_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" /> {new Date(current.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {current.competencies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {current.competencies.slice(0, 3).map(c => (
                            <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">{c}</Badge>
                          ))}
                          {current.competencies.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{current.competencies.length - 3}</Badge>
                          )}
                        </div>
                      )}

                      {current.rejection_reason && current.status === "draft" && (
                        <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3 line-clamp-2">
                          <XCircle className="w-3 h-3 inline mr-1" />{current.rejection_reason}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link to={`${createPageUrl("ConversationalModule")}?moduleId=${current.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                        </Link>
                        {isAdmin && current.status === "published" && (
                          <Button size="sm" className="h-8 text-xs bg-[#0202ff] hover:bg-[#0202ff]/90" onClick={() => setAssignModule(current)}>
                            <Users className="w-3 h-3 mr-1" /> Assign
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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
      <AlertDialog open={!!deleteModule} onOpenChange={o => !o && setDeleteModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteModule?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this version. Other versions and learner progress records are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectModule} onOpenChange={o => { if (!o) { setRejectModule(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject "{rejectModule?.title}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">The module will be sent back to draft. Provide a reason for the author:</p>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="What needs to be revised before this can go live?"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectModule(null); setRejectReason(""); }}>Cancel</Button>
            <Button onClick={handleReject} disabled={rejecting} className="bg-red-600 hover:bg-red-700">
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Back to Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history modal */}
      <Dialog open={!!historyModuleKey} onOpenChange={o => { if (!o) { setHistoryModuleKey(null); setAllVersions([]); } }}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#0202ff]" /> Version History
            </DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
          ) : (
            <div className="space-y-2">
              {allVersions.map(v => {
                const StatusIcon = STATUS_CONFIG[v.status]?.icon || FileText;
                return (
                  <div key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border ${v.is_current_version ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                      v{v.version_number || 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_CONFIG[v.status]?.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />{STATUS_CONFIG[v.status]?.label}
                        </Badge>
                        {v.is_current_version && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Current</Badge>}
                      </div>
                      {v.version_notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{v.version_notes}</p>}
                      {v.published_at && <p className="text-[10px] text-gray-400 mt-0.5">Published {new Date(v.published_at).toLocaleDateString()} by {v.published_by}</p>}
                    </div>
                    <Link to={`${createPageUrl("ConversationalModuleBuilder")}?moduleId=${v.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                    </Link>
                  </div>
                );
              })}
              {allVersions.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No version history available</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}