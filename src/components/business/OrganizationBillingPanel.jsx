import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Info,
  DollarSign
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function OrganizationBillingPanel({ organization, onClose }) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [organization]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Load plans
      const { data: plansData } = await base44.functions.invoke('stripeGetPlans');
      setPlans(plansData.plans || []);

      // Load subscription if exists
      if (organization.stripe_subscription_id) {
        try {
          const { data: subData } = await base44.functions.invoke('stripeGetClientSubscription', {
            client_id: organization.id
          });
          setSubscription(subData.subscription);
        } catch (error) {
          console.warn('No subscription found:', error);
          setSubscription(null);
        }
      } else {
        setSubscription(null);
      }

      // Load invoices if customer exists
      if (organization.stripe_customer_id) {
        try {
          const { data: invoicesData } = await base44.functions.invoke('stripeGetClientInvoices', {
            client_id: organization.id
          });
          setInvoices(invoicesData.invoices || []);
        } catch (error) {
          console.warn('No invoices found:', error);
          setInvoices([]);
        }
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (priceId, mode) => {
    setCreatingCheckout(true);
    try {
      // Ensure customer exists
      await base44.functions.invoke('stripeCreateClientCustomer', {
        client_id: organization.id
      });

      // Create checkout session
      const { data } = await base44.functions.invoke('stripeCreateClientCheckout', {
        client_id: organization.id,
        price_id: priceId,
        mode: mode
      });

      // Redirect to Stripe Checkout
      window.open(data.url, '_blank');
      toast.success('Opening Stripe Checkout in new tab...');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setCreatingCheckout(false);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="max-w-4xl w-full mx-4">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading billing information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full my-8"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  Billing Management - {organization.name}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage subscriptions and billing for this client
                </p>
              </div>
              <Button variant="ghost" onClick={onClose}>✕</Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Organization Summary */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">
                    ${(organization.annual_contract_value || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-700">Annual Contract Value</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">{organization.license_count}</p>
                  <p className="text-xs text-green-700">Licensed Seats</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-900">{organization.seats_used || 0}</p>
                  <p className="text-xs text-purple-700">Seats Used</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  {getStatusBadge(subscription?.status || organization.status)}
                  <p className="text-xs text-orange-700 mt-2">Subscription Status</p>
                </CardContent>
              </Card>
            </div>

            {/* Current Subscription */}
            {subscription && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Active Subscription</CardTitle>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Process New Payment */}
            {!subscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available Plans</CardTitle>
                  <p className="text-sm text-gray-600">
                    Select a plan to process payment for {organization.name}
                  </p>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      <strong>Note:</strong> Payment will be processed via Stripe Checkout in a new tab.
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  {price.type === 'recurring' ? 'Subscribe' : 'Purchase'}
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
            )}

            {/* Billing History */}
            {invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
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
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}