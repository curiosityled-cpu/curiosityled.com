import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  Target, 
  BarChart3,
  ArrowRight,
  Calendar,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ActionItemsSection({ user }) {
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?.email) {
      loadActionItems();
    }
  }, [user?.email]);

  const loadActionItems = async () => {
    setLoading(true);
    try {
      // Fetch notifications, assigned learning, and goals in parallel
      const [notifs, assignedLearning, goals, enrollments] = await Promise.all([
        base44.entities.Notification.filter({ user_email: user.email, is_read: false }, '-scheduled_for', 5),
        base44.entities.AssignedLearning.filter({ user_email: user.email, status: { $in: ['assigned', 'in_progress'] } }, '-created_date', 5),
        base44.entities.Goal.filter({ created_by: user.email, status: 'active' }, '-created_date', 5),
        base44.entities.JourneyEnrollment.filter({ user_email: user.email, status: { $in: ['enrolled', 'in_progress'] } }, '-created_date', 3)
      ]);

      setNotifications(notifs);

      // Build action items from various sources
      const items = [];

      // Overdue or due soon learning
      assignedLearning.forEach(learning => {
        const dueDate = learning.due_date ? new Date(learning.due_date) : null;
        const isOverdue = dueDate && dueDate < new Date();
        const isDueSoon = dueDate && !isOverdue && (dueDate - new Date()) < 7 * 24 * 60 * 60 * 1000;
        
        if (isOverdue || isDueSoon || learning.status === 'assigned') {
          items.push({
            id: `learning-${learning.id}`,
            type: 'learning',
            title: learning.title,
            description: isOverdue ? 'Overdue' : isDueSoon ? 'Due soon' : 'New assignment',
            priority: isOverdue ? 'high' : isDueSoon ? 'medium' : 'low',
            icon: BookOpen,
            actionUrl: createPageUrl('MyLearning'),
            actionLabel: 'Continue',
            dueDate: dueDate,
            progress: learning.status === 'in_progress' ? 50 : 0
          });
        }
      });

      // Active goals needing attention
      goals.forEach(goal => {
        const dueDate = goal.timeframe_end ? new Date(goal.timeframe_end) : null;
        const isOverdue = dueDate && dueDate < new Date();
        const isDueSoon = dueDate && !isOverdue && (dueDate - new Date()) < 7 * 24 * 60 * 60 * 1000;
        
        if ((goal.progress || 0) < 100 && (isOverdue || isDueSoon)) {
          items.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            title: goal.title,
            description: isOverdue ? 'Goal overdue' : 'Goal due soon',
            priority: isOverdue ? 'high' : 'medium',
            icon: Target,
            actionUrl: createPageUrl('Performance'),
            actionLabel: 'Update',
            dueDate: dueDate,
            progress: goal.progress || 0
          });
        }
      });

      // Journey enrollments in progress
      enrollments.forEach(enrollment => {
        if (enrollment.progress_percentage < 100) {
          items.push({
            id: `journey-${enrollment.id}`,
            type: 'journey',
            title: enrollment.journey_title || 'Learning Journey',
            description: `${Math.round(enrollment.progress_percentage || 0)}% complete`,
            priority: 'low',
            icon: BarChart3,
            actionUrl: createPageUrl('MyJourneys'),
            actionLabel: 'Continue',
            progress: enrollment.progress_percentage || 0
          });
        }
      });

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setActionItems(items.slice(0, 5));
    } catch (error) {
      console.error('Error loading action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Urgent';
      case 'medium': return 'Soon';
      default: return 'Active';
    }
  };

  const formatDueDate = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const hasItems = actionItems.length > 0 || notifications.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Action Items</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Tasks that need your attention</p>
              </div>
            </div>
            {notifications.length > 0 && (
              <Link to={createPageUrl('Notifications')}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                  {notifications.length} new notification{notifications.length !== 1 ? 's' : ''}
                </Badge>
              </Link>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">You're all caught up!</h3>
              <p className="text-gray-500 text-sm">No pending action items at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {actionItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'learning' ? 'bg-blue-100' :
                        item.type === 'goal' ? 'bg-green-100' :
                        'bg-purple-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          item.type === 'learning' ? 'text-blue-600' :
                          item.type === 'goal' ? 'text-green-600' :
                          'text-purple-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                          <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                            {getPriorityLabel(item.priority)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{item.description}</span>
                          {item.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDueDate(item.dueDate)}
                            </span>
                          )}
                        </div>
                        
                        {item.progress > 0 && item.progress < 100 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={item.progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-gray-500">{item.progress}%</span>
                          </div>
                        )}
                      </div>
                      
                      <Link to={item.actionUrl}>
                        <Button size="sm" variant="outline" className="gap-1">
                          {item.actionLabel}
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}