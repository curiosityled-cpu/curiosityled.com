import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ArrowLeft,
  CreditCard,
  Paintbrush,
  Loader2,
  Edit,
  Trash2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import ClientModal from "../components/business/ClientModal";
import PartnerModal from "../components/business/PartnerModal";
import ClientBillingPanel from "../components/business/ClientBillingPanel";
import ClientUsersPanel from "../components/business/ClientUsersPanel";
import PageHeader from "@/components/common/PageHeader";
import CommissionManagement from "../components/business/CommissionManagement"; // NEW IMPORT
import CommissionReporting from "../components/business/CommissionReporting";

function BusinessManager() {
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalPartners: 0
  });
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [selectedClientForBilling, setSelectedClientForBilling] = useState(null);
  const [selectedClientForUsers, setSelectedClientForUsers] = useState(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [clientsResponse, partnersResponse, usersData, brandingConfigs] = await Promise.all([
        base44.functions.invoke('listClients').catch(err => {
          console.error('Error loading clients:', err);
          return { data: { clients: [] } };
        }),
        base44.functions.invoke('listPartners').catch(err => {
          console.error('Error loading partners:', err);
          return { data: { partners: [] } };
        }),
        base44.entities.User.list().catch(err => {
          console.error('Error loading users:', err);
          return [];
        }),
        base44.entities.BrandingConfiguration.list().catch(err => {
          console.error('Error loading branding configs:', err);
          return [];
        })
      ]);

      const clientsData = clientsResponse.data?.clients || [];
      const partnersData = partnersResponse.data?.partners || [];

      // Add branding flags to clients and partners
      const clientsWithBranding = clientsData.map(client => ({
        ...client,
        has_custom_branding: brandingConfigs.some(b => b.client_id === client.id && b.is_active)
      }));

      const partnersWithBranding = partnersData.map(partner => ({
        ...partner,
        has_custom_branding: brandingConfigs.some(b => b.partner_id === partner.id && b.is_active)
      }));

      setClients(clientsWithBranding);
      setPartners(partnersWithBranding);

      // Calculate stats
      const activeClients = clientsData.filter(c => c.status === 'active').length;
      const totalRevenue = clientsData.reduce((sum, client) => sum + (client.annual_contract_value || 0), 0);

      setStats({
        totalClients: clientsData.length,
        activeClients,
        totalUsers: usersData.length,
        totalRevenue,
        totalPartners: partnersData.length
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load business data');
    } finally {
      if (!isRefresh) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setShowPartnerModal(true);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleClosePartnerModal = () => {
    setShowPartnerModal(false);
    setEditingPartner(null);
  };

  const handleManageBilling = (client) => {
    setSelectedClientForBilling(client);
    setShowBillingPanel(true);
  };

  const handleManageUsers = (client) => {
    setSelectedClientForUsers(client);
    setShowUsersPanel(true);
  };

  // New function for branding configuration
  const handleConfigureBranding = (client) => {
    window.location.href = `${createPageUrl('WhiteLabel')}?client_id=${client.id}`;
  };

  const handleConfigurePartnerBranding = (partner) => {
    window.location.href = `${createPageUrl('WhiteLabel')}?partner_id=${partner.id}`;
  };

  const handleDeleteClient = async (client) => {
    if (confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
      try {
        await base44.functions.invoke('deleteClient', { clientId: client.id });
        toast.success('Client deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast.error('Failed to delete client');
      }
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Business Manager Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Summary'],
        ['Total Clients', clients.length],
        ['Active Clients', clients.filter(c => c.status === 'active').length],
        ['Total Partners', partners.length],
        ['Active Partners', partners.filter(p => p.status === 'active').length],
        [''],
        ['Clients'],
        ['Name', 'Status', 'Type', 'Users', 'Contract Start', 'Contract End'],
        ...clients.map(c => [
          c.name,
          c.status,
          c.type,
          c.seats_used || 0,
          c.contract_start_date ? new Date(c.contract_start_date).toLocaleDateString() : '',
          c.contract_end_date ? new Date(c.contract_end_date).toLocaleDateString() : ''
        ]),
        [''],
        ['Partners'],
        ['Name', 'Type', 'Status', 'Clients', 'Commission Rate'],
        ...partners.map(p => [
          p.name,
          p.type,
          p.status,
          p.client_count || 0,
          `${p.commission_rate || 0}%`
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-manager-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { data } = await base44.functions.invoke('exportBusinessManagerPDF', {
        clients: clients,
        partners: partners
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-manager-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading business manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <PageHeader
          title="Business Manager"
          subtitle="Manage organizations, partners, and business operations"
          icon={Building2}
        />

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <Badge variant="outline">{stats.activeClients}/{stats.totalClients}</Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-xs text-gray-600">Total Clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-xs text-gray-600">Total Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${(stats.totalRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-600">Annual Revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPartners}</p>
              <p className="text-xs text-gray-600">Partners</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(stats.totalUsers / (stats.activeClients || 1))}
              </p>
              <p className="text-xs text-gray-600">Avg Users/Client</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-4 max-w-4xl">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Customer Clients</CardTitle>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowClientModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Client
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
                      Create your first customer client to get started
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowClientModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Client
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
                              {client.type === 'partner_client' && (
                                <Badge variant="outline">Partner Client</Badge>
                              )}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleManageUsers(client)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  Users
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageBilling(client)}>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Billing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleConfigureBranding(client)}>
                                  <Paintbrush className="w-4 h-4 mr-2" />
                                  Branding
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleDeleteClient(client);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Partners & Resellers</CardTitle>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => setShowPartnerModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Partner
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Partners Yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Add partners to expand your reach through resellers and consultants
                    </p>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => setShowPartnerModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Partner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partners.map((partner, index) => (
                      <motion.div
                        key={partner.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{partner.name}</h3>
                              <Badge className={
                                partner.status === 'active' ? 'bg-green-100 text-green-800' :
                                partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {partner.status}
                              </Badge>
                              <Badge variant="outline">{partner.type}</Badge>
                              {partner.has_custom_branding && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Paintbrush className="w-3 h-3 mr-1" />
                                  Custom Branding
                                </Badge>
                              )}
                            </div>
                            <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Contact:</span> {partner.contact_name}
                              </div>
                              <div>
                                <span className="font-medium">Clients:</span> {partner.client_count || 0}
                              </div>
                              <div>
                                <span className="font-medium">Commission:</span> {partner.commission_rate}%
                              </div>
                              <div>
                                <span className="font-medium">Revenue:</span> ${(partner.total_revenue_generated || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfigurePartnerBranding(partner)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                            >
                              <Paintbrush className="w-4 h-4 mr-2" />
                              Branding
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPartner(partner)}
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

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="mt-6">
            <CommissionManagement />
          </TabsContent>

          {/* Reporting Tab */}
          <TabsContent value="reporting" className="mt-6">
            <CommissionReporting />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showClientModal && (
        <ClientModal
          client={editingClient}
          onClose={handleCloseClientModal}
          onSuccess={loadData}
        />
      )}

      {showPartnerModal && (
        <PartnerModal
          partner={editingPartner}
          onClose={handleClosePartnerModal}
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

export default withAuthProtection(BusinessManager, ['Platform Admin']);