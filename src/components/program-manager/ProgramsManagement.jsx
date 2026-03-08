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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Users, 
  Calendar, Target, Eye, Loader2, CheckCircle, Clock, AlertCircle, Archive, Map,
  GraduationCap, MessageSquare, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import JourneySelector from './JourneySelector';
import ParticipantProgressView from './ParticipantProgressView';
import SubNavMenu from "@/components/common/SubNavMenu";

const PROGRAM_TYPES = [
  { id: 'executive_development', label: 'Executive Development' },
  { id: 'mid_level_leadership', label: 'Mid-Level Leadership' },
  { id: 'new_manager', label: 'New Manager' },
  { id: 'high_potential', label: 'High Potential' },
  { id: 'succession_planning', label: 'Succession Planning' },
  { id: 'team_effectiveness', label: 'Team Effectiveness' },
  { id: 'coaching_program', label: 'Coaching Program' },
  { id: 'certification', label: 'Certification' },
  { id: 'custom', label: 'Custom' }
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-slate-100 text-slate-800'
};

export default function ProgramsManagement({ onTabChange, activeSubTab }) {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [programs, setPrograms] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    program_type: 'custom',
    status: 'draft',
    start_date: '',
    end_date: '',
    max_participants: '',
    visibility: 'invite_only',
    notes: '',
    journey_ids: []
  });

  const [showJourneySelector, setShowJourneySelector] = useState(false);
  const [journeys, setJourneys] = useState([]);
  const [showParticipantProgress, setShowParticipantProgress] = useState(false);

  const tabItems = [
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'journeys', label: 'Journeys', icon: Map },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'coaching', label: 'Coaching', icon: MessageSquare },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'participants', label: 'Participants', icon: Users },
  ];

  useEffect(() => {
    if (user) {
      loadPrograms();
      loadJourneys();
    }
  }, [user?.id]);

  const loadJourneys = async () => {
    try {
      const data = await base44.entities.LearningJourney.filter({
        status: 'published',
        is_template: false
      });
      setJourneys(data);
    } catch (error) {
      console.error('Error loading journeys:', error);
    }
  };

  const loadPrograms = async () => {
    setLoading(true);
    try {
      // Load all programs and filter client-side for complex $or queries
      const allPrograms = await base44.entities.Program.list();
      const data = allPrograms.filter(p => 
        p.manager_emails?.includes(user.email) ||
        p.primary_manager_email === user.email ||
        p.program_manager_email === user.email
      );
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Program name is required');
      return;
    }

    setSaving(true);
    try {
      const programData = {
        ...formData,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        manager_emails: isEditing ? selectedProgram.manager_emails : [user.email],
        primary_manager_email: isEditing ? selectedProgram.primary_manager_email : user.email,
        program_manager_email: isEditing ? selectedProgram.program_manager_email : user.email,
        journey_ids: formData.journey_ids || []
      };
      if (user.client_id) programData.client_id = user.client_id;

      if (isEditing) {
        await base44.entities.Program.update(selectedProgram.id, programData);
        toast.success('Program updated');
      } else {
        await base44.entities.Program.create(programData);
        toast.success('Program created');
      }

      setShowFormModal(false);
      resetForm();
      loadPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (program) => {
    if (!confirm(`Delete "${program.name}"? This cannot be undone.`)) return;

    try {
      await base44.entities.Program.delete(program.id);
      toast.success('Program deleted');
      loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
    }
  };

  const handleStatusChange = async (program, newStatus) => {
    try {
      await base44.entities.Program.update(program.id, { status: newStatus });
      toast.success(`Program ${newStatus}`);
      loadPrograms();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (program) => {
    setSelectedProgram(program);
    setFormData({
      name: program.name || '',
      description: program.description || '',
      program_type: program.program_type || 'custom',
      status: program.status || 'draft',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      max_participants: program.max_participants?.toString() || '',
      visibility: program.visibility || 'invite_only',
      notes: program.notes || '',
      journey_ids: program.journey_ids || []
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      program_type: 'custom',
      status: 'draft',
      start_date: '',
      end_date: '',
      max_participants: '',
      visibility: 'invite_only',
      notes: '',
      journey_ids: []
    });
    setSelectedProgram(null);
    setIsEditing(false);
  };

  const getJourneyNames = (journeyIds) => {
    if (!journeyIds || journeyIds.length === 0) return [];
    return journeyIds.map(id => {
      const journey = journeys.find(j => j.id === id);
      return journey?.title || 'Unknown Journey';
    });
  };

  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.program_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: programs.length,
    active: programs.filter(p => p.status === 'active').length,
    draft: programs.filter(p => p.status === 'draft').length,
    completed: programs.filter(p => p.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Programs</h2>
          <p className="text-gray-600">Create and manage leadership development programs</p>
        </div>
        <div className="flex items-center gap-2">
          {onTabChange && (
            <SubNavMenu
              items={tabItems}
              activeId={activeSubTab || 'programs'}
              onItemClick={onTabChange}
              variant="content"
            />
          )}
          <Button onClick={() => { resetForm(); setShowFormModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />New Program
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-600">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROGRAM_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPrograms.map((program) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {PROGRAM_TYPES.find(t => t.id === program.program_type)?.label || 'Custom'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedProgram(program); setShowDetailModal(true); }}>
                          <Eye className="w-4 h-4 mr-2" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(program)}>
                          <Edit className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {program.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(program, 'active')}>
                            <CheckCircle className="w-4 h-4 mr-2" />Activate
                          </DropdownMenuItem>
                        )}
                        {program.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(program, 'paused')}>
                            <Clock className="w-4 h-4 mr-2" />Pause
                          </DropdownMenuItem>
                        )}
                        {program.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(program, 'active')}>
                            <CheckCircle className="w-4 h-4 mr-2" />Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(program)}>
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className={STATUS_COLORS[program.status || 'draft']}>
                      {program.status || 'draft'}
                    </Badge>

                    {program.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{program.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{program.participant_emails?.length || 0}</span>
                      </div>
                      {program.journey_ids?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Map className="w-4 h-4 text-purple-500" />
                          <span>{program.journey_ids.length} journeys</span>
                        </div>
                      )}
                      {program.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(program.start_date), 'MMM d')}</span>
                        </div>
                      )}
                    </div>

                    {program.metrics?.avg_completion_rate > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Completion</span>
                          <span>{Math.round(program.metrics.avg_completion_rate)}%</span>
                        </div>
                        <Progress value={program.metrics.avg_completion_rate} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPrograms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No programs found</p>
          <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setShowFormModal(true); }}>
            Create Your First Program
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Program' : 'Create Program'}</DialogTitle>
            <DialogDescription>Define the program details and settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Program Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Executive Leadership Development"
                />
              </div>

              <div>
                <Label>Program Type</Label>
                <Select value={formData.program_type} onValueChange={(v) => setFormData({ ...formData, program_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROGRAM_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="Unlimited if blank"
                />
              </div>

              <div>
                <Label>Visibility</Label>
                <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="invite_only">Invite Only</SelectItem>
                    <SelectItem value="open_enrollment">Open Enrollment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the program goals and content..."
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes for program managers..."
                  rows={2}
                />
              </div>

              {/* Journey Selection */}
              <div className="col-span-2 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-base">Learning Journeys</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Assign automated learning paths to this program
                    </p>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowJourneySelector(true)}
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Select Journeys
                  </Button>
                </div>
                
                {formData.journey_ids?.length > 0 ? (
                  <div className="space-y-2">
                    {getJourneyNames(formData.journey_ids).map((name, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Map className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            journey_ids: formData.journey_ids.filter((_, i) => i !== idx)
                          })}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm">
                    No journeys assigned yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProgram?.name}</DialogTitle>
          </DialogHeader>

          {selectedProgram && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={STATUS_COLORS[selectedProgram.status || 'draft']}>
                  {selectedProgram.status || 'draft'}
                </Badge>
                <Badge variant="outline">
                  {PROGRAM_TYPES.find(t => t.id === selectedProgram.program_type)?.label || 'Custom'}
                </Badge>
              </div>

              {selectedProgram.description && (
                <p className="text-gray-600">{selectedProgram.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="text-xl font-bold">{selectedProgram.participant_emails?.length || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Max Capacity</p>
                  <p className="text-xl font-bold">{selectedProgram.max_participants || 'Unlimited'}</p>
                </div>
                {selectedProgram.journey_ids?.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-500">Journeys</p>
                    <p className="text-xl font-bold text-purple-600">{selectedProgram.journey_ids.length}</p>
                  </div>
                )}
                {selectedProgram.start_date && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">{format(new Date(selectedProgram.start_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {selectedProgram.end_date && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">{format(new Date(selectedProgram.end_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Journey List */}
              {selectedProgram.journey_ids?.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Assigned Journeys</p>
                  <div className="space-y-1">
                    {getJourneyNames(selectedProgram.journey_ids).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Map className="w-4 h-4 text-purple-600" />
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProgram.notes && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Internal Notes</p>
                  <p className="text-sm">{selectedProgram.notes}</p>
                </div>
              )}

              {/* Participant Progress Button */}
              {selectedProgram.participant_emails?.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowParticipantProgress(true);
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Participant Progress
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
            <Button onClick={() => { setShowDetailModal(false); openEditModal(selectedProgram); }}>
              <Edit className="w-4 h-4 mr-2" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journey Selector Modal */}
      <JourneySelector
        open={showJourneySelector}
        onClose={() => setShowJourneySelector(false)}
        selectedJourneyIds={formData.journey_ids || []}
        onSelectionChange={(ids) => setFormData({ ...formData, journey_ids: ids })}
      />

      {/* Participant Progress View */}
      {selectedProgram && (
        <ParticipantProgressView
          open={showParticipantProgress}
          onClose={() => setShowParticipantProgress(false)}
          programId={selectedProgram.id}
          participantEmails={selectedProgram.participant_emails || []}
          journeyIds={selectedProgram.journey_ids || []}
        />
      )}
    </div>
  );
}