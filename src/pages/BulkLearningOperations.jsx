import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Upload, Send, CheckCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import MultiSelectFilter from "@/components/learning/MultiSelectFilter";

export default function BulkLearningOperations() {
  const { user } = useAuth();
  const [operation, setOperation] = useState("assign_resource");
  const [selectedResources, setSelectedResources] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [assignmentMethod, setAssignmentMethod] = useState("emails");
  const [userEmails, setUserEmails] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [resources, setResources] = useState([]);
  const [modules, setModules] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resourcesData, modulesData, usersData] = await Promise.all([
        base44.entities.LearningResource.filter({ is_active: true }),
        base44.entities.ConversationalLearningModule.filter({ is_active: true }),
        base44.entities.User.list()
      ]);
      setResources(resourcesData);
      setModules(modulesData);
      setAllUsers(usersData);

      // Extract unique departments
      const depts = [...new Set(usersData.map(u => u.department).filter(Boolean))];
      setDepartments(depts);

      // Extract unique teams
      const teamsData = [...new Set(usersData.map(u => u.team).filter(Boolean))];
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load resources");
    }
  };

  const getTargetEmails = () => {
    let emails = [];

    if (assignmentMethod === "emails") {
      emails = userEmails.split('\n').map(e => e.trim()).filter(e => e);
    } else if (assignmentMethod === "department") {
      emails = allUsers.filter(u => u.department === selectedDepartment).map(u => u.email);
    } else if (assignmentMethod === "team") {
      emails = allUsers.filter(u => u.team === selectedTeam).map(u => u.email);
    } else if (assignmentMethod === "individuals") {
      emails = selectedIndividuals;
    }

    return emails;
  };

  const handleBulkOperation = async () => {
    const emails = getTargetEmails();
    
    if (emails.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (operation === "assign_resource" && selectedResources.length === 0) {
      toast.error("Please select at least one resource");
      return;
    }

    if (operation === "assign_module" && selectedModules.length === 0) {
      toast.error("Please select at least one module");
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const email of emails) {
        try {
          if (operation === "assign_resource") {
            for (const resourceId of selectedResources) {
              await base44.entities.AssignedLearning.create({
                user_email: email,
                learning_resource_id: resourceId,
                assigned_by: user.email,
                title: resources.find(r => r.id === resourceId)?.title || "Learning Resource",
                status: "assigned"
              });
            }
          } else if (operation === "assign_module") {
            for (const moduleId of selectedModules) {
              await base44.entities.LearnerProgress.create({
                user_email: email,
                conversational_learning_module_id: moduleId,
                status: "not_started",
                progress_percentage: 0
              });
            }
          } else if (operation === "send_reminder") {
            await base44.entities.Notification.create({
              user_email: email,
              type: "learning_assigned",
              title: "Continue Your Learning Journey",
              message: "You have pending learning activities. Keep up the great progress!",
              scheduled_for: new Date().toISOString(),
              priority: "medium"
            });
          }
          successCount++;
        } catch (error) {
          failCount++;
          errors.push({ email, error: error.message });
        }
      }

      setResults({ successCount, failCount, errors, totalAssignments: successCount * (operation === "assign_resource" ? selectedResources.length : operation === "assign_module" ? selectedModules.length : 1) });
      
      if (failCount === 0) {
        toast.success(`Successfully processed ${successCount} user(s)`);
      } else {
        toast.warning(`Processed ${successCount} user(s), ${failCount} failed`);
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      toast.error("Operation failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Learning Operations</h1>
        <p className="text-gray-600 mt-2">Manage learning assignments for multiple users at once</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Operation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Operation Type</label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign_resource">Assign Learning Resource</SelectItem>
                <SelectItem value="assign_module">Assign Conversational Module</SelectItem>
                <SelectItem value="send_reminder">Send Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resource Selection */}
          {operation === "assign_resource" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Resources ({selectedResources.length} selected)
              </label>
              <Card className="border">
                <ScrollArea className="h-64 p-4">
                  <div className="space-y-2">
                    {resources.map(resource => (
                      <div key={resource.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={resource.id}
                          checked={selectedResources.includes(resource.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedResources([...selectedResources, resource.id]);
                            } else {
                              setSelectedResources(selectedResources.filter(id => id !== resource.id));
                            }
                          }}
                        />
                        <label htmlFor={resource.id} className="text-sm cursor-pointer flex-1">
                          {resource.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          {/* Module Selection */}
          {operation === "assign_module" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Modules ({selectedModules.length} selected)
              </label>
              <Card className="border">
                <ScrollArea className="h-64 p-4">
                  <div className="space-y-2">
                    {modules.map(module => (
                      <div key={module.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={module.id}
                          checked={selectedModules.includes(module.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedModules([...selectedModules, module.id]);
                            } else {
                              setSelectedModules(selectedModules.filter(id => id !== module.id));
                            }
                          }}
                        />
                        <label htmlFor={module.id} className="text-sm cursor-pointer flex-1">
                          {module.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          {/* Assignment Method */}
          <div>
            <label className="text-sm font-medium mb-2 block">Assignment Method</label>
            <Select value={assignmentMethod} onValueChange={setAssignmentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emails">Enter Emails</SelectItem>
                <SelectItem value="department">By Department</SelectItem>
                <SelectItem value="team">By Team</SelectItem>
                <SelectItem value="individuals">Select Individuals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Input */}
          {assignmentMethod === "emails" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                User Emails (one per line)
              </label>
              <Textarea
                value={userEmails}
                onChange={(e) => setUserEmails(e.target.value)}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter one email address per line
              </p>
            </div>
          )}

          {/* Department Selection */}
          {assignmentMethod === "department" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDepartment && (
                <p className="text-xs text-gray-600 mt-2">
                  {allUsers.filter(u => u.department === selectedDepartment).length} users in this department
                </p>
              )}
            </div>
          )}

          {/* Team Selection */}
          {assignmentMethod === "team" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeam && (
                <p className="text-xs text-gray-600 mt-2">
                  {allUsers.filter(u => u.team === selectedTeam).length} users in this team
                </p>
              )}
            </div>
          )}

          {/* Individual Selection */}
          {assignmentMethod === "individuals" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Users ({selectedIndividuals.length} selected)
              </label>
              <Card className="border">
                <ScrollArea className="h-64 p-4">
                  <div className="space-y-2">
                    {allUsers.map(u => (
                      <div key={u.email} className="flex items-center space-x-2">
                        <Checkbox
                          id={u.email}
                          checked={selectedIndividuals.includes(u.email)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIndividuals([...selectedIndividuals, u.email]);
                            } else {
                              setSelectedIndividuals(selectedIndividuals.filter(e => e !== u.email));
                            }
                          }}
                        />
                        <label htmlFor={u.email} className="text-sm cursor-pointer flex-1">
                          {u.full_name} ({u.email})
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          <Button 
            onClick={handleBulkOperation}
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {processing ? (
              <>Processing...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Execute Bulk Operation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Operation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {results.successCount} Users Processed
                </Badge>
                {results.totalAssignments && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {results.totalAssignments} Total Assignments
                  </Badge>
                )}
                {results.failCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <X className="w-4 h-4 mr-1" />
                    {results.failCount} Failed
                  </Badge>
                )}
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                  <div className="space-y-2">
                    {results.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {err.email}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}