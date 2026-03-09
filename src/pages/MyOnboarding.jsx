import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Rocket, Plus, Eye, Calendar, CheckCircle, Clock, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import OnboardingProgress from "../components/onboarding/OnboardingProgress";

export default function MyOnboarding() {
  const { user, hasRole } = useAuth();
  const [assignedPlans, setAssignedPlans] = useState([]);
  const [managedPlans, setManagedPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-plans");

  const canManagePlans = hasRole(['User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);

  useEffect(() => {
    loadOnboardingPlans();
  }, [user]);

  const loadOnboardingPlans = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      // Load plans assigned to current user
      const myPlans = await base44.entities.OnboardingPlan.filter(
        { assigned_to_email: user.email },
        '-created_date'
      );
      setAssignedPlans(myPlans);

      // If user can manage plans, load those too
      if (canManagePlans) {
        const createdPlans = await base44.entities.OnboardingPlan.filter(
          { assigned_by: user.email },
          '-created_date'
        );
        setManagedPlans(createdPlans);
      }

      // Auto-select first assigned plan if available
      if (myPlans.length > 0) {
        setSelectedPlan(myPlans[0]);
      }
    } catch (error) {
      console.error('Error loading onboarding plans:', error);
      toast.error('Failed to load onboarding plans');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    );
  };

  const getPlanProgress = (plan) => {
    if (!plan.milestones || plan.milestones.length === 0) return 0;
    const completed = plan.milestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / plan.milestones.length) * 100);
  };

  const handlePlanRefresh = () => {
    loadOnboardingPlans();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Rocket className="w-10 h-10 text-blue-600" />
                Onboarding Hub
              </h1>
              <p className="text-gray-600">
                Structured path to success
              </p>
            </div>
            {canManagePlans && (
              <Link to={createPageUrl("OnboardingPlanBuilder")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Build New Plan
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel - Plan List */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">
                  {canManagePlans ? 'All Plans' : 'Plans'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canManagePlans ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="my-plans">Plans</TabsTrigger>
                      <TabsTrigger value="managed">I Manage</TabsTrigger>
                    </TabsList>
                    <TabsContent value="my-plans" className="mt-4">
                      <PlanList 
                        plans={assignedPlans} 
                        selectedPlan={selectedPlan}
                        onSelectPlan={setSelectedPlan}
                        emptyMessage="No onboarding plans assigned to you yet."
                      />
                    </TabsContent>
                    <TabsContent value="managed" className="mt-4">
                      <PlanList 
                        plans={managedPlans}
                        selectedPlan={selectedPlan}
                        onSelectPlan={setSelectedPlan}
                        emptyMessage="You haven't created any plans yet."
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <PlanList 
                    plans={assignedPlans}
                    selectedPlan={selectedPlan}
                    onSelectPlan={setSelectedPlan}
                    emptyMessage="No onboarding plans assigned to you yet."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Plan Details */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedPlan ? (
                <motion.div
                  key={selectedPlan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <OnboardingProgress 
                    planData={selectedPlan}
                    onPlanUpdate={handlePlanRefresh}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-16">
                      <div className="text-center">
                        <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {assignedPlans.length === 0 && managedPlans.length === 0
                            ? 'No Onboarding Plans Yet'
                            : 'Select a Plan to View'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {assignedPlans.length === 0 && managedPlans.length === 0
                            ? canManagePlans 
                              ? 'Create your first onboarding plan to get started'
                              : 'Your onboarding plan will appear here once assigned'
                            : 'Choose a plan from the list to see details and track progress'}
                        </p>
                        {canManagePlans && assignedPlans.length === 0 && managedPlans.length === 0 && (
                          <Link to={createPageUrl("OnboardingPlanBuilder")}>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Plan
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Plan List Component
function PlanList({ plans, selectedPlan, onSelectPlan, emptyMessage }) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const progress = plan.milestones && plan.milestones.length > 0
          ? Math.round((plan.milestones.filter(m => m.status === 'completed').length / plan.milestones.length) * 100)
          : 0;
        
        const isSelected = selectedPlan?.id === plan.id;

        return (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              onClick={() => onSelectPlan(plan)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-blue-50 border-blue-300 shadow-md' 
                  : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm line-clamp-1">{plan.title}</h4>
                <Badge className={
                  plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                  plan.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  plan.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {plan.status}
                </Badge>
              </div>
              
              {plan.target_role && (
                <p className="text-xs text-gray-500 mb-2">{plan.target_role}</p>
              )}
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Calendar className="w-3 h-3" />
                <span>{plan.duration_days} days</span>
              </div>
              
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}