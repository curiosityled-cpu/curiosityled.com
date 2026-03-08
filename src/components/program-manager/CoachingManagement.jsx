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
import { Users, UserPlus, Calendar, Target, TrendingUp, Plus, Search, MessageSquare, Clock, CheckCircle, AlertTriangle, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const ENGAGEMENT_TYPES = [
  { value: '1on1_coaching', label: '1:1 Coaching' },
  { value: 'team_effectiveness', label: 'Team Effectiveness' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'career_coaching', label: 'Career Coaching' },
  { value: 'performance_improvement', label: 'Performance Improvement' },
  { value: 'executive_coaching', label: 'Executive Coaching' }
];

const SESSION_TYPES = [
  { value: '1on1_coaching', label: '1:1 Coaching' },
  { value: 'team_effectiveness', label: 'Team Session' },
  { value: 'leadership_development', label: 'Leadership Dev' },
  { value: 'career_coaching', label: 'Career Coaching' },
  { value: 'performance_coaching', label: 'Performance' },
  { value: 'onboarding_coaching', label: 'Onboarding' }
];

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700'
};

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

export default function CoachingManagement() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('engagements');
  const [engagements, setEngagements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [saving, setSaving] = useState(false);

  const [engagementForm, setEngagementForm] = useState({
    title: '',
    description: '',
    engagement_type: '1on1_coaching',
    coachee_email: '',
    status: 'pending',
    start_date: '',
    target_end_date: '',
    total_sessions_planned: 6,
    risk_level: 'low'
  });

  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    session_type: '1on1_coaching',
    engagement_id: '',
    coachee_email: '',
    scheduled_date: '',
    duration_minutes: 60,
    location: '',
    location_type: 'virtual',
    status: 'scheduled'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [engagementsData, sessionsData] = await Promise.all([
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }, '-created_date'),
        base44.entities.CoachingSession.filter({ coach_email: user.email }, '-scheduled_date')
      ]);
      setEngagements(engagementsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading coaching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEngagement = async () => {
    setSaving(true);
    try {
      await base44.entities.CoachingEngagement.create({
        ...engagementForm,
        client_id: user.client_id,
        coach_email: user.email,
        sessions_completed: 0,
        overall_progress: 0
      });
      setShowEngagementModal(false);
      resetEngagementForm();
      loadData();
    } catch (error) {
      console.error('Error creating engagement:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = async () => {
    setSaving(true);
    try {
      await base44.entities.CoachingSession.create({
        ...sessionForm,
        client_id: user.client_id,
        coach_email: user.email
      });
      setShowSessionModal(false);
      resetSessionForm();
      loadData();
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEngagementStatus = async (engagementId, newStatus) => {
    try {
      await base44.entities.CoachingEngagement.update(engagementId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating engagement:', error);
    }
  };

  const handleUpdateSessionStatus = async (sessionId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'completed') {
        updates.actual_end_time = new Date().toISOString();
      }
      await base44.entities.CoachingSession.update(sessionId, updates);
      loadData();
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const resetEngagementForm = () => {
    setEngagementForm({
      title: '',
      description: '',
      engagement_type: '1on1_coaching',
      coachee_email: '',
      status: 'pending',
      start_date: '',
      target_end_date: '',
      total_sessions_planned: 6,
      risk_level: 'low'
    });
  };

  const resetSessionForm = () => {
    setSessionForm({
      title: '',
      description: '',
      session_type: '1on1_coaching',
      engagement_id: '',
      coachee_email: '',
      scheduled_date: '',
      duration_minutes: 60,
      location: '',
      location_type: 'virtual',
      status: 'scheduled'
    });
  };

  const filteredEngagements = engagements.filter(e => 
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.coachee_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSessions = sessions.filter(s =>
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.coachee_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingSessions = filteredSessions.filter(s => 
    s.status === 'scheduled' || s.status === 'confirmed'
  );

  const activeEngagements = filteredEngagements.filter(e => e.status === 'active');

  // Stats
  const stats = {
    totalEngagements: engagements.length,
    activeEngagements: engagements.filter(e => e.status === 'active').length,
    upcomingSessions: sessions.filter(s => ['scheduled', 'confirmed'].includes(s.status)).length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    atRiskEngagements: engagements.filter(e => e.risk_level === 'high').length
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
          <h2 className="text-2xl font-bold text-gray-900">Coaching Management</h2>
          <p className="text-gray-600">Manage your coaching engagements and sessions</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('coaching.engagements.create') && (
            <Button onClick={() => { resetEngagementForm(); setShowEngagementModal(true); }} variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              New Engagement
            </Button>
          )}
          {hasPermission('coaching.sessions.schedule') && (
            <Button onClick={() => { resetSessionForm(); setShowSessionModal(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalEngagements}</div>
            <div className="text-sm text-gray-600">Total Engagements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeEngagements}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.upcomingSessions}</div>
            <div className="text-sm text-gray-600">Upcoming Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.completedSessions}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.atRiskEngagements}</div>
            <div className="text-sm text-gray-600">At Risk</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="engagements">
            <Users className="w-4 h-4 mr-2" />
            Engagements ({filteredEngagements.length})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Calendar className="w-4 h-4 mr-2" />
            Sessions ({filteredSessions.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <Clock className="w-4 h-4 mr-2" />
            Upcoming ({upcomingSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagements" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredEngagements.map((engagement) => (
                <motion.div
                  key={engagement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className={STATUS_COLORS[engagement.status]}>
                          {engagement.status}
                        </Badge>
                        <Badge className={RISK_COLORS[engagement.risk_level]}>
                          {engagement.risk_level} risk
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{engagement.title}</CardTitle>
                      <CardDescription>{engagement.coachee_email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span>{ENGAGEMENT_TYPES.find(t => t.value === engagement.engagement_type)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progress:</span>
                          <span>{engagement.sessions_completed || 0} / {engagement.total_sessions_planned || 0} sessions</span>
                        </div>
                        {engagement.target_end_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target End:</span>
                            <span>{format(new Date(engagement.target_end_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        <div className="pt-2">
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-blue-600 rounded-full transition-all"
                              style={{ width: `${engagement.overall_progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{engagement.overall_progress || 0}% complete</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {engagement.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateEngagementStatus(engagement.id, 'active')}>
                            <Play className="w-4 h-4 mr-1" /> Start
                          </Button>
                        )}
                        {engagement.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateEngagementStatus(engagement.id, 'on_hold')}>
                              <Pause className="w-4 h-4 mr-1" /> Hold
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateEngagementStatus(engagement.id, 'completed')}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Complete
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSessionForm(prev => ({
                              ...prev,
                              engagement_id: engagement.id,
                              coachee_email: engagement.coachee_email,
                              session_type: engagement.engagement_type
                            }));
                            setShowSessionModal(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{session.title || 'Coaching Session'}</h4>
                        <p className="text-sm text-gray-600">{session.coachee_email}</p>
                        {session.scheduled_date && (
                          <p className="text-sm text-gray-500">
                            {format(new Date(session.scheduled_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[session.status]}>{session.status}</Badge>
                      {session.status === 'scheduled' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <div className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming sessions scheduled</p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <Card key={session.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{session.title || 'Coaching Session'}</h4>
                        <p className="text-sm text-gray-600">{session.coachee_email}</p>
                        {session.scheduled_date && (
                          <p className="text-sm font-medium text-blue-600">
                            {format(new Date(session.scheduled_date), 'EEEE, MMM d @ h:mm a')}
                          </p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleUpdateSessionStatus(session.id, 'in_progress')}>
                        <Play className="w-4 h-4 mr-1" /> Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Engagement Modal */}
      <Dialog open={showEngagementModal} onOpenChange={setShowEngagementModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Coaching Engagement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={engagementForm.title}
                onChange={(e) => setEngagementForm({ ...engagementForm, title: e.target.value })}
                placeholder="e.g., Leadership Development - John Smith"
              />
            </div>
            
            <div>
              <Label>Coachee Email</Label>
              <Input
                type="email"
                value={engagementForm.coachee_email}
                onChange={(e) => setEngagementForm({ ...engagementForm, coachee_email: e.target.value })}
                placeholder="coachee@company.com"
              />
            </div>
            
            <div>
              <Label>Engagement Type</Label>
              <Select value={engagementForm.engagement_type} onValueChange={(v) => setEngagementForm({ ...engagementForm, engagement_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={engagementForm.start_date}
                  onChange={(e) => setEngagementForm({ ...engagementForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Target End Date</Label>
                <Input
                  type="date"
                  value={engagementForm.target_end_date}
                  onChange={(e) => setEngagementForm({ ...engagementForm, target_end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label>Planned Sessions</Label>
              <Input
                type="number"
                value={engagementForm.total_sessions_planned}
                onChange={(e) => setEngagementForm({ ...engagementForm, total_sessions_planned: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={engagementForm.description}
                onChange={(e) => setEngagementForm({ ...engagementForm, description: e.target.value })}
                placeholder="Goals and objectives for this engagement"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEngagementModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateEngagement}
              disabled={saving || !engagementForm.title || !engagementForm.coachee_email}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Creating...' : 'Create Engagement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Session Modal */}
      <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Coaching Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Session Title</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="e.g., Weekly Check-in"
              />
            </div>
            
            <div>
              <Label>Coachee Email</Label>
              <Input
                type="email"
                value={sessionForm.coachee_email}
                onChange={(e) => setSessionForm({ ...sessionForm, coachee_email: e.target.value })}
                placeholder="coachee@company.com"
              />
            </div>
            
            <div>
              <Label>Session Type</Label>
              <Select value={sessionForm.session_type} onValueChange={(v) => setSessionForm({ ...sessionForm, session_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {engagements.length > 0 && (
              <div>
                <Label>Link to Engagement (optional)</Label>
                <Select value={sessionForm.engagement_id} onValueChange={(v) => setSessionForm({ ...sessionForm, engagement_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {engagements.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={sessionForm.scheduled_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
            
            <div>
              <Label>Location / Meeting Link</Label>
              <Input
                value={sessionForm.location}
                onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                placeholder="Zoom link or room name"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateSession}
              disabled={saving || !sessionForm.coachee_email || !sessionForm.scheduled_date}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Scheduling...' : 'Schedule Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}