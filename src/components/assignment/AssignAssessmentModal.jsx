import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, CheckCircle, AlertCircle, BarChart3, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import TeamHierarchySelector from "./TeamHierarchySelector";
import DivisionTeamSelector from "./DivisionTeamSelector";
import UserMultiSelect from "./UserMultiSelect";

export default function AssignAssessmentModal({ isOpen, onClose, onSuccess }) {
  const { user, appRole } = useAuth();
  const [step, setStep] = useState(1);
  
  const [assessmentType, setAssessmentType] = useState('leadership_index');
  const [customMessage, setCustomMessage] = useState('');
  
  const [selectionMode, setSelectionMode] = useState('team');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [dueDate, setDueDate] = useState(null);
  const [sendNotification, setSendNotification] = useState(true);
  
  const [assigning, setAssigning] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState(null);

  const isManager = appRole === 'User Level 2';
  const isAdmin = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(appRole);

  useEffect(() => {
    if (isOpen) {
      loadAssignableUsers();
      resetModal();
    }
  }, [isOpen]);

  const resetModal = () => {
    setStep(1);
    setAssessmentType('leadership_index');
    setCustomMessage('');
    setSelectedEmails([]);
    setDueDate(null);
    setSendNotification(true);
    setAssignmentResults(null);
  };

  const loadAssignableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await base44.functions.invoke('getAssignableUsers', {
        include_metadata: true
      });

      if (response.data?.success) {
        setAssignableUsers(response.data.data.assignable_users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load assignable users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!dueDate) {
      toast.error('Please set a due date for the assessment');
      return;
    }

    setAssigning(true);
    try {
      const response = await base44.functions.invoke('bulkAssignAssessments', {
        assessment_type: assessmentType,
        user_emails: selectedEmails,
        due_date: dueDate.toISOString(),
        custom_message: customMessage || null,
        notify: sendNotification
      });

      if (response.data?.success) {
        setAssignmentResults(response.data.data);
        setStep(4);
        
        if (response.data.data.failed_assignments === 0) {
          toast.success(`Successfully assigned to ${response.data.data.successful_assignments} users!`);
        } else {
          toast.warning(`Assigned to ${response.data.data.successful_assignments} users, ${response.data.data.failed_assignments} failed`);
        }
      } else {
        toast.error('Failed to assign assessments');
      }
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Failed to assign assessments');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = () => {
    if (assignmentResults && assignmentResults.successful_assignments > 0) {
      onSuccess?.();
    }
    onClose();
    setTimeout(resetModal, 300);
  };

  const assessmentTypeLabels = {
    leadership_index: 'Leadership Index Assessment',
    custom: 'Custom Assessment'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Assign Assessment
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > s ? 'bg-green-600 text-white' :
                  step === s ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 p-1"
              >
                <div>
                  <Label className="text-base font-semibold mb-3 block">Assessment Details</Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the assessment invitation
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Assessment Type</Label>
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        assessmentType === 'leadership_index' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                      onClick={() => setAssessmentType('leadership_index')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">Leadership Index Assessment</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Comprehensive 360° leadership evaluation covering all core competencies
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">15-20 min</Badge>
                              <Badge variant="outline">6 Competencies</Badge>
                            </div>
                          </div>
                          {assessmentType === 'leadership_index' && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Label className="mb-2 block">Due Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="mb-2 block">Custom Message (Optional)</Label>
                    <Textarea
                      placeholder="Add a personal message to include in the invitation email..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 p-1"
              >
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Recipients</Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose who should receive this assessment invitation
                  </p>
                </div>

                {isManager && (
                  <TeamHierarchySelector
                    selectedEmails={selectedEmails}
                    onSelectionChange={setSelectedEmails}
                  />
                )}

                {isAdmin && (
                  <Tabs value={selectionMode} onValueChange={setSelectionMode}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="division">By Division/Team</TabsTrigger>
                      <TabsTrigger value="individual">Individual Users</TabsTrigger>
                    </TabsList>

                    <TabsContent value="division" className="mt-4">
                      <DivisionTeamSelector
                        selectedEmails={selectedEmails}
                        onSelectionChange={setSelectedEmails}
                      />
                    </TabsContent>

                    <TabsContent value="individual" className="mt-4">
                      {loadingUsers ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        </div>
                      ) : (
                        <UserMultiSelect
                          users={assignableUsers}
                          selectedEmails={selectedEmails}
                          onSelectionChange={setSelectedEmails}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 p-1"
              >
                <div>
                  <Label className="text-base font-semibold mb-3 block">Review & Confirm</Label>
                </div>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Assessment Type</p>
                        <p className="font-semibold text-gray-900">{assessmentTypeLabels[assessmentType]}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Recipients</p>
                        <Badge className="bg-green-600 text-white">
                          {selectedEmails.length} user{selectedEmails.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Due Date</p>
                        <p className="text-sm font-medium">{dueDate ? format(dueDate, 'PPP') : 'Not set'}</p>
                      </div>
                      {customMessage && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Custom Message</p>
                          <p className="text-sm text-gray-700 italic">"{customMessage}"</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="send-notification-assessment"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="send-notification-assessment" className="cursor-pointer">
                    Send email invitations to recipients
                  </Label>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Users ({selectedEmails.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {assignableUsers
                          .filter(u => selectedEmails.includes(u.email))
                          .map(user => (
                            <div key={user.email} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <UsersIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-600 text-xs">{user.email}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 4 && assignmentResults && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 p-1"
              >
                <div className="text-center py-6">
                  {assignmentResults.failed_assignments === 0 ? (
                    <>
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Invitations Sent!</h3>
                      <p className="text-gray-600">
                        Assessment invitations sent to {assignmentResults.successful_assignments} user{assignmentResults.successful_assignments > 1 ? 's' : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Partially Completed</h3>
                      <p className="text-gray-600">
                        {assignmentResults.successful_assignments} successful, {assignmentResults.failed_assignments} failed
                      </p>
                    </>
                  )}
                </div>

                {assignmentResults.users_with_existing_assessment > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <p className="text-sm text-yellow-800">
                        ℹ️ {assignmentResults.users_with_existing_assessment} user{assignmentResults.users_with_existing_assessment > 1 ? 's' : ''} already completed this assessment
                      </p>
                    </CardContent>
                  </Card>
                )}

                {assignmentResults.errors?.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-red-700">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {assignmentResults.errors.map((err, idx) => (
                            <div key={idx} className="text-sm p-2 bg-red-50 rounded">
                              <p className="font-medium">{err.user_email}</p>
                              <p className="text-xs text-red-600">{err.error}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4">
          {step < 4 ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>}
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !dueDate) ||
                    (step === 2 && selectedEmails.length === 0)
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleAssign}
                  disabled={assigning || selectedEmails.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Send to {selectedEmails.length} User{selectedEmails.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}