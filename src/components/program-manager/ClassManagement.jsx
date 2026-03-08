import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Users, Plus, Search, Filter, CheckCircle, XCircle, AlertCircle, Edit, Trash2, UserCheck, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const CLASS_TYPES = [
  { value: 'ilt', label: 'Instructor-Led Training' },
  { value: 'virtual_ilt', label: 'Virtual ILT' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'coaching_group', label: 'Group Coaching' }
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  open_enrollment: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function ClassManagement({ programId = null, cohortId = null }) {
  const { user, hasPermission } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_type: 'ilt',
    scheduled_date: '',
    end_date: '',
    duration_minutes: 60,
    location: '',
    location_type: 'in_person',
    max_capacity: 20,
    status: 'draft'
  });

  useEffect(() => {
    loadClasses();
  }, [programId, cohortId]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      let filter = { facilitator_email: user.email };
      if (programId) filter.program_id = programId;
      if (cohortId) filter.cohort_id = cohortId;
      
      const data = await base44.entities.Class.filter(filter, '-scheduled_date');
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    setSaving(true);
    try {
      const newClass = {
        ...formData,
        client_id: user.client_id,
        facilitator_email: user.email,
        program_id: programId,
        cohort_id: cohortId,
        enrolled_emails: [],
        waitlist_emails: [],
        attendance_records: []
      };
      await base44.entities.Class.create(newClass);
      setShowCreateModal(false);
      resetForm();
      loadClasses();
    } catch (error) {
      console.error('Error creating class:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      await base44.entities.Class.update(selectedClass.id, formData);
      setShowCreateModal(false);
      setSelectedClass(null);
      resetForm();
      loadClasses();
    } catch (error) {
      console.error('Error updating class:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await base44.entities.Class.delete(classId);
      loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleMarkAttendance = async (email, status) => {
    if (!selectedClass) return;
    try {
      const existingRecords = selectedClass.attendance_records || [];
      const updatedRecords = existingRecords.filter(r => r.email !== email);
      updatedRecords.push({
        email,
        status,
        check_in_time: new Date().toISOString(),
        notes: ''
      });
      
      await base44.entities.Class.update(selectedClass.id, {
        attendance_records: updatedRecords
      });
      
      setSelectedClass({
        ...selectedClass,
        attendance_records: updatedRecords
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      class_type: 'ilt',
      scheduled_date: '',
      end_date: '',
      duration_minutes: 60,
      location: '',
      location_type: 'in_person',
      max_capacity: 20,
      status: 'draft'
    });
  };

  const openEditModal = (cls) => {
    setSelectedClass(cls);
    setFormData({
      title: cls.title || '',
      description: cls.description || '',
      class_type: cls.class_type || 'ilt',
      scheduled_date: cls.scheduled_date ? cls.scheduled_date.slice(0, 16) : '',
      end_date: cls.end_date ? cls.end_date.slice(0, 16) : '',
      duration_minutes: cls.duration_minutes || 60,
      location: cls.location || '',
      location_type: cls.location_type || 'in_person',
      max_capacity: cls.max_capacity || 20,
      status: cls.status || 'draft'
    });
    setShowCreateModal(true);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cls.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAttendanceStatus = (cls, email) => {
    const record = cls.attendance_records?.find(r => r.email === email);
    return record?.status || 'unmarked';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
          <p className="text-gray-600">Schedule and manage your ILT sessions</p>
        </div>
        {hasPermission('classes.create') && (
          <Button onClick={() => { resetForm(); setSelectedClass(null); setShowCreateModal(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="open_enrollment">Open Enrollment</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredClasses.map((cls) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge className={STATUS_COLORS[cls.status] || 'bg-gray-100'}>
                      {cls.status?.replace('_', ' ')}
                    </Badge>
                    <div className="flex gap-1">
                      {hasPermission('classes.edit') && (
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(cls)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('classes.delete') && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(cls.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{cls.title}</CardTitle>
                  <CardDescription>
                    {CLASS_TYPES.find(t => t.value === cls.class_type)?.label}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    {cls.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(cls.scheduled_date), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                    {cls.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {cls.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {cls.enrolled_emails?.length || 0} / {cls.max_capacity} enrolled
                    </div>
                  </div>
                  
                  {(cls.status === 'in_progress' || cls.status === 'completed') && hasPermission('classes.mark_attendance') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => { setSelectedClass(cls); setShowAttendanceModal(true); }}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Manage Attendance
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No classes found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Class title"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Class description and objectives"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Class Type</Label>
              <Select value={formData.class_type} onValueChange={(v) => setFormData({ ...formData, class_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="open_enrollment">Open Enrollment</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label>Max Capacity</Label>
              <Input
                type="number"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label>Location Type</Label>
              <Select value={formData.location_type} onValueChange={(v) => setFormData({ ...formData, location_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Location / Meeting Link</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Room name or meeting URL"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={selectedClass ? handleUpdateClass : handleCreateClass}
              disabled={saving || !formData.title}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : (selectedClass ? 'Update Class' : 'Create Class')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Attendance - {selectedClass?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {selectedClass?.enrolled_emails?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No participants enrolled</p>
            ) : (
              selectedClass?.enrolled_emails?.map((email) => {
                const status = getAttendanceStatus(selectedClass, email);
                return (
                  <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{email}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={status === 'present' ? 'default' : 'outline'}
                        className={status === 'present' ? 'bg-green-600' : ''}
                        onClick={() => handleMarkAttendance(email, 'present')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'absent' ? 'default' : 'outline'}
                        className={status === 'absent' ? 'bg-red-600' : ''}
                        onClick={() => handleMarkAttendance(email, 'absent')}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'late' ? 'default' : 'outline'}
                        className={status === 'late' ? 'bg-yellow-600' : ''}
                        onClick={() => handleMarkAttendance(email, 'late')}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendanceModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}