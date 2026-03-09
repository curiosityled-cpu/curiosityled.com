import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Calendar,
  AlertCircle,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

const AssignedLearningList = React.memo(({ userEmail, preloadedData }) => {
  const [assignments, setAssignments] = useState(preloadedData || []);
  const [loading, setLoading] = useState(!preloadedData);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (preloadedData) {
      setAssignments(preloadedData);
      setLoading(false);
    } else if (userEmail) {
      loadAssignments();
    }
  }, [userEmail, preloadedData]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AssignedLearning.filter(
        { user_email: userEmail },
        '-created_date'
      );
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assigned learning:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (assignment) => {
    setUpdating(prev => ({ ...prev, [assignment.id]: true }));
    try {
      await base44.entities.AssignedLearning.update(assignment.id, {
        status: 'completed',
        completion_date: new Date().toISOString()
      });
      
      setAssignments(prev => 
        prev.map(a => a.id === assignment.id 
          ? { ...a, status: 'completed', completion_date: new Date().toISOString() }
          : a
        )
      );
      
      toast.success('Learning marked as complete!');
    } catch (error) {
      console.error('Error marking complete:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(prev => ({ ...prev, [assignment.id]: false }));
    }
  };

  const handleStartLearning = async (assignment) => {
    if (assignment.status === 'assigned') {
      setUpdating(prev => ({ ...prev, [assignment.id]: true }));
      try {
        await base44.entities.AssignedLearning.update(assignment.id, {
          status: 'in_progress'
        });
        
        setAssignments(prev => 
          prev.map(a => a.id === assignment.id 
            ? { ...a, status: 'in_progress' }
            : a
          )
        );
      } catch (error) {
        console.error('Error updating status:', error);
      } finally {
        setUpdating(prev => ({ ...prev, [assignment.id]: false }));
      }
    }
  };

  const { pendingAssignments, completedAssignments } = useMemo(() => ({
    pendingAssignments: assignments.filter(a => a.status !== 'completed'),
    completedAssignments: assignments.filter(a => a.status === 'completed')
  }), [assignments]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Assigned</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading assignments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assigned Learning</h3>
          <p className="text-gray-600">
            Your manager hasn't assigned any learning resources yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Assignments</h3>
          <div className="grid gap-4">
            {pendingAssignments.map((assignment, idx) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                          {getStatusBadge(assignment.status)}
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <Badge className={getPriorityColor(assignment.priority)}>
                            {assignment.priority} priority
                          </Badge>
                          {assignment.assigned_by && (
                            <span>Assigned by: {assignment.assigned_by}</span>
                          )}
                          {assignment.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {assignment.status !== 'completed' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleStartLearning(assignment)}
                            disabled={updating[assignment.id]}
                            className="gap-2"
                          >
                            {updating[assignment.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                            {assignment.status === 'assigned' ? 'Start Learning' : 'Continue'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkComplete(assignment)}
                            disabled={updating[assignment.id]}
                            className="gap-2"
                          >
                            {updating[assignment.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Mark Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Assignments */}
      {completedAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed</h3>
          <div className="grid gap-4">
            {completedAssignments.slice(0, 3).map((assignment) => (
              <Card key={assignment.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{assignment.title}</h4>
                      <p className="text-xs text-gray-500">
                        Completed on {format(new Date(assignment.completion_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

AssignedLearningList.displayName = 'AssignedLearningList';

export default AssignedLearningList;