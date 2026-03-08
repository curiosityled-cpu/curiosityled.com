import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle, ArrowLeft, Filter, AlertCircle, Calendar as CalendarIcon, Target, BookOpen, BarChart3, Award, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [filterType, notifications]);

  const loadNotifications = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    setError(null);
    try {
      const allNotifications = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-scheduled_for'
      );
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError(error.message);
      // Set empty array so UI doesn't break
      setNotifications([]);
      toast.error('Could not load notifications. This feature may not be available yet.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filterType === "all") {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === filterType));
    }
  };

  const handleMarkAsRead = async (notificationId, currentStatus) => {
    try {
      await base44.entities.Notification.update(notificationId, { is_read: !currentStatus });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: !currentStatus } : n
      ));
      toast.success(currentStatus ? 'Marked as unread' : 'Marked as read');
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      for (const notification of unreadNotifications) {
        await base44.entities.Notification.update(notification.id, { is_read: true });
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id, false);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'goal_assignment':
      case 'goal_deadline':
        return <Target className="w-5 h-5 text-green-600" />;
      case 'learning_assigned':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'assessment_due':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      case 'milestone':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case '1on1_scheduled':
        return <CalendarIcon className="w-5 h-5 text-orange-600" />;
      case 'certification_expiring':
      case 'certification_status':
        return <Award className="w-5 h-5 text-yellow-600" />;
      case 'assessment_status':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Notifications Not Available Yet
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                The notifications feature will be available soon. In the meantime, you'll receive important updates via email.
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Notifications
              </h1>
              <p className="text-gray-600">
                Stay updated with your leadership journey
              </p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="goal_assignment">Goal Assignments</SelectItem>
                <SelectItem value="goal_deadline">Goal Reminders</SelectItem>
                <SelectItem value="learning_assigned">Learning Assignments</SelectItem>
                <SelectItem value="assessment_due">Assessment Due</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
                <SelectItem value="1on1_scheduled">1:1 Meetings</SelectItem>
                <SelectItem value="nudge">AI Coach Nudges</SelectItem>
                <SelectItem value="certification_expiring">Certification Expiring</SelectItem>
                <SelectItem value="certification_status">Certification Status</SelectItem>
                <SelectItem value="assessment_status">Assessment Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {notifications.length === 0 ? 'No Notifications' : 'No Matching Notifications'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {notifications.length === 0 
                  ? "You're all caught up! New notifications will appear here."
                  : 'Try adjusting your filter to see more notifications.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card 
                    className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${
                      notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-600'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-gray-500">
                              {notification.scheduled_for && format(new Date(notification.scheduled_for), 'MMM d, yyyy h:mm a')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id, notification.is_read);
                              }}
                              className="text-xs"
                            >
                              {notification.is_read ? 'Mark Unread' : 'Mark Read'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}