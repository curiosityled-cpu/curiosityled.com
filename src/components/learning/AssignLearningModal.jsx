import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, Send, Search, X, BookOpen, Filter } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AssignLearningModal({ 
  open, 
  onClose, 
  onSuccess, 
  resource = null, 
  assignedBy 
}) {
  const [formData, setFormData] = useState({
    priority: "medium",
    due_date: "",
    notes: ""
  });
  const [dueDate, setDueDate] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [selectedResources, setSelectedResources] = useState(resource ? [resource.id] : []);
  const [resourceSearchTerm, setResourceSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [competencyFilter, setCompetencyFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      if (resource) {
        setSelectedResources([resource.id]);
      }
    }
  }, [open, resource]);

  useEffect(() => {
    filterUsers();
  }, [userSearchTerm, users]);

  useEffect(() => {
    filterResources();
  }, [resourceSearchTerm, typeFilter, competencyFilter, resources]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allResources] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.LearningResource.filter({ is_active: true })
      ]);
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      setResources(allResources);
      setFilteredResources(allResources);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!userSearchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const term = userSearchTerm.toLowerCase();
    const filtered = users.filter(user =>
      (user.full_name && user.full_name.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.department && user.department.toLowerCase().includes(term))
    );
    setFilteredUsers(filtered);
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (resourceSearchTerm.trim()) {
      const term = resourceSearchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.provider?.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    if (competencyFilter !== "all") {
      filtered = filtered.filter(r => r.competencies?.includes(competencyFilter));
    }

    setFilteredResources(filtered);
  };

  const toggleUserSelection = (userEmail) => {
    setSelectedUsers(prev => {
      if (prev.includes(userEmail)) {
        return prev.filter(email => email !== userEmail);
      }
      return [...prev, userEmail];
    });
  };

  const toggleResourceSelection = (resourceId) => {
    setSelectedResources(prev => {
      if (prev.includes(resourceId)) {
        return prev.filter(id => id !== resourceId);
      }
      return [...prev, resourceId];
    });
  };

  const handleAssign = async () => {
    if (selectedResources.length === 0) {
      toast.error("Please select at least one learning resource");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setAssigning(true);
    try {
      const assignmentPromises = selectedResources.map(resourceId =>
        base44.functions.invoke('createAssignedLearning', {
          learningResourceId: resourceId,
          userEmails: selectedUsers,
          assignedBy: assignedBy,
          priority: formData.priority,
          dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
          notes: formData.notes
        })
      );

      const results = await Promise.all(assignmentPromises);
      const successCount = results.filter(r => r.data.success).length;

      if (successCount === results.length) {
        toast.success(`${selectedResources.length} learning item(s) assigned to ${selectedUsers.length} user(s)`);
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        toast.error('Some assignments failed');
      }
    } catch (error) {
      console.error('Error assigning learning:', error);
      toast.error('Failed to assign learning');
    } finally {
      setAssigning(false);
    }
  };

  const selectedResourcesData = resources.filter(r => selectedResources.includes(r.id));
  const learningTypes = ['book', 'course', 'article', 'video', 'whitepaper', 'podcast', 'assessment_tool'];
  const competencies = [
    'Situational Intelligence',
    'Decision Making',
    'Communication',
    'Resource Management',
    'Stakeholder Management',
    'Performance Management'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Assign Learning Resources
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="resources" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resources">
              Select Learning ({selectedResources.length})
            </TabsTrigger>
            <TabsTrigger value="users">
              Select Users ({selectedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="flex-1 overflow-y-auto space-y-4">
            {/* Selected Resources */}
            {selectedResources.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Resources ({selectedResources.length})</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {selectedResourcesData.map(r => (
                    <Badge key={r.id} variant="secondary" className="gap-1 text-xs">
                      {r.title}
                      <button
                        onClick={() => toggleResourceSelection(r.id)}
                        className="ml-1 hover:bg-gray-300 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search learning resources..."
                  value={resourceSearchTerm}
                  onChange={(e) => setResourceSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {learningTypes.map(t => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competencies</SelectItem>
                    {competencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResourceSearchTerm("");
                    setTypeFilter("all");
                    setCompetencyFilter("all");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Learning Library */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No learning resources found
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredResources.map(resource => (
                    <Card
                      key={resource.id}
                      className={`cursor-pointer transition-all ${
                        selectedResources.includes(resource.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => toggleResourceSelection(resource.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedResources.includes(resource.id)}
                            onCheckedChange={() => toggleResourceSelection(resource.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm text-gray-900">
                                {resource.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {resource.type}
                              </Badge>
                            </div>
                            {resource.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {resource.provider && (
                                <Badge variant="secondary" className="text-xs">
                                  {resource.provider}
                                </Badge>
                              )}
                              {resource.competencies?.slice(0, 2).map(comp => (
                                <Badge key={comp} variant="outline" className="text-xs">
                                  {comp}
                                </Badge>
                              ))}
                              {resource.competencies?.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{resource.competencies.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 overflow-y-auto space-y-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or department..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                  {selectedUsers.map(email => {
                    const user = users.find(u => u.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {user?.full_name || email}
                        <button
                          onClick={() => toggleUserSelection(email)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <ScrollArea className="h-[400px] border rounded-lg p-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.email}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        onClick={() => toggleUserSelection(user.email)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.email)}
                          onCheckedChange={() => toggleUserSelection(user.email)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email} • {user.department || 'No department'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Assignment Details */}
        <div className="border-t pt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes or Instructions (Optional)</Label>
            <Textarea
              placeholder="Add any specific instructions or context for this assignment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedResources.length === 0 || selectedUsers.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Assign {selectedResources.length} Item(s) to {selectedUsers.length} User(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}