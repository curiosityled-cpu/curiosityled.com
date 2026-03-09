import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Route, Plus, Search, MoreHorizontal, Edit, Trash2, Users, 
  Eye, Loader2, CheckCircle, Clock, BookOpen, Play, Pause, Copy, Target, Map
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-slate-100 text-slate-800'
};

export default function JourneysManagement() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('journeys');

  const [journeys, setJourneys] = useState([]);
  const [onboardingPlans, setOnboardingPlans] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [journeysData, enrollmentsData, onboardingData] = await Promise.all([
        base44.entities.LearningJourney.list(),
        base44.entities.JourneyEnrollment.filter({}),
        base44.entities.OnboardingPlan.filter({ is_template: false })
      ]);

      // Enrich journeys with enrollment data
      const enrichedJourneys = journeysData.map(j => {
        const journeyEnrollments = enrollmentsData.filter(e => e.journey_id === j.id);
        return {
          ...j,
          enrollmentCount: journeyEnrollments.length,
          completedCount: journeyEnrollments.filter(e => e.status === 'completed').length,
          inProgressCount: journeyEnrollments.filter(e => e.status === 'in_progress').length,
          avgProgress: journeyEnrollments.length > 0
            ? Math.round(journeyEnrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / journeyEnrollments.length)
            : 0
        };
      });

      setJourneys(enrichedJourneys);
      setOnboardingPlans(onboardingData);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load journeys');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (journey, newStatus) => {
    try {
      await base44.entities.LearningJourney.update(journey.id, { status: newStatus });
      toast.success(`Journey ${newStatus}`);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDuplicate = async (journey) => {
    try {
      const { id, created_date, updated_date, ...journeyData } = journey;
      await base44.entities.LearningJourney.create({
        ...journeyData,
        title: `${journey.title} (Copy)`,
        status: 'draft'
      });
      toast.success('Journey duplicated');
      loadData();
    } catch (error) {
      console.error('Error duplicating journey:', error);
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async (journey) => {
    if (!confirm(`Delete "${journey.title}"? This cannot be undone.`)) return;

    try {
      await base44.entities.LearningJourney.delete(journey.id);
      toast.success('Experience deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast.error('Failed to delete journey');
    }
  };

  const filteredJourneys = journeys.filter(j => {
    const matchesSearch = j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         j.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOnboardingPlans = onboardingPlans.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: journeys.length,
    published: journeys.filter(j => j.status === 'published').length,
    draft: journeys.filter(j => j.status === 'draft').length,
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter(e => e.status === 'in_progress').length,
    onboardingTotal: onboardingPlans.length,
    onboardingActive: onboardingPlans.filter(p => p.status === 'in_progress' || p.status === 'assigned').length
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
          <h2 className="text-2xl font-bold text-gray-900">Journeys & Onboarding</h2>
          <p className="text-gray-600">Create and manage learning experiences and onboarding plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={createPageUrl('OnboardingPlanBuilder')}>
              <Target className="w-4 h-4 mr-2" />New Onboarding Plan
            </Link>
          </Button>
          <Button asChild>
            <Link to={createPageUrl('JourneyBuilder')}>
              <Map className="w-4 h-4 mr-2" />New Journey
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Journeys</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onboardingTotal}</p>
              <p className="text-sm text-gray-600">Onboarding</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-sm text-gray-600">Published</p>
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
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
              <p className="text-sm text-gray-600">Enrollments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeEnrollments + stats.onboardingActive}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="journeys" className="gap-2">
            <Map className="w-4 h-4" />
            Learning Journeys
            <Badge variant="secondary" className="ml-1">{journeys.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <Target className="w-4 h-4" />
            Onboarding Plans
            <Badge variant="secondary" className="ml-1">{onboardingPlans.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journeys" className="mt-6">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search journeys..."
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
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Journeys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredJourneys.map((journey) => (
            <motion.div
              key={journey.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{journey.title}</CardTitle>
                      {journey.estimated_duration && (
                        <CardDescription className="mt-1">
                          {journey.estimated_duration}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedJourney(journey); setShowDetailModal(true); }}>
                          <Eye className="w-4 h-4 mr-2" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`${createPageUrl('JourneyBuilder')}?id=${journey.id}`}>
                            <Edit className="w-4 h-4 mr-2" />Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(journey)}>
                          <Copy className="w-4 h-4 mr-2" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {journey.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(journey, 'published')}>
                            <Play className="w-4 h-4 mr-2" />Publish
                          </DropdownMenuItem>
                        )}
                        {journey.status === 'published' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(journey, 'archived')}>
                            <Pause className="w-4 h-4 mr-2" />Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(journey)}>
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className={STATUS_COLORS[journey.status || 'draft']}>
                      {journey.status || 'draft'}
                    </Badge>

                    {journey.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{journey.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{journey.enrollmentCount} enrolled</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{journey.steps?.length || 0} steps</span>
                      </div>
                    </div>

                    {journey.enrollmentCount > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Avg Progress</span>
                          <span>{journey.avgProgress}%</span>
                        </div>
                        <Progress value={journey.avgProgress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>{journey.inProgressCount} in progress</span>
                          <span>{journey.completedCount} completed</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredJourneys.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Route className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No journeys found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to={createPageUrl('JourneyBuilder')}>Create Your First Journey</Link>
          </Button>
        </div>
      )}
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6">
          {/* Onboarding Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredOnboardingPlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{plan.title}</CardTitle>
                          {plan.target_role && (
                            <CardDescription className="mt-1">
                              {plan.target_role}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl('OnboardingPlanBuilder')}?planId=${plan.id}`}>
                                <Edit className="w-4 h-4 mr-2" />Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl('OnboardingPlanBuilder')}?planId=${plan.id}&duplicate=true`}>
                                <Copy className="w-4 h-4 mr-2" />Duplicate
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Badge className={
                          plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                          plan.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          plan.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {plan.status || 'draft'}
                        </Badge>

                        {plan.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {plan.assigned_to_email && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{plan.assigned_to_email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{plan.duration_days || 90} days</span>
                          </div>
                        </div>

                        {plan.completion_percentage > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{plan.completion_percentage}%</span>
                            </div>
                            <Progress value={plan.completion_percentage} className="h-2" />
                          </div>
                        )}

                        {plan.milestones?.length > 0 && (
                          <div className="text-sm text-gray-500">
                            {plan.milestones.filter(m => m.status === 'completed').length} / {plan.milestones.length} milestones
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredOnboardingPlans.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No onboarding plans found</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to={createPageUrl('OnboardingPlanBuilder')}>Create Your First Onboarding Plan</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJourney?.title || 'Journey Details'}</DialogTitle>
          </DialogHeader>

          {selectedJourney && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={STATUS_COLORS[selectedJourney.status || 'draft']}>
                  {selectedJourney.status || 'draft'}
                </Badge>
                {selectedJourney.difficulty && (
                  <Badge variant="outline">{selectedJourney.difficulty}</Badge>
                )}
              </div>

              {selectedJourney.description && (
                <p className="text-gray-600">{selectedJourney.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Enrolled</p>
                  <p className="text-xl font-bold">{selectedJourney.enrollmentCount}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-xl font-bold">{selectedJourney.inProgressCount}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-xl font-bold">{selectedJourney.completedCount}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg Progress</p>
                  <p className="text-xl font-bold">{selectedJourney.avgProgress}%</p>
                </div>
              </div>

              {selectedJourney.steps?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Journey Steps ({selectedJourney.steps.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedJourney.steps.map((step, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <span className="text-sm">{step.title || step.resource_title || `Step ${i + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJourney.target_competencies?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Target Competencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJourney.target_competencies.map((comp, i) => (
                      <Badge key={i} variant="outline">{comp}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
            <Button asChild>
              <Link to={`${createPageUrl('JourneyBuilder')}?id=${selectedJourney?.id}`}>
                <Edit className="w-4 h-4 mr-2" />Edit Journey
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}