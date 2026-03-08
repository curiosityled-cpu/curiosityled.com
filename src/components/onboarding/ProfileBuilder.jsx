import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User, Building2, Target, FolderOpen, Users, GripVertical, Save, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProfileBuilder({ onComplete }) {
  const [profile, setProfile] = useState({
    company: "",
    newHireRole: "",
    newHireName: "",
    managerName: "",
    managerTitle: "",
    org_priorities_qtr: [],
    project_notes: [],
    direct_reports: []
  });

  const [newPriority, setNewPriority] = useState({ title: "", description: "" });
  const [newProject, setNewProject] = useState({ project: "", notes: "" });
  const [newReport, setNewReport] = useState({ name: "", tenure_years: "", strengths: [], risks: [] });
  const [showPriorityForm, setShowPriorityForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  const addPriority = () => {
    if (newPriority.title.trim()) {
      if (editingPriority !== null) {
        // Update existing priority
        setProfile(prev => ({
          ...prev,
          org_priorities_qtr: prev.org_priorities_qtr.map((item, index) =>
            index === editingPriority ? { ...newPriority } : item
          )
        }));
        setEditingPriority(null);
      } else {
        // Add new priority
        setProfile(prev => ({
          ...prev,
          org_priorities_qtr: [...prev.org_priorities_qtr, { ...newPriority }]
        }));
      }
      setNewPriority({ title: "", description: "" });
      setShowPriorityForm(false);
    }
  };

  const editPriority = (index) => {
    setNewPriority(profile.org_priorities_qtr[index]);
    setEditingPriority(index);
    setShowPriorityForm(true);
  };

  const removePriority = (index) => {
    setProfile(prev => ({
      ...prev,
      org_priorities_qtr: prev.org_priorities_qtr.filter((_, i) => i !== index)
    }));
  };

  const addProject = () => {
    if (newProject.project.trim()) {
      if (editingProject !== null) {
        // Update existing project
        setProfile(prev => ({
          ...prev,
          project_notes: prev.project_notes.map((item, index) =>
            index === editingProject ? { ...newProject } : item
          )
        }));
        setEditingProject(null);
      } else {
        // Add new project
        setProfile(prev => ({
          ...prev,
          project_notes: [...prev.project_notes, { ...newProject }]
        }));
      }
      setNewProject({ project: "", notes: "" });
      setShowProjectForm(false);
    }
  };

  const editProject = (index) => {
    setNewProject(profile.project_notes[index]);
    setEditingProject(index);
    setShowProjectForm(true);
  };

  const removeProject = (index) => {
    setProfile(prev => ({
      ...prev,
      project_notes: prev.project_notes.filter((_, i) => i !== index)
    }));
  };

  const addReport = () => {
    if (newReport.name.trim()) {
      if (editingReport !== null) {
        // Update existing report
        setProfile(prev => ({
          ...prev,
          direct_reports: prev.direct_reports.map((item, index) =>
            index === editingReport ? { ...newReport } : item
          )
        }));
        setEditingReport(null);
      } else {
        // Add new report
        setProfile(prev => ({
          ...prev,
          direct_reports: [...prev.direct_reports, { ...newReport }]
        }));
      }
      setNewReport({ name: "", tenure_years: "", strengths: [], risks: [] });
      setShowReportForm(false);
    }
  };

  const editReport = (index) => {
    setNewReport(profile.direct_reports[index]);
    setEditingReport(index);
    setShowReportForm(true);
  };

  const removeReport = (index) => {
    setProfile(prev => ({
      ...prev,
      direct_reports: prev.direct_reports.filter((_, i) => i !== index)
    }));
  };

  const addSkill = (type, skill) => {
    if (skill.trim()) {
      setNewReport(prev => ({
        ...prev,
        [type]: [...prev[type], skill.trim()]
      }));
    }
  };

  const removeSkill = (type, index) => {
    setNewReport(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (profile.company && profile.newHireRole && profile.newHireName) {
      // Transform to match expected format
      const transformedProfile = {
        company: profile.company,
        role: profile.newHireRole,
        newHireRole: profile.newHireRole,
        new_hire_name: profile.newHireName,
        manager: profile.managerTitle || "Hiring Manager",
        managerTitle: profile.managerTitle,
        uploaded_by_boss: true,
        org_priorities_qtr: profile.org_priorities_qtr.map(p => typeof p === 'string' ? p : p.title),
        project_notes: profile.project_notes,
        direct_reports: profile.direct_reports
      };
      onComplete(transformedProfile);
    }
  };

  const cancelForm = (formType) => {
    switch(formType) {
      case 'priority':
        setShowPriorityForm(false);
        setNewPriority({ title: "", description: "" });
        setEditingPriority(null);
        break;
      case 'project':
        setShowProjectForm(false);
        setNewProject({ project: "", notes: "" });
        setEditingProject(null);
        break;
      case 'report':
        setShowReportForm(false);
        setNewReport({ name: "", tenure_years: "", strengths: [], risks: [] });
        setEditingReport(null);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={() => window.history.back()}
            variant="ghost" 
            className="text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Your First 90 Days
          </Button>
          <span className="text-gray-300">|</span>
          <Link to={createPageUrl("Home")} className="text-gray-500 hover:text-gray-700">
            All Journeys
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Badge className="mb-4 bg-emerald-100 text-emerald-800">
            Manager Profile Builder
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Set Up Your New Hire's Context
          </h1>
          <p className="text-xl text-gray-600">
            As the hiring manager, provide context about the role, priorities, and team to help our AI create a personalized 90-day plan.
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Basic Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profile.company}
                      onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g., Acme Corp"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newHireName">New Hire Name</Label>
                    <Input
                      id="newHireName"
                      value={profile.newHireName}
                      onChange={(e) => setProfile(prev => ({ ...prev, newHireName: e.target.value }))}
                      placeholder="e.g., Sarah Johnson"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newHireRole">New Hire Role</Label>
                    <Input
                      id="newHireRole"
                      value={profile.newHireRole}
                      onChange={(e) => setProfile(prev => ({ ...prev, newHireRole: e.target.value }))}
                      placeholder="e.g., Senior Product Manager"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="managerName">Your Name (Manager)</Label>
                    <Input
                      id="managerName"
                      value={profile.managerName}
                      onChange={(e) => setProfile(prev => ({ ...prev, managerName: e.target.value }))}
                      placeholder="e.g., Michael Chen"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="managerTitle">Your Title</Label>
                    <Input
                      id="managerTitle"
                      value={profile.managerTitle}
                      onChange={(e) => setProfile(prev => ({ ...prev, managerTitle: e.target.value }))}
                      placeholder="e.g., VP of Product"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quarter Priorities Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Quarter Priorities
                  </CardTitle>
                  <Button
                    onClick={() => setShowPriorityForm(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Priority
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {profile.org_priorities_qtr.map((priority, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group p-4 bg-purple-50 border border-purple-200 rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                              <h4 className="font-semibold text-purple-900">
                                {typeof priority === 'string' ? priority : priority.title}
                              </h4>
                            </div>
                            {typeof priority === 'object' && priority.description && (
                              <p className="text-sm text-purple-700 ml-6">{priority.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => editPriority(index)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => removePriority(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {showPriorityForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 bg-gray-50 rounded-lg border-2 border-dashed space-y-3"
                    >
                      <Input
                        value={newPriority.title}
                        onChange={(e) => setNewPriority(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Priority title..."
                        onKeyDown={(e) => e.key === 'Enter' && addPriority()}
                      />
                      <Textarea
                        value={newPriority.description}
                        onChange={(e) => setNewPriority(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Priority description (optional)..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={addPriority} size="sm" className="bg-purple-600 hover:bg-purple-700">
                          {editingPriority !== null ? 'Update' : 'Add'} Priority
                        </Button>
                        <Button
                          onClick={() => cancelForm('priority')}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Projects Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-emerald-600" />
                    Key Projects
                  </CardTitle>
                  <Button
                    onClick={() => setShowProjectForm(true)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {profile.project_notes.map((project, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-emerald-900 flex-1">{project.project}</h4>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => editProject(index)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => removeProject(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-emerald-700">{project.notes}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {showProjectForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="md:col-span-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed space-y-3"
                    >
                      <Input
                        value={newProject.project}
                        onChange={(e) => setNewProject(prev => ({ ...prev, project: e.target.value }))}
                        placeholder="Project name..."
                      />
                      <Textarea
                        value={newProject.notes}
                        onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Project notes and context..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={addProject} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          {editingProject !== null ? 'Update' : 'Add'} Project
                        </Button>
                        <Button
                          onClick={() => cancelForm('project')}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Direct Reports Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Direct Reports (Optional)
                  </CardTitle>
                  <Button
                    onClick={() => setShowReportForm(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Team Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {profile.direct_reports.map((report, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group p-4 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-blue-900">{report.name}</h4>
                            <p className="text-xs text-blue-600">{report.tenure_years} years</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => editReport(index)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => removeReport(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {report.strengths.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-blue-800 mb-1">Strengths:</p>
                            <div className="flex flex-wrap gap-1">
                              {report.strengths.map((strength, i) => (
                                <Badge key={i} className="text-xs bg-green-100 text-green-800">
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.risks.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Development Areas:</p>
                            <div className="flex flex-wrap gap-1">
                              {report.risks.map((risk, i) => (
                                <Badge key={i} className="text-xs bg-orange-100 text-orange-800">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {showReportForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="md:col-span-2 lg:col-span-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed space-y-3"
                    >
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input
                          value={newReport.name}
                          onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Team member name..."
                        />
                        <Input
                          value={newReport.tenure_years}
                          onChange={(e) => setNewReport(prev => ({ ...prev, tenure_years: e.target.value }))}
                          placeholder="Years of experience..."
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Strengths</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {newReport.strengths.map((strength, i) => (
                              <Badge key={i} className="text-xs bg-green-100 text-green-800">
                                {strength}
                                <button
                                  onClick={() => removeSkill('strengths', i)}
                                  className="ml-1 text-green-600 hover:text-green-800"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <Input
                            placeholder="Add strength..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSkill('strengths', e.target.value);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Development Areas</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {newReport.risks.map((risk, i) => (
                              <Badge key={i} className="text-xs bg-orange-100 text-orange-800">
                                {risk}
                                <button
                                  onClick={() => removeSkill('risks', i)}
                                  className="ml-1 text-orange-600 hover:text-orange-800"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <Input
                            placeholder="Add development area..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSkill('risks', e.target.value);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={addReport} size="sm" className="bg-blue-600 hover:bg-blue-700">
                          {editingReport !== null ? 'Update' : 'Add'} Team Member
                        </Button>
                        <Button
                          onClick={() => cancelForm('report')}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Generate Plan Button - Moved to bottom */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center py-8"
          >
            <Button
              onClick={handleSubmit}
              disabled={!profile.company || !profile.newHireRole || !profile.newHireName}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg"
            >
              <Save className="w-5 h-5 mr-2" />
              Generate 90-Day Plan
            </Button>
            {(!profile.company || !profile.newHireRole || !profile.newHireName) && (
              <p className="text-sm text-gray-500 mt-2">
                Please fill in Company, New Hire Name, and New Hire Role to continue
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}