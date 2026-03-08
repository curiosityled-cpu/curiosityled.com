
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  TrendingUp,
  Plus,
  Loader2,
  MoreVertical,
  CreditCard,
  Paintbrush,
  Briefcase, // New icon for page header
  AlertCircle, // New icon for no partner found
  Clock, // New icon for pending commissions
  CheckCircle, // New icon for paid commissions
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // New import for tabs
import { Label } from "@/components/ui/label"; // New import for label
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ClientModal from "../components/business/ClientModal";
import ClientBillingPanel from "../components/business/ClientBillingPanel";
import ClientUsersPanel from "../components/business/ClientUsersPanel";
import { createPageUrl } from "@/utils";
import CommissionDashboard from "../components/partner/CommissionDashboard"; // New import for commission dashboard

function PartnerPortal() {
  const { user, isPartnerBusinessAdmin } = useAuth(); // Destructure isPartnerBusinessAdmin
  const [partner, setPartner] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClientForBilling, setSelectedClientForBilling] = useState(null);
  const [selectedClientForUsers, setSelectedClientForUsers] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // New state for tabs

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.partner_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load partner data
      // Attempt to get directly if available, fallback to filter
      let partnerData = null;
      try {
        partnerData = await base44.entities.Partner.get(user.partner_id);
      } catch (error) {
        if (error.response?.status === 404) {
          // If direct get fails, try filter (e.g., if partner_id is not directly exposed but filter works)
          const partnersList = await base44.entities.Partner.filter({ id: user.partner_id });
          partnerData = partnersList[0] || null;
        } else {
          throw error; // Re-throw other errors
        }
      }
      setPartner(partnerData);

      // Load clients managed by this partner
      const clientsList = await base44.entities.Client.filter({ partner_id: user.partner_id });
      setClients(clientsList || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load partner data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleManageBilling = (client) => {
    setSelectedClientForBilling(client);
    setShowBillingPanel(true);
  };

  const handleManageUsers = (client) => {
    setSelectedClientForUsers(client);
    setShowUsersPanel(true);
  };

  const handleConfigureBranding = (client) => {
    window.location.href = `${createPageUrl('WhiteLabel')}?client_id=${client.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading partner portal...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Partner Access</h2>
            <p className="text-gray-600">
              You don't have access to any partner organization. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalRevenue = partner.total_revenue_generated || 0;
  const pendingCommissions = partner.total_commissions_pending || 0;
  const paidCommissions = partner.total_commissions_paid || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-orange-600" />
            {partner.name}
          </h1>
          <p className="text-gray-600 mt-1">Partner Portal</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                  <p className="text-xs text-gray-600">Active Clients</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(totalRevenue / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">Total Revenue Generated</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(pendingCommissions / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">Pending Commissions</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(paidCommissions / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">Paid Commissions</p>
                </CardContent>
              </Card>
            </div>

            {/* Partner Details */}
            <Card>
              <CardHeader>
                <CardTitle>Partner Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Partner Type</Label>
                    <p className="font-medium capitalize">{partner.type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Status</Label>
                    <Badge className={
                      partner.status === 'active' ? 'bg-green-100 text-green-800' :
                      partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {partner.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Commission Rate</Label>
                    <p className="font-medium">{partner.commission_rate}%</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Payout Schedule</Label>
                    <p className="font-medium capitalize">{partner.payout_schedule || 'Monthly'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Contact Email</Label>
                    <p className="font-medium">{partner.contact_email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Contact Phone</Label>
                    <p className="font-medium">{partner.contact_phone || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            {/* Clients Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Client Organizations</CardTitle>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={handleCreateClient}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Clients Yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Get started by adding your first client organization
                    </p>
                    <Button
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={handleCreateClient}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Client
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clients.map((client, index) => (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{client.name}</h3>
                              <Badge className={
                                client.status === 'active' ? 'bg-green-100 text-green-800' :
                                client.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {client.status}
                              </Badge>
                              {client.has_custom_branding && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Paintbrush className="w-3 h-3 mr-1" />
                                  Custom Branding
                                </Badge>
                              )}
                            </div>
                            <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Contact:</span> {client.contact_name || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Users:</span> {client.seats_used || 0}/{client.license_count}
                              </div>
                              <div>
                                <span className="font-medium">ACV:</span> ${(client.annual_contract_value || 0).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Contract:</span>{' '}
                                {client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfigureBranding(client)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                            >
                              <Paintbrush className="w-4 h-4 mr-2" />
                              Branding
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleManageUsers(client)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Users
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleManageBilling(client)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Billing
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClient(client)}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <CommissionDashboard partnerId={partner?.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showClientModal && (
        <ClientModal
          client={editingClient}
          preselectedPartnerId={user.partner_id}
          onClose={handleCloseClientModal}
          onSuccess={loadData}
        />
      )}

      {showBillingPanel && selectedClientForBilling && (
        <ClientBillingPanel
          client={selectedClientForBilling}
          onClose={() => {
            setShowBillingPanel(false);
            setSelectedClientForBilling(null);
            loadData();
          }}
        />
      )}

      {showUsersPanel && selectedClientForUsers && (
        <ClientUsersPanel
          client={selectedClientForUsers}
          onClose={() => {
            setShowUsersPanel(false);
            setSelectedClientForUsers(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default withAuthProtection(PartnerPortal, ['Partner Administrator', 'Partner Business Administrator']);
