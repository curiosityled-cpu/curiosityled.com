import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Briefcase, Globe, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EntitySelector({ currentEntityType, currentEntityId }) {
  const { isPlatformAdmin, isPartnerBusinessAdmin, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isPlatformAdmin) {
        // Platform Admin can see all clients and partners
        const [clientsRes, partnersRes] = await Promise.all([
          base44.functions.invoke('listClients').catch(err => {
            console.error('Error loading clients:', err);
            return { data: { clients: [] } };
          }),
          base44.functions.invoke('listPartners').catch(err => {
            console.error('Error loading partners:', err);
            return { data: { partners: [] } };
          })
        ]);
        
        setClients(clientsRes.data?.clients || []);
        setPartners(partnersRes.data?.partners || []);
        
        if (clientsRes.data?.error || partnersRes.data?.error) {
          setError('Some data could not be loaded. Please contact support if this persists.');
        }
      } else if (isPartnerBusinessAdmin && user.partner_id) {
        // Partner Admin can see their own partner and their clients
        const [clientsRes, partnersRes] = await Promise.all([
          base44.functions.invoke('listClients').catch(err => {
            console.error('Error loading clients:', err);
            return { data: { clients: [] } };
          }),
          base44.functions.invoke('listPartners').catch(err => {
            console.error('Error loading partners:', err);
            return { data: { partners: [] } };
          })
        ]);
        
        // Filter clients that belong to this partner
        const partnerClients = (clientsRes.data?.clients || []).filter(
          c => c.partner_id === user.partner_id
        );
        
        // Filter to only show their own partner
        const ownPartner = (partnersRes.data?.partners || []).filter(
          p => p.id === user.partner_id
        );
        
        setClients(partnerClients);
        setPartners(ownPartner);
        
        if (clientsRes.data?.error || partnersRes.data?.error) {
          setError('Some data could not be loaded. Please contact support if this persists.');
        }
      }
    } catch (error) {
      console.error('Error loading entities:', error);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (value) => {
    if (value === 'platform') {
      window.location.href = createPageUrl('WhiteLabel');
    } else if (value.startsWith('client-')) {
      const clientId = value.replace('client-', '');
      window.location.href = `${createPageUrl('WhiteLabel')}?client_id=${clientId}`;
    } else if (value.startsWith('partner-')) {
      const partnerId = value.replace('partner-', '');
      window.location.href = `${createPageUrl('WhiteLabel')}?partner_id=${partnerId}`;
    }
  };

  // Build the current selection value
  const getCurrentValue = () => {
    if (currentEntityType === 'client' && currentEntityId) {
      return `client-${currentEntityId}`;
    } else if (currentEntityType === 'partner' && currentEntityId) {
      return `partner-${currentEntityId}`;
    } else {
      return 'platform';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="entity-selector" className="text-sm font-medium text-gray-700">
        Select Organization to Edit
      </Label>
      
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Select value={getCurrentValue()} onValueChange={handleSelectionChange}>
        <SelectTrigger id="entity-selector" className="w-full">
          <SelectValue placeholder="Select organization..." />
        </SelectTrigger>
        <SelectContent>
          {isPlatformAdmin && (
            <SelectItem value="platform">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="font-medium">Platform Default</span>
              </div>
            </SelectItem>
          )}

          {partners.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                Partners
              </div>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={`partner-${partner.id}`}>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span>{partner.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {clients.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                Clients
              </div>
              {clients.map((client) => (
                <SelectItem key={client.id} value={`client-${client.id}`}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{client.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {clients.length === 0 && partners.length === 0 && !isPlatformAdmin && (
            <div className="px-2 py-4 text-sm text-gray-500 text-center">
              No organizations available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}