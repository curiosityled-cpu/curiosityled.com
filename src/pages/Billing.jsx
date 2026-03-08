
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Shield,
  Calendar,
  Info,
  Phone,
  Mail,
  Users,
  Building2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Billing() {
  const { user, isSuperAdmin, isPlatformAdmin, loading: authLoading } = useAuth();
  const { client } = useClient();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadBillingData();
    }
  }, [authLoading, user, isSuperAdmin, isPlatformAdmin]);

  useEffect(() => {
    if (selectedUser) {
      loadUserSubscription(selectedUser);
    } else if (isPlatformAdmin) {
      // If no user is selected for platform admin, clear subscription/invoices
      setSubscription(null);
      setInvoices([]);
    }
  }, [selectedUser]);

  const loadBillingData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: plansData } = await base44.functions.invoke('stripeGetPlans');
      setPlans(plansData.plans || []);

      if (isPlatformAdmin) {
        // Platform Admin: Get all users via backend function
        const { data: usersData } = await base44.functions.invoke('listAllUsers');
        const users = usersData.users || [];
        setAllUsers(users);
        // Attempt to pre-select a user with a client_id, or the first user if none have a client_id
        let initialSelected = users.find(u => u.client_id) || users[0];
        setSelectedUser(initialSelected);

      } else if (isSuperAdmin) {
        // Super Admin: Get users in their client only via backend function
        const { data: usersData } = await base44.functions.invoke('listAllUsers');
        const users = usersData.users || [];
        const clientUsers = users.filter(u => u.client_id === user.client_id);
        setAllUsers(clientUsers);
        setSelectedUser(null); // Super admin directly manages their client's billing, not a specific user's.

        if (user.client_id) {
          try {
            // Fetch client subscription
            const { data: subData } = await base44.functions.invoke('stripeGetClientSubscription', {
              client_id: user.client_id
            });
            setSubscription(subData.subscription);
          } catch (error) {
            console.warn('No client subscription found:', error);
            setSubscription(null);
          }

          try {
            // Fetch client invoices
            const { data: invoicesData } = await base44.functions.invoke('stripeGetClientInvoices', {
              client_id: user.client_id
            });
            setInvoices(invoicesData.invoices || []);
          } catch (error) {
            console.warn('No client invoices found:', error);
            setInvoices([]);
          }
        } else {
            setSubscription(null);
            setInvoices([]);
        }
        
      } else {
        // Regular user
        if (user?.stripe_subscription_id) {
          try {
            const { data: subData } = await base44.functions.invoke('stripeGetSubscription');
            setSubscription(subData.subscription);
          } catch (error) {
            console.warn('No subscription found for regular user:', error);
            setSubscription(null);
          }
        } else {
          setSubscription(null);
        }

        if (user?.stripe_customer_id) {
          try {
            const { data: invoicesData } = await base44.functions.invoke('stripeGetInvoices');
            setInvoices(invoicesData.invoices || []);
          } catch (error) {
            console.warn('No invoices found for regular user:', error);
            setInvoices([]);
          }
        } else {
          setInvoices([]);
        }
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSubscription = async (userData) => {
    if (!userData) {
      setSubscription(null);
      setInvoices([]);
      return;
    }
    
    if (userData.stripe_subscription_id) {
      try {
        const { data: subData } = await base44.functions.invoke('stripeGetSubscriptionForUser', {
          user_id: userData.id
        });
        setSubscription(subData.subscription);
      } catch (error) {
        console.warn('No subscription found for user:', error);
        setSubscription(null);
      }
    } else {
      setSubscription(null);
    }

    if (userData.stripe_customer_id) {
      try {
        const { data: invoicesData } = await base44.functions.invoke('stripeGetInvoicesForUser', {
          user_id: userData.id
        });
        setInvoices(invoicesData.invoices || []);
      } catch (error) {
        console.warn('No invoices found for user:', error);
        setInvoices([]);
      }
    } else {
      setInvoices([]);
    }
  };

  const handleProcessPayment = async (priceId, mode) => {
    let targetUserId, targetClientId;

    if (isPlatformAdmin && selectedUser) {
      targetUserId = selectedUser.id;
      targetClientId = selectedUser.client_id;
    } else if (isSuperAdmin) {
      targetClientId = user.client_id;
      targetUserId = user.id; 
    } else {
      targetUserId = user.id;
      targetClientId = user.client_id;
    }
    
    if (!targetUserId && !targetClientId) {
      toast.error('Could not identify target for payment processing.');
      return;
    }

    setCreatingCheckout(true);
    try {
      if (targetClientId) {
        await base44.functions.invoke('stripeCreateClientCustomer', {
          client_id: targetClientId
        });
      } else {
        await base44.functions.invoke('stripeCreateCustomerForUser', {
          user_id: targetUserId
        });
      }

      const { data } = await base44.functions.invoke('stripeCreateCheckoutSession', {
        price_id: priceId,
        mode: mode,
        user_id: targetUserId,
        client_id: targetClientId
      });

      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
      setCreatingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    let targetUserId, targetClientId;

    if (isPlatformAdmin && selectedUser) {
      targetUserId = selectedUser.id;
      targetClientId = selectedUser.client_id;
    } else if (isSuperAdmin) {
      targetClientId = user.client_id;
      targetUserId = user.id;
    } else {
      targetUserId = user.id;
      targetClientId = user.client_id;
    }
    
    if (!targetUserId && !targetClientId) {
      toast.error('Could not identify target for subscription management.');
      return;
    }

    setOpeningPortal(true);
    try {
      const { data } = await base44.functions.invoke('stripeCreatePortalSession', {
        user_id: targetUserId,
        client_id: targetClientId
      });
      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Failed to open billing portal');
      setOpeningPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    let targetUserId, targetClientId, targetName;

    if (isPlatformAdmin && selectedUser) {
      targetUserId = selectedUser.id;
      targetClientId = selectedUser.client_id;
      targetName = selectedUser.full_name;
    } else if (isSuperAdmin) {
      targetClientId = user.client_id;
      targetUserId = user.id;
      targetName = client?.name || 'your organization';
    } else {
      targetUserId = user.id;
      targetClientId = user.client_id;
      targetName = 'your';
    }
    
    if (!targetUserId && !targetClientId) {
      toast.error('Could not identify target for subscription cancellation.');
      return;
    }

    if (!confirm(`Are you sure you want to cancel the subscription for ${targetName}? Access will be retained until the end of the billing period.`)) {
      return;
    }

    try {
      const { data } = await base44.functions.invoke('stripeCancelSubscription', {
        user_id: targetUserId,
        client_id: targetClientId
      });
      toast.success('Subscription canceled. Access until ' + format(new Date(data.subscription.access_until), 'MMM d, yyyy'));
      
      if (isPlatformAdmin && selectedUser) {
        await loadUserSubscription(selectedUser);
      } else {
        await loadBillingData();
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle2 },
      'trialing': { color: 'bg-blue-100 text-blue-800', label: 'Trial', icon: Clock },
      'past_due': { color: 'bg-red-100 text-red-800', label: 'Past Due', icon: XCircle },
      'canceled': { color: 'bg-gray-100 text-gray-800', label: 'Canceled', icon: XCircle },
      'incomplete': { color: 'bg-yellow-100 text-yellow-800', label: 'Incomplete', icon: Clock },
      'none': { color: 'bg-gray-100 text-gray-800', label: 'No Subscription', icon: XCircle }
    };
    
    const badge = badges[status] || badges['none'];
    const Icon = badge.icon;
    return (
      <Badge className={badge.color}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const formatCurrency = (amount, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Unable to load user data. Please refresh the page.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin && !isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Enterprise Subscription</CardTitle>
                <p className="text-gray-600 mt-2">
                  Curiosity Led offers customized enterprise solutions
                </p>
              </CardHeader>
              <CardContent>
                {user.subscription_status && user.subscription_status !== 'none' && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Your Organization's Subscription</h3>
                      {getStatusBadge(user.subscription_status)}
                    </div>
                    
                    {user.subscription_ends_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {user.subscription_status === 'canceled' ? 'Access until' : 'Renews on'}:{' '}
                          <strong>{format(new Date(user.subscription_ends_at), 'MMMM d, yyyy')}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Ready to Transform Your Leadership Development?
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Our enterprise plans are customized to your organization's size, needs, and goals. 
                      Schedule a consultation with our team to discuss the right solution for you.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all">
                      <CardContent className="p-6 text-center">
                        <Phone className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">Schedule a Call</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Speak with our leadership development experts
                        </p>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open('https://cal.com/curiosityled/discoverycall', '_blank')}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Book Discovery Call
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all">
                      <CardContent className="p-6 text-center">
                        <Mail className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">Email Our Team</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Get a custom quote for your organization
                        </p>
                        <Button 
                          variant="outline"
                          className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                          onClick={() => window.location.href = 'mailto:sales@curiosityled.com'}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Contact Sales
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                      Our Enterprise Plans
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {plans.filter(p => p.name.includes('Small Business')).length > 0 && (
                        <Card className="border-2 border-gray-200">
                          <CardHeader>
                            <CardTitle className="text-lg">Small Business</CardTitle>
                            <p className="text-sm text-gray-600">300 - 800 employees</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Leadership Assessments</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Personalized Development Plans</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>AI Coach Access</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {plans.filter(p => p.name.includes('Mid-Market')).length > 0 && (
                        <Card className="border-2 border-blue-300 shadow-lg">
                          <CardHeader>
                            <Badge className="bg-blue-600 text-white mb-2 w-fit">Popular</Badge>
                            <CardTitle className="text-lg">Mid-Market Business</CardTitle>
                            <p className="text-sm text-gray-600">800 - 1,500 employees</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Everything in Small Business</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Team Analytics Dashboard</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Career Path Planning</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {plans.filter(p => p.name.includes('Enterprise')).length > 0 && (
                        <Card className="border-2 border-purple-300">
                          <CardHeader>
                            <CardTitle className="text-lg">Enterprise</CardTitle>
                            <p className="text-sm text-gray-600">1,500+ employees</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Everything in Mid-Market</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>White-Label Branding</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Dedicated Success Manager</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const clientName = client?.name || 'Organization';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {isPlatformAdmin ? 'Payment Management Portal' : `${clientName} Billing`}
              </h1>
              <p className="text-gray-600">
                {isPlatformAdmin 
                  ? 'Process payments and manage subscriptions for customers' 
                  : 'Manage your organization subscription and billing'}
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-800">
              <Shield className="w-3 h-3 mr-1" />
              {isPlatformAdmin ? 'Platform Admin' : 'Organization Admin'}
            </Badge>
          </div>
        </div>

        {isPlatformAdmin && (
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Select Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedUser?.id || ''}
                onValueChange={(userId) => {
                  const foundUser = allUsers.find(u => u.id === userId);
                  setSelectedUser(foundUser);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.full_name || u.email}</span>
                        <span className="text-xs text-gray-500">({u.email})</span>
                        {u.subscription_status && u.subscription_status !== 'none' && (
                          <Badge className="ml-2 text-xs">{u.subscription_status}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUser && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <p className="font-medium">{selectedUser.full_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <p className="font-medium">{selectedUser.app_role}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium">{getStatusBadge(selectedUser.subscription_status || 'none')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isSuperAdmin && !isPlatformAdmin && (
          <Card className="mb-8 border-2 border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Building2 className="w-6 h-6 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">Organization Subscription</h3>
                  <p className="text-sm text-purple-700">
                    Managing billing and subscription for <strong>{clientName}</strong>. 
                    All payments and invoices are processed at the organization level.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(isPlatformAdmin && selectedUser) || (isSuperAdmin && !isPlatformAdmin) ? (
          <>
            {subscription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Active Subscription</CardTitle>
                      {getStatusBadge(subscription.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          {subscription.product?.name || 'Subscription Plan'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {subscription.product?.description || ''}
                        </p>
                        
                        {subscription.plan && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-blue-600">
                              {formatCurrency(subscription.plan.unit_amount, subscription.plan.currency)}
                            </span>
                            {subscription.plan.recurring && (
                              <span className="text-gray-600">
                                / {subscription.plan.recurring.interval}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {subscription.current_period_end && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">
                              {subscription.cancel_at_period_end ? 'Access until' : 'Renews on'}: {' '}
                              <strong>{format(new Date(subscription.current_period_end * 1000), 'MMM d, yyyy')}</strong>
                            </span>
                          </div>
                        )}

                        {subscription.cancel_at_period_end && (
                          <Alert className="bg-yellow-50 border-yellow-200">
                            <Info className="w-4 h-4 text-yellow-600" />
                            <AlertDescription className="text-sm text-yellow-800">
                              Subscription set to cancel at end of period
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={handleManageSubscription}
                            disabled={openingPortal}
                            variant="outline"
                            className="flex-1"
                          >
                            {openingPortal ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-2" />
                            )}
                            Manage in Stripe
                          </Button>

                          {!subscription.cancel_at_period_end && (
                            <Button
                              onClick={handleCancelSubscription}
                              variant="outline"
                              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Cancel Subscription
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!subscription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Process Payment for Customer</CardTitle>
                    <p className="text-sm text-gray-600">
                      Select a plan and process payment for {isPlatformAdmin && selectedUser ? selectedUser.full_name : clientName}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-6 bg-blue-50 border-blue-200">
                      <Info className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-800">
                        <strong>Note:</strong> After selecting a plan, you'll be redirected to Stripe Checkout to securely process the payment.
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {plans.map((plan) => (
                        <Card key={plan.product_id} className="border-2 hover:border-blue-500 transition-all">
                          <CardHeader>
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            {plan.description && (
                              <p className="text-xs text-gray-600 mt-2">{plan.description}</p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {plan.prices.map((price) => (
                                <div key={price.price_id} className="border-t pt-3">
                                  <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-xl font-bold text-blue-600">
                                      {formatCurrency(price.amount, price.currency)}
                                    </span>
                                    {price.interval && (
                                      <span className="text-gray-600 text-xs">/ {price.interval}</span>
                                    )}
                                  </div>

                                  <Button
                                    onClick={() => handleProcessPayment(price.price_id, price.type === 'recurring' ? 'subscription' : 'payment')}
                                    disabled={creatingCheckout}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                                    size="sm"
                                  >
                                    {creatingCheckout ? (
                                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    ) : (
                                      <CreditCard className="w-3 h-3 mr-2" />
                                    )}
                                    {price.type === 'recurring' ? 'Process Subscription' : 'Process Payment'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {invoices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Payment History</CardTitle>
                    <p className="text-sm text-gray-600">All transactions for {isPlatformAdmin && selectedUser ? selectedUser.full_name : clientName}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              {invoice.status === 'paid' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : invoice.status === 'open' ? (
                                <Clock className="w-5 h-5 text-yellow-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-lg">
                                {formatCurrency(invoice.amount_paid, invoice.currency)}
                              </p>
                              <Badge className={
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {invoice.status}
                              </Badge>
                            </div>

                            {invoice.invoice_pdf && (
                              <a
                                href={invoice.invoice_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Download Invoice PDF"
                              >
                                <Download className="w-4 h-4 text-gray-600" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        ) : isPlatformAdmin ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Customer
              </h3>
              <p className="text-gray-600">
                Choose a customer from the dropdown above to manage their subscription and billing.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Alert className="mt-8">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            <strong>Secure Payment Processing:</strong> All payments are securely processed by Stripe. 
            Payment information is never stored on our servers.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
