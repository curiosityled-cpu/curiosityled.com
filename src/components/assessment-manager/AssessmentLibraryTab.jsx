import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Brain, MoreHorizontal, Send, Play, Pause, Trash2, Copy, Loader2, ClipboardList, Search, Users, FileEdit, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AssignAssessmentModal from "./AssignAssessmentModal";

const STATUS_BADGES = {
  draft: { className: "bg-gray-100 text-gray-800", label: "Draft" },
  published: { className: "bg-green-100 text-green-800", label: "Live" },
  archived: { className: "bg-slate-100 text-slate-600", label: "Archived" },
};

const VALIDATED_ASSESSMENTS = [
  {
    id: "leadership-index",
    title: "Leadership Index Assessment",
    description: "Comprehensive evaluation across 6 core competencies — Situational Intelligence, Decision Making, Communication, Resource Management, Stakeholder Management, and Performance Management.",
    duration: "20–30 min",
    type: "validated",
    route: "/LeadershipAssessment",
    icon: Brain,
    color: "#A25DDC",
  },
  {
    id: "situational-leadership",
    title: "Situational Leadership Style",
    description: "Discover your preferred leadership style and learn how to adapt your approach to different team situations and developmental stages.",
    duration: "15–20 min",
    type: "validated",
    route: null,
    icon: ClipboardList,
    color: "#0202ff",
    comingSoon: true,
  },
];

export default function AssessmentLibraryTab() {
  const [customAssessments, setCustomAssessments] = useState([]);
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState({ open: false, assessment: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customData, usersData, cohortsData] = await Promise.all([
        base44.entities.CustomAssessment.list("-created_date"),
        base44.entities.User.list(),
        base44.entities.Cohort.list(),
      ]);
      setCustomAssessments(customData || []);
      setUsers(usersData || []);
      setCohorts(cohortsData || []);
    } catch (error) {
      console.error("Error loading library data:", error);
      toast.error("Failed to load assessment library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCustom = customAssessments.filter(
    (a) =>
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (assessment, newStatus) => {
    try {
      await base44.entities.CustomAssessment.update(assessment.id, { status: newStatus });
      toast.success(`Assessment ${newStatus === "published" ? "published" : newStatus === "archived" ? "archived" : "updated"}`);
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicate = async (assessment) => {
    try {
      const { id, created_date, updated_date, created_by, ...data } = assessment;
      await base44.entities.CustomAssessment.create({ ...data, title: `${assessment.title} (Copy)`, status: "draft" });
      toast.success("Assessment duplicated");
      loadData();
    } catch (error) {
      console.error("Error duplicating:", error);
      toast.error("Failed to duplicate");
    }
  };

  const handleDelete = async (assessment) => {
    if (!confirm(`Delete "${assessment.title}"? This cannot be undone.`)) return;
    try {
      await base44.entities.CustomAssessment.delete(assessment.id);
      toast.success("Assessment deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete assessment");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search assessments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Validated Assessments */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-[#0202ff]" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Validated Assessments</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALIDATED_ASSESSMENTS.map((va) => {
            const Icon = va.icon;
            return (
              <Card key={va.id} className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${va.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: va.color }} />
                    </div>
                    {va.comingSoon ? (
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 text-xs">Available</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{va.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{va.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[11px] text-muted-foreground">{va.duration}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={va.comingSoon}
                      onClick={() => setAssignModal({ open: true, assessment: va })}
                    >
                      <Send className="w-3 h-3 mr-1" /> Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Assessments */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileEdit className="w-4 h-4 text-[#0202ff]" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Custom Assessments ({filteredCustom.length})
          </h3>
        </div>
        {filteredCustom.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No custom assessments yet. Use the Builder tab to create one.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustom.map((a) => {
              const badge = STATUS_BADGES[a.status || "draft"];
              const assigneeCount = a.assigned_user_emails?.length || 0;
              return (
                <Card key={a.id} className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{a.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAssignModal({ open: true, assessment: a })}>
                            <Send className="w-3.5 h-3.5 mr-2" /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(a)}>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {a.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(a, "published")}>
                              <Play className="w-3.5 h-3.5 mr-2" /> Publish
                            </DropdownMenuItem>
                          )}
                          {a.status === "published" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(a, "archived")}>
                              <Pause className="w-3.5 h-3.5 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          {a.status === "archived" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(a, "published")}>
                              <Play className="w-3.5 h-3.5 mr-2" /> Re-publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(a)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />{assigneeCount}
                      </Badge>
                      {a.type && <Badge variant="outline" className="text-xs capitalize">{a.type.replace(/_/g, " ")}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AssignAssessmentModal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, assessment: null })}
        assessment={assignModal.assessment}
        users={users}
        cohorts={cohorts}
        onAssigned={loadData}
      />
    </div>
  );
}