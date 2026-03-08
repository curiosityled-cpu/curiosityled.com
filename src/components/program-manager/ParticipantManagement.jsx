import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, UserPlus, UserMinus, Search, Filter, Mail, 
  CheckCircle, Clock, AlertTriangle, TrendingUp, 
  GraduationCap, Award, Target, BookOpen, Eye, Upload, Download,
  MoreHorizontal, Send, UserCheck, Loader2, LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ENROLLMENT_STATUS_COLORS = {
  enrolled: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  waitlisted: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  withdrawn: 'bg-gray-100 text-gray-800'
};

const DISENROLLMENT_REASONS = [
  { id: 'completed', label: 'Successfully Completed' },
  { id: 'voluntary', label: 'Voluntary Withdrawal' },
  { id: 'transfer', label: 'Transferred to Another Program' },
  { id: 'performance', label: 'Performance Issues' },
  { id: 'no_show', label: 'No Show / Non-Participation' },
  { id: 'scheduling', label: 'Scheduling Conflicts' },
  { id: 'other', label: 'Other' }
];

export default function ParticipantManagement() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Entity selection
  const [selectedEntityType, setSelectedEntityType] = useState('program');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // Data
  const [programs, setPrograms] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [certificates, setCertificates] = useState([]);

  // Modals
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDisenrollModal, setShowDisenrollModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // Enrollment
  const [enrollmentMethod, setEnrollmentMethod] = useState('manual');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [bulkCsvData, setBulkCsvData] = useState('');

  // Disenrollment
  const [userToDisenroll, setUserToDisenroll] = useState(null);
  const [disenrollReason, setDisenrollReason] = useState('');
  const [disenrollNotes, setDisenrollNotes] = useState('');
  const [selectedForBulk, setSelectedForBulk] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntityId) {
      loadParticipants();
    }
  }, [selectedEntityId, selectedEntityType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, cohortsData, classesData, journeysData, usersData, engagementsData, certificatesData] = await Promise.all([
        base44.entities.Program.filter({
          $or: [
            { manager_emails: { $in: [user.email] } },
            { primary_manager_email: user.email }
          ]
        }),
        base44.entities.Cohort.filter({
          $or: [
            { facilitator_emails: { $in: [user.email] } },
            { primary_facilitator_email: user.email }
          ]
        }),
        base44.entities.Class.filter({ facilitator_email: user.email }),
        base44.entities.LearningJourney.list(),
        base44.entities.User.list(),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }),
        base44.entities.Certificate.filter({ issued_by_email: user.email })
      ]);

      setPrograms(programsData);
      setCohorts(cohortsData);
      setClasses(classesData);
      setJourneys(journeysData);
      setAllUsers(usersData);
      setEngagements(engagementsData);
      setCertificates(certificatesData);

      // Set default entity
      if (programsData.length > 0) {
        setSelectedEntityId(programsData[0].id);
        setSelectedEntityType('program');
      } else if (cohortsData.length > 0) {
        setSelectedEntityId(cohortsData[0].id);
        setSelectedEntityType('cohort');
      } else if (classesData.length > 0) {
        setSelectedEntityId(classesData[0].id);
        setSelectedEntityType('class');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!selectedEntityId) return;

    try {
      let entity;
      let participantEmails = [];

      switch (selectedEntityType) {
        case 'program':
          entity = programs.find(p => p.id === selectedEntityId);
          participantEmails = entity?.participant_emails || [];
          break;
        case 'cohort':
          entity = cohorts.find(c => c.id === selectedEntityId);
          participantEmails = entity?.participant_emails || [];
          break;
        case 'class':
          entity = classes.find(c => c.id === selectedEntityId);
          participantEmails = [...(entity?.enrolled_emails || []), ...(entity?.waitlist_emails || [])];
          break;
        case 'journey':
          const journeyEnrollments = await base44.entities.JourneyEnrollment.filter({
            journey_id: selectedEntityId
          });
          participantEmails = journeyEnrollments.map(e => e.user_email);
          break;
      }

      // Build rich participant data
      const participantList = participantEmails.map(email => {
        const userData = allUsers.find(u => u.email === email);
        const userEngagements = engagements.filter(e => e.coachee_email === email);
        const userCertificates = certificates.filter(c => c.user_email === email);
        const isWaitlisted = selectedEntityType === 'class' && entity?.waitlist_emails?.includes(email);

        return {
          email,
          name: userData?.full_name || email,
          department: userData?.department || '-',
          role: userData?.title || userData?.app_role || '-',
          status: isWaitlisted ? 'waitlisted' : 'enrolled',
          enrolledDate: userData?.created_date || new Date().toISOString(),
          engagements: userEngagements,
          certificates: userCertificates,
          activeEngagements: userEngagements.filter(e => e.status === 'active').length,
          completedEngagements: userEngagements.filter(e => e.status === 'completed').length,
          isAtRisk: userEngagements.some(e => e.risk_level === 'high'),
          certificateCount: userCertificates.length
        };
      });

      setParticipants(participantList);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const getSelectedEntity = () => {
    switch (selectedEntityType) {
      case 'program': return programs.find(p => p.id === selectedEntityId);
      case 'cohort': return cohorts.find(c => c.id === selectedEntityId);
      case 'class': return classes.find(c => c.id === selectedEntityId);
      case 'journey': return journeys.find(j => j.id === selectedEntityId);
      default: return null;
    }
  };

  const handleEnroll = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setSaving(true);
    try {
      const entity = getSelectedEntity();
      const newEmails = selectedUsers.map(u => u.email);

      switch (selectedEntityType) {
        case 'program':
          await base44.entities.Program.update(selectedEntityId, {
            participant_emails: [...new Set([...(entity.participant_emails || []), ...newEmails])]
          });
          break;
        case 'cohort':
          await base44.entities.Cohort.update(selectedEntityId, {
            participant_emails: [...new Set([...(entity.participant_emails || []), ...newEmails])]
          });
          break;
        case 'class':
          const currentEnrolled = entity.enrolled_emails || [];
          const maxCapacity = entity.max_capacity || Infinity;
          const availableSpots = maxCapacity - currentEnrolled.length;
          
          if (availableSpots >= newEmails.length) {
            await base44.entities.Class.update(selectedEntityId, {
              enrolled_emails: [...new Set([...currentEnrolled, ...newEmails])]
            });
          } else {
            const toEnroll = newEmails.slice(0, availableSpots);
            const toWaitlist = newEmails.slice(availableSpots);
            await base44.entities.Class.update(selectedEntityId, {
              enrolled_emails: [...new Set([...currentEnrolled, ...toEnroll])],
              waitlist_emails: [...new Set([...(entity.waitlist_emails || []), ...toWaitlist])]
            });
            if (toWaitlist.length > 0) toast.info(`${toWaitlist.length} added to waitlist`);
          }
          break;
        case 'journey':
          for (const email of newEmails) {
            await base44.entities.JourneyEnrollment.create({
              journey_id: selectedEntityId,
              user_email: email,
              status: 'not_started',
              enrolled_date: new Date().toISOString(),
              enrolled_by: user.email
            });
          }
          break;
      }

      toast.success(`Enrolled ${newEmails.length} participant(s)`);
      setShowEnrollModal(false);
      setSelectedUsers([]);
      loadData();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkCsvData.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setSaving(true);
    try {
      const lines = bulkCsvData.trim().split('\n');
      const emails = lines.map(line => line.split(',')[0].trim().toLowerCase())
        .filter(email => email && email.includes('@'));

      if (emails.length === 0) {
        toast.error('No valid emails found');
        return;
      }

      const entity = getSelectedEntity();

      switch (selectedEntityType) {
        case 'program':
          await base44.entities.Program.update(selectedEntityId, {
            participant_emails: [...new Set([...(entity.participant_emails || []), ...emails])]
          });
          break;
        case 'cohort':
          await base44.entities.Cohort.update(selectedEntityId, {
            participant_emails: [...new Set([...(entity.participant_emails || []), ...emails])]
          });
          break;
        case 'class':
          await base44.entities.Class.update(selectedEntityId, {
            enrolled_emails: [...new Set([...(entity.enrolled_emails || []), ...emails])]
          });
          break;
        case 'journey':
          for (const email of emails) {
            await base44.entities.JourneyEnrollment.create({
              journey_id: selectedEntityId,
              user_email: email,
              status: 'not_started',
              enrolled_date: new Date().toISOString(),
              enrolled_by: user.email
            });
          }
          break;
      }

      toast.success(`Enrolled ${emails.length} participant(s)`);
      setShowEnrollModal(false);
      setBulkCsvData('');
      loadData();
    } catch (error) {
      console.error('Error bulk uploading:', error);
      toast.error('Failed to process CSV');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!inviteEmails.trim()) {
      toast.error('Please enter email addresses');
      return;
    }

    setSaving(true);
    try {
      const emails = inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e && e.includes('@'));
      const entity = getSelectedEntity();

      for (const email of emails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You're invited to enroll in ${entity?.name || entity?.title}`,
          body: `<h2>Enrollment Invitation</h2>
            <p>${inviteMessage || `You have been invited to enroll in ${entity?.name || entity?.title}.`}</p>
            <p>Please log in to complete your enrollment.</p>
            <p>Best regards,<br/>${user.full_name || 'Program Manager'}</p>`
        });
      }

      toast.success(`Invitations sent to ${emails.length} recipient(s)`);
      setShowEnrollModal(false);
      setInviteEmails('');
      setInviteMessage('');
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
    } finally {
      setSaving(false);
    }
  };

  const handleDisenroll = async () => {
    if (!userToDisenroll && selectedForBulk.length === 0) {
      toast.error('No participants selected');
      return;
    }

    setSaving(true);
    try {
      const entity = getSelectedEntity();
      const emailsToRemove = selectedForBulk.length > 0 ? selectedForBulk : [userToDisenroll.email];

      switch (selectedEntityType) {
        case 'program':
          await base44.entities.Program.update(selectedEntityId, {
            participant_emails: (entity.participant_emails || []).filter(e => !emailsToRemove.includes(e))
          });
          break;
        case 'cohort':
          await base44.entities.Cohort.update(selectedEntityId, {
            participant_emails: (entity.participant_emails || []).filter(e => !emailsToRemove.includes(e))
          });
          break;
        case 'class':
          await base44.entities.Class.update(selectedEntityId, {
            enrolled_emails: (entity.enrolled_emails || []).filter(e => !emailsToRemove.includes(e)),
            waitlist_emails: (entity.waitlist_emails || []).filter(e => !emailsToRemove.includes(e))
          });
          break;
        case 'journey':
          const journeyEnrollments = await base44.entities.JourneyEnrollment.filter({
            journey_id: selectedEntityId,
            user_email: { $in: emailsToRemove }
          });
          for (const enrollment of journeyEnrollments) {
            await base44.entities.JourneyEnrollment.update(enrollment.id, {
              status: 'withdrawn',
              withdrawal_reason: disenrollReason,
              withdrawal_notes: disenrollNotes,
              withdrawn_date: new Date().toISOString()
            });
          }
          break;
      }

      toast.success(`Disenrolled ${emailsToRemove.length} participant(s)`);
      setShowDisenrollModal(false);
      setUserToDisenroll(null);
      setSelectedForBulk([]);
      setDisenrollReason('');
      setDisenrollNotes('');
      loadData();
    } catch (error) {
      console.error('Error disenrolling:', error);
      toast.error('Failed to disenroll');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveFromWaitlist = async (email) => {
    if (selectedEntityType !== 'class') return;

    setSaving(true);
    try {
      const entity = getSelectedEntity();
      await base44.entities.Class.update(selectedEntityId, {
        enrolled_emails: [...new Set([...(entity.enrolled_emails || []), email])],
        waitlist_emails: (entity.waitlist_emails || []).filter(e => e !== email)
      });
      toast.success('Moved from waitlist');
      loadData();
    } catch (error) {
      console.error('Error moving from waitlist:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const exportParticipants = () => {
    const entity = getSelectedEntity();
    const csvContent = [
      ['Name', 'Email', 'Status', 'Department', 'Role', 'Active Coaching', 'Certificates'].join(','),
      ...filteredParticipants.map(p => [
        p.name, p.email, p.status, p.department, p.role, p.activeEngagements, p.certificateCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity?.name || entity?.title || 'participants'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'at-risk' ? p.isAtRisk : p.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: participants.length,
    enrolled: participants.filter(p => p.status === 'enrolled').length,
    waitlisted: participants.filter(p => p.status === 'waitlisted').length,
    atRisk: participants.filter(p => p.isAtRisk).length
  };

  const availableUsersForEnroll = allUsers.filter(u => !participants.some(p => p.email === u.email));

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
          <h2 className="text-2xl font-bold text-gray-900">Participant Management</h2>
          <p className="text-gray-600">Manage enrollment and track participant progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportParticipants} disabled={participants.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
          <Button onClick={() => setShowEnrollModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />Enroll
          </Button>
        </div>
      </div>

      {/* Entity Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={selectedEntityType} onValueChange={(v) => { setSelectedEntityType(v); setSelectedEntityId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Programs</SelectItem>
                  <SelectItem value="cohort">Cohorts</SelectItem>
                  <SelectItem value="class">Classes</SelectItem>
                  <SelectItem value="journey">Learning Journeys</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-500">Select {selectedEntityType}</Label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger><SelectValue placeholder={`Choose a ${selectedEntityType}...`} /></SelectTrigger>
                <SelectContent>
                  {selectedEntityType === 'program' && programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  {selectedEntityType === 'cohort' && cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {selectedEntityType === 'class' && classes.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  {selectedEntityType === 'journey' && journeys.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEntityId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
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
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enrolled}</p>
                  <p className="text-sm text-gray-600">Enrolled</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.waitlisted}</p>
                  <p className="text-sm text-gray-600">Waitlisted</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.atRisk}</p>
                  <p className="text-sm text-gray-600">At Risk</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
                <List className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedForBulk.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-800">{selectedForBulk.length} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedForBulk([])}>Clear</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDisenrollModal(true)}>
                  <UserMinus className="w-4 h-4 mr-1" />Disenroll
                </Button>
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedForBulk.length === filteredParticipants.length && filteredParticipants.length > 0}
                          onCheckedChange={(checked) => setSelectedForBulk(checked ? filteredParticipants.map(p => p.email) : [])}
                        />
                      </TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Coaching</TableHead>
                      <TableHead>Certificates</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((p) => (
                      <TableRow key={p.email}>
                        <TableCell>
                          <Checkbox
                            checked={selectedForBulk.includes(p.email)}
                            onCheckedChange={(checked) => setSelectedForBulk(checked ? [...selectedForBulk, p.email] : selectedForBulk.filter(e => e !== p.email))}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-gray-500">{p.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge className={ENROLLMENT_STATUS_COLORS[p.status]}>{p.status}</Badge>
                            {p.isAtRisk && <Badge className="bg-red-100 text-red-700">At Risk</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{p.department}</TableCell>
                        <TableCell>
                          {p.activeEngagements > 0 ? (
                            <Badge variant="outline" className="bg-green-50">
                              <Target className="w-3 h-3 mr-1" />{p.activeEngagements} active
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {p.certificateCount > 0 ? (
                            <Badge variant="outline" className="bg-amber-50">
                              <Award className="w-3 h-3 mr-1" />{p.certificateCount}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedParticipant(p); setShowDetailModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" />View Details
                              </DropdownMenuItem>
                              {p.status === 'waitlisted' && (
                                <DropdownMenuItem onClick={() => handleMoveFromWaitlist(p.email)}>
                                  <UserCheck className="w-4 h-4 mr-2" />Move to Enrolled
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => { setUserToDisenroll(p); setShowDisenrollModal(true); }}>
                                <UserMinus className="w-4 h-4 mr-2" />Disenroll
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredParticipants.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No participants found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredParticipants.map((p) => (
                  <motion.div key={p.email} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedForBulk.includes(p.email)}
                              onCheckedChange={(checked) => setSelectedForBulk(checked ? [...selectedForBulk, p.email] : selectedForBulk.filter(e => e !== p.email))}
                            />
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{p.name}</h4>
                              <p className="text-sm text-gray-500">{p.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={ENROLLMENT_STATUS_COLORS[p.status]}>{p.status}</Badge>
                                {p.isAtRisk && <Badge className="bg-red-100 text-red-700">At Risk</Badge>}
                                {p.activeEngagements > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Target className="w-3 h-3 mr-1" />{p.activeEngagements} coaching
                                  </Badge>
                                )}
                                {p.certificateCount > 0 && (
                                  <Badge variant="outline" className="text-xs bg-amber-50">
                                    <Award className="w-3 h-3 mr-1" />{p.certificateCount} cert{p.certificateCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedParticipant(p); setShowDetailModal(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {p.status === 'waitlisted' && (
                                  <DropdownMenuItem onClick={() => handleMoveFromWaitlist(p.email)}>
                                    <UserCheck className="w-4 h-4 mr-2" />Move to Enrolled
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-600" onClick={() => { setUserToDisenroll(p); setShowDisenrollModal(true); }}>
                                  <UserMinus className="w-4 h-4 mr-2" />Disenroll
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredParticipants.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants found</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Enroll Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enroll Participants</DialogTitle>
            <DialogDescription>Add participants to {getSelectedEntity()?.name || getSelectedEntity()?.title || 'this program'}</DialogDescription>
          </DialogHeader>

          <Tabs value={enrollmentMethod} onValueChange={setEnrollmentMethod}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="manual"><UserPlus className="w-4 h-4 mr-1" />Select Users</TabsTrigger>
              <TabsTrigger value="bulk"><Upload className="w-4 h-4 mr-1" />Bulk CSV</TabsTrigger>
              <TabsTrigger value="invite"><Mail className="w-4 h-4 mr-1" />Send Invite</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <Label>Select Users ({selectedUsers.length} selected)</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto mt-2">
                {availableUsersForEnroll.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">All users are already enrolled</p>
                ) : (
                  availableUsersForEnroll.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                      <Checkbox
                        checked={selectedUsers.some(s => s.email === u.email)}
                        onCheckedChange={(checked) => setSelectedUsers(checked ? [...selectedUsers, u] : selectedUsers.filter(s => s.email !== u.email))}
                      />
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="mt-4">
              <Label>Paste CSV Data (emails in first column)</Label>
              <Textarea
                placeholder="email@example.com&#10;another@example.com"
                value={bulkCsvData}
                onChange={(e) => setBulkCsvData(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </TabsContent>

            <TabsContent value="invite" className="mt-4 space-y-4">
              <div>
                <Label>Email Addresses (comma or newline separated)</Label>
                <Textarea
                  placeholder="email@example.com, another@example.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  placeholder="Add a personalized message..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
            {enrollmentMethod === 'manual' && (
              <Button onClick={handleEnroll} disabled={saving || selectedUsers.length === 0}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enroll {selectedUsers.length}
              </Button>
            )}
            {enrollmentMethod === 'bulk' && (
              <Button onClick={handleBulkUpload} disabled={saving || !bulkCsvData.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Process CSV
              </Button>
            )}
            {enrollmentMethod === 'invite' && (
              <Button onClick={handleSendInvitations} disabled={saving || !inviteEmails.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Send className="w-4 h-4 mr-2" />Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disenroll Modal */}
      <Dialog open={showDisenrollModal} onOpenChange={setShowDisenrollModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />Confirm Disenrollment
            </DialogTitle>
            <DialogDescription>
              {selectedForBulk.length > 0 
                ? `Disenrolling ${selectedForBulk.length} participant(s).`
                : `Disenrolling ${userToDisenroll?.name || userToDisenroll?.email}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Select value={disenrollReason} onValueChange={setDisenrollReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {DISENROLLMENT_REASONS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={disenrollNotes}
                onChange={(e) => setDisenrollNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisenrollModal(false); setUserToDisenroll(null); setSelectedForBulk([]); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisenroll} disabled={saving || !disenrollReason}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participant Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Participant Details</DialogTitle>
          </DialogHeader>
          
          {selectedParticipant && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedParticipant.name}</h3>
                  <p className="text-gray-500">{selectedParticipant.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className={ENROLLMENT_STATUS_COLORS[selectedParticipant.status]}>{selectedParticipant.status}</Badge>
                    {selectedParticipant.isAtRisk && <Badge className="bg-red-100 text-red-700">At Risk</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedParticipant.department}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{selectedParticipant.role}</p>
                </div>
              </div>

              {selectedParticipant.engagements.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Coaching Engagements</h4>
                  <div className="space-y-2">
                    {selectedParticipant.engagements.map(e => (
                      <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{e.title}</span>
                            <p className="text-xs text-gray-500">{e.engagement_type?.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={e.status === 'active' ? 'bg-green-100 text-green-700' : e.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                              {e.status}
                            </Badge>
                            {e.risk_level === 'high' && <Badge className="bg-red-100 text-red-700">High Risk</Badge>}
                          </div>
                        </div>
                        {e.overall_progress > 0 && (
                          <div className="mt-2">
                            <Progress value={e.overall_progress} className="h-2" />
                            <span className="text-xs text-gray-500">{e.overall_progress}% complete</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedParticipant.certificates.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2"><Award className="w-4 h-4" /> Certificates</h4>
                  <div className="space-y-2">
                    {selectedParticipant.certificates.map(c => (
                      <div key={c.id} className="p-3 bg-amber-50 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-medium">{c.title}</span>
                          <p className="text-xs text-gray-500">Issued {format(new Date(c.issued_date), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">{c.certificate_type?.replace(/_/g, ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}