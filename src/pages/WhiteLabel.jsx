
import React, { useState, useEffect } from "react";
import { useBranding } from "@/components/useBranding";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Building2, Info, Briefcase } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import LogoUploader from "@/components/whitelabel/LogoUploader";
import ColorPicker from "@/components/whitelabel/ColorPicker";
import TypographySelector from "@/components/whitelabel/TypographySelector";
import PlatformIdentityEditor from "@/components/whitelabel/PlatformIdentityEditor";
import WelcomeMessageEditor from "@/components/whitelabel/WelcomeMessageEditor";
import TerminologyEditor from "@/components/whitelabel/TerminologyEditor";
import ThemeManager from "@/components/whitelabel/ThemeManager";
import LivePreview from "@/components/whitelabel/LivePreview";
import ChangeHistory from "@/components/whitelabel/ChangeHistory";
import EntitySelector from "@/components/whitelabel/EntitySelector";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

function WhiteLabel() {
  const location = useLocation();
  const { user, isPlatformAdmin, isSuperAdmin, isPartnerBusinessAdmin } = useAuth();
  const { branding } = useBranding();
  const [localBranding, setLocalBranding] = useState(branding || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetClient, setTargetClient] = useState(null);
  const [targetPartner, setTargetPartner] = useState(null);
  const [targetClientId, setTargetClientId] = useState(null);
  const [targetPartnerId, setTargetPartnerId] = useState(null);
  const [editingMode, setEditingMode] = useState('platform'); // 'platform', 'client', or 'partner'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTargetEntity();
  }, [location.search, user]);

  useEffect(() => {
    if (branding) {
      setLocalBranding(branding);
    }
  }, [branding]);

  const loadTargetEntity = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(location.search);
      const clientId = params.get('client_id');
      const partnerId = params.get('partner_id');

      // SCENARIO 1: Editing specific client branding
      if (clientId) {
        if (isPlatformAdmin) {
          try {
            const { data } = await base44.functions.invoke('listClients');
            const client = data.clients?.find(c => c.id === clientId);
            if (client) {
              setTargetClient(client);
              setTargetClientId(clientId);
              setEditingMode('client');
              await loadEntityBranding('client', clientId);
            } else {
              toast.error('Client not found');
            }
          } catch (error) {
            console.error('Error loading client:', error);
            toast.error('Failed to load client information');
          }
        } else if (isSuperAdmin && user.client_id === clientId) {
          try {
            const { data } = await base44.functions.invoke('listClients');
            const client = data.clients?.find(c => c.id === clientId);
            if (client) {
              setTargetClient(client);
              setTargetClientId(clientId);
              setEditingMode('client');
              await loadEntityBranding('client', clientId);
            }
          } catch (error) {
            console.error('Error loading client:', error);
            toast.error('Failed to load client information');
          }
        } else if (isPartnerBusinessAdmin && user.partner_id) {
          try {
            const { data } = await base44.functions.invoke('listClients');
            const client = data.clients?.find(c => c.id === clientId);
            if (client && client.partner_id === user.partner_id) {
              setTargetClient(client);
              setTargetClientId(clientId);
              setEditingMode('client');
              await loadEntityBranding('client', clientId);
            } else {
              toast.error('Unauthorized to edit this client');
            }
          } catch (error) {
            console.error('Error loading client:', error);
            toast.error('Failed to load client information');
          }
        } else {
          toast.error('Unauthorized to edit this client');
        }
      }
      // SCENARIO 2: Editing specific partner branding
      else if (partnerId) {
        if (isPlatformAdmin) {
          try {
            const { data } = await base44.functions.invoke('listPartners');
            const partner = data.partners?.find(p => p.id === partnerId);
            if (partner) {
              setTargetPartner(partner);
              setTargetPartnerId(partnerId);
              setEditingMode('partner');
              await loadEntityBranding('partner', partnerId);
            } else {
              toast.error('Partner not found');
            }
          } catch (error) {
            console.error('Error loading partner:', error);
            toast.error('Failed to load partner information');
          }
        } else if (isPartnerBusinessAdmin && user.partner_id === partnerId) {
          try {
            const { data } = await base44.functions.invoke('listPartners');
            const partner = data.partners?.find(p => p.id === partnerId);
            if (partner) {
              setTargetPartner(partner);
              setTargetPartnerId(partnerId);
              setEditingMode('partner');
              await loadEntityBranding('partner', partnerId);
            }
          } catch (error) {
            console.error('Error loading partner:', error);
            toast.error('Failed to load partner information');
          }
        } else {
          toast.error('Unauthorized to edit this partner');
        }
      }
      // SCENARIO 3: No URL parameters - default behavior
      else {
        if (isPlatformAdmin) {
          setEditingMode('platform');
          await loadEntityBranding('platform', null);
        } else if (isSuperAdmin && user.client_id) {
          try {
            const { data } = await base44.functions.invoke('listClients');
            const client = data.clients?.find(c => c.id === user.client_id);
            if (client) {
              setTargetClient(client);
              setTargetClientId(user.client_id);
              setEditingMode('client');
              await loadEntityBranding('client', user.client_id);
            }
          } catch (error) {
            console.error('Error loading client:', error);
            toast.error('Failed to load client information');
          }
        } else if (isPartnerBusinessAdmin && user.partner_id) {
          try {
            const { data } = await base44.functions.invoke('listPartners');
            const partner = data.partners?.find(p => p.id === user.partner_id);
            if (partner) {
              setTargetPartner(partner);
              setTargetPartnerId(user.partner_id);
              setEditingMode('partner');
              await loadEntityBranding('partner', user.partner_id);
            }
          } catch (error) {
            console.error('Error loading partner:', error);
            toast.error('Failed to load partner information');
          }
        }
      }
    } catch (error) {
      console.error('Error loading target entity:', error);
      toast.error('Failed to load branding configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadEntityBranding = async (entityType, entityId) => {
    try {
      let filter = {};
      
      if (entityType === 'client') {
        filter = { client_id: entityId, partner_id: null, is_active: true };
      } else if (entityType === 'partner') {
        filter = { partner_id: entityId, client_id: null, is_active: true };
      } else {
        // Platform default
        filter = { client_id: null, partner_id: null, is_active: true };
      }

      const configs = await base44.entities.BrandingConfiguration.filter(filter);
      
      if (configs.length > 0) {
        setLocalBranding(configs[0]);
      } else {
        // No custom branding, use defaults
        setLocalBranding({
          logo_url: '',
          favicon_url: '',
          primary_color: '#1E40AF',
          secondary_color: '#8B5CF6',
          header_bg_color: '#FFFFFF',
          text_color: '#1F2937',
          heading_font: 'Inter, sans-serif',
          body_font: 'Inter, sans-serif',
          font_url: '',
          platform_name: 'Curiosity Led',
          tagline: 'Leadership Development Platform',
          welcome_message: 'Welcome back, {{user.first_name}}!',
          terminology_overrides: {}
        });
      }
    } catch (error) {
      console.error('Error loading entity branding:', error);
    }
  };

  const handleChange = (field, value) => {
    setLocalBranding(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build filter based on editing mode
      let filter = {};
      if (editingMode === 'client') {
        filter = { client_id: targetClientId, partner_id: null, is_active: true };
      } else if (editingMode === 'partner') {
        filter = { partner_id: targetPartnerId, client_id: null, is_active: true };
      } else {
        filter = { client_id: null, partner_id: null, is_active: true };
      }

      const existingConfigs = await base44.entities.BrandingConfiguration.filter(filter);
      const existingConfig = existingConfigs.length > 0 ? existingConfigs[0] : null;

      const brandingData = {
        ...localBranding,
        client_id: editingMode === 'client' ? targetClientId : null,
        partner_id: editingMode === 'partner' ? targetPartnerId : null,
        is_active: true
      };

      if (existingConfig) {
        await base44.entities.BrandingConfiguration.update(existingConfig.id, brandingData);
      } else {
        await base44.entities.BrandingConfiguration.create(brandingData);
      }

      // Log the change
      let changeType = 'platform_default_updated';
      if (editingMode === 'client') changeType = 'client_branding_updated';
      if (editingMode === 'partner') changeType = 'partner_branding_updated';

      await base44.entities.BrandingChangeLog.create({
        changed_by: user.email,
        change_type: changeType,
        new_value: JSON.stringify({ 
          client_id: targetClientId, 
          partner_id: targetPartnerId, 
          ...brandingData 
        })
      });

      setHasUnsavedChanges(false);
      toast.success('Branding updated! Refresh the page to see changes.');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save branding changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure? This will revert all customizations to defaults.')) {
      return;
    }

    try {
      let filter = {};
      if (editingMode === 'client') {
        filter = { client_id: targetClientId, partner_id: null, is_active: true };
      } else if (editingMode === 'partner') {
        filter = { partner_id: targetPartnerId, client_id: null, is_active: true };
      } else {
        filter = { client_id: null, partner_id: null, is_active: true };
      }

      const existingConfigs = await base44.entities.BrandingConfiguration.filter(filter);
      
      if (existingConfigs.length > 0) {
        await base44.entities.BrandingConfiguration.update(existingConfigs[0].id, {
          is_active: false
        });
      }

      // Log the reset
      await base44.entities.BrandingChangeLog.create({
        changed_by: user.email,
        change_type: 'reset_to_default'
      });

      // Reload
      await loadTargetEntity();
      setHasUnsavedChanges(false);
      toast.success('Branding reset to defaults. Refresh to see changes.');
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset branding');
    }
  };

  const getBackLink = () => {
    if (editingMode === 'client' || editingMode === 'partner') {
      return createPageUrl("BusinessManager");
    }
    return createPageUrl("Dashboard");
  };

  const getContextBanner = () => {
    if (editingMode === 'client' && targetClient) {
      return (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Building2 className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Editing white label settings for <strong>{targetClient.name}</strong>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (editingMode === 'partner' && targetPartner) {
      return (
        <Alert className="mb-6 bg-purple-50 border-purple-200">
          <Briefcase className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            Editing white label settings for <strong>{targetPartner.name}</strong> (Partner Organization)
          </AlertDescription>
        </Alert>
      );
    }
    
    if (editingMode === 'platform' && isPlatformAdmin) {
      return (
        <Alert className="mb-6 bg-indigo-50 border-indigo-200">
          <Info className="w-4 h-4 text-indigo-600" />
          <AlertDescription className="text-indigo-900">
            Editing <strong>Platform Default</strong> branding (applies to all clients and partners without custom branding)
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading branding configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            to={getBackLink()} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {editingMode === 'client' || editingMode === 'partner' ? 'Business Manager' : 'Dashboard'}
          </Link>
          
          {getContextBanner()}
          
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                White Label Settings
              </h1>
              <p className="text-gray-600">
                {editingMode === 'client' && targetClient 
                  ? `Customize the platform appearance for ${targetClient.name}`
                  : editingMode === 'partner' && targetPartner
                    ? `Customize the platform appearance for ${targetPartner.name} and their clients`
                    : isPlatformAdmin 
                      ? 'Configure platform-wide default branding and appearance'
                      : 'Customize your organization\'s platform appearance'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Unsaved Changes
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Button variant="outline" onClick={() => setLocalBranding(branding || {})}>
                  Discard
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                Reset to Default
              </Button>
              <Button onClick={handleSave} disabled={!hasUnsavedChanges || saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Entity Selector */}
          {(isPlatformAdmin || isPartnerBusinessAdmin) && (
            <div className="mb-6">
              <Card className="p-4 bg-white shadow-md">
                <EntitySelector 
                  currentEntityType={editingMode}
                  currentEntityId={editingMode === 'client' ? targetClientId : editingMode === 'partner' ? targetPartnerId : null}
                />
              </Card>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="identity">
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="typography">Typography</TabsTrigger>
                <TabsTrigger value="terminology">Terms</TabsTrigger>
                <TabsTrigger value="themes">Themes</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="identity">
                <Card className="border-0 shadow-lg">
                  <div className="p-6 space-y-6">
                    <LogoUploader
                      logoUrl={localBranding?.logo_url || ''}
                      faviconUrl={localBranding?.favicon_url || ''}
                      onChange={handleChange}
                    />
                    <PlatformIdentityEditor
                      platformName={localBranding?.platform_name || ''}
                      tagline={localBranding?.tagline || ''}
                      onChange={handleChange}
                    />
                    <WelcomeMessageEditor
                      message={localBranding?.welcome_message || ''}
                      onChange={handleChange}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="colors">
                <ColorPicker colors={localBranding || {}} onChange={handleChange} />
              </TabsContent>

              <TabsContent value="typography">
                <TypographySelector
                  headingFont={localBranding?.heading_font || 'Inter, sans-serif'}
                  bodyFont={localBranding?.body_font || 'Inter, sans-serif'}
                  fontUrl={localBranding?.font_url || ''}
                  onChange={handleChange}
                />
              </TabsContent>

              <TabsContent value="terminology">
                <TerminologyEditor
                  overrides={localBranding?.terminology_overrides || {}}
                  onChange={handleChange}
                />
              </TabsContent>

              <TabsContent value="themes">
                <ThemeManager
                  currentBranding={localBranding}
                  onLoadTheme={(theme) => {
                    setLocalBranding(theme.configuration || {});
                    setHasUnsavedChanges(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="history">
                <ChangeHistory />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <LivePreview branding={localBranding} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(WhiteLabel, ['Platform Admin', 'Super Administrator', 'Partner Business Administrator']);
