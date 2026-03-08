import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, CheckCircle, AlertCircle, Map, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import TeamHierarchySelector from "./TeamHierarchySelector";
import DivisionTeamSelector from "./DivisionTeamSelector";
import UserMultiSelect from "./UserMultiSelect";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AssignJourneyModal({ isOpen, onClose, onSuccess }) {
  const { user, appRole } = useAuth();
  const [step, setStep] = useState(1);
  
  const [journeys, setJourneys] = useState([]);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  
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
      loadJourneys();
      loadAssignableUsers();
      resetModal();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedJourneyId) {
      const journey = journeys.find(j => j.id === selectedJourneyId);
      setSelectedJourney(journey);
    }
  }, [selectedJourneyId, journeys]);

  const resetModal = () => {
    setStep(1);
    setSelectedJourneyId(null);
    setSelectedJourney(null);
    setSelectedEmails([]);
    setDueDate(null);
    setSendNotification(true);
    setAssignmentResults(null);
  };

  const loadJourneys = async () => {
    setLoadingJourneys(true);
    try {
      const allJourneys = await base44.entities.LearningJourney.list();
      const publishedJourneys = allJourneys.filter(j => j.status === 'published');
      setJourneys(publishedJourneys);
    } catch (error) {
      console.error('Error loading journeys:', error);
      toast.error('Failed to load learning journeys');
    } finally {
      setLoadingJourneys(false);
    }
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

    setAssigning(true);
    try {
      const response = await base44.functions.invoke('bulkAssignJourneys', {
        journey_id: selectedJourneyId,
        user_emails: selectedEmails,
        due_date: dueDate ? dueDate.toISOString() : null,
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
        toast.error('Failed to assign journey');
      }
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Failed to assign journey');
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-600" />
            Assign Learning Journey
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > s ? 'bg-green-600 text-white' :
                  step === s ? 'bg-blue-600 text-white' :
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
                  <Label className="text-base font-semibold mb-3 block">Select Learning Journey</Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a published journey to assign to your team
                  </p>
                </div>

                {loadingJourneys ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : journeys.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No published journeys found</p>
                      <Link to={createPageUrl("JourneyBuilder")}>
                        <Button>Create Your First Journey</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {journeys.map((journey) => (
                        <Card
                          key={journey.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedJourneyId === journey.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedJourneyId(journey.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{journey.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                  {journey.description || 'No description'}
                                </p>
                              </div>
                              {selectedJourneyId === journey.id && (
                                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge className={journey.type === 'learning_path' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                {journey.type === 'learning_path' ? 'Learning Path' : 'Curriculum'}
                              </Badge>
                              {journey.content_structure?.length > 0 && (
                                <Badge variant="outline">{journey.content_structure.length} resources</Badge>
                              )}
                              {journey.estimated_duration_days && (
                                <Badge variant="outline">{journey.estimated_duration_days} days</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <Link to={createPageUrl("JourneyBuilder")}>
                    <Button variant="outline">Create New Journey</Button>
                  </Link>
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
                    Choose who should be enrolled in this journey
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

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Learning Journey</p>
                        <p className="font-semibold text-gray-900">{selectedJourney?.title}</p>
                        <p className="text-sm text-gray-600">{selectedJourney?.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Recipients</p>
                        <Badge className="bg-blue-600 text-white">
                          {selectedEmails.length} user{selectedEmails.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={selectedJourney?.type === 'learning_path' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                          {selectedJourney?.type === 'learning_path' ? 'Sequential Path' : 'Flexible Curriculum'}
                        </Badge>
                        {selectedJourney?.content_structure?.length > 0 && (
                          <Badge variant="outline">{selectedJourney.content_structure.length} resources</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Due Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, 'PPP') : 'No due date'}
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

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send-notification-journey"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="send-notification-journey" className="cursor-pointer">
                      Send email notifications to recipients
                    </Label>
                  </div>
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
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Successfully Assigned!</h3>
                      <p className="text-gray-600">
                        Journey assigned to {assignmentResults.successful_assignments} user{assignmentResults.successful_assignments > 1 ? 's' : ''}
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
                  disabled={(step === 1 && !selectedJourneyId) || (step === 2 && selectedEmails.length === 0)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleAssign}
                  disabled={assigning || selectedEmails.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Assign to {selectedEmails.length} User{selectedEmails.length > 1 ? 's' : ''}
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