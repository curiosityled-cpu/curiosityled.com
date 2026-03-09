import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ClientModal({ client, onClose, onSuccess, preselectedPartnerId = null }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "direct_customer",
    status: "trial",
    partner_id: preselectedPartnerId || "",
    industry: "",
    company_size: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    billing_email: "",
    contract_start_date: "",
    contract_end_date: "",
    license_count: 999999, // Updated default license count
    annual_contract_value: 0,
    payment_terms: "annual",
    notes: "",
    settings: {
      allow_custom_competencies: true,
      allow_custom_assessments: true,
      allow_custom_learning: true,
      include_leadership_index: true,
      enable_industry_benchmarks: true
    }
  });
  
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        type: client.type || "direct_customer",
        status: client.status || "trial",
        partner_id: client.partner_id || preselectedPartnerId || "",
        industry: client.industry || "",
        company_size: client.company_size || "",
        contact_name: client.contact_name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        billing_email: client.billing_email || "",
        contract_start_date: client.contract_start_date || "",
        contract_end_date: client.contract_end_date || "",
        license_count: client.license_count || 999999, // Updated default license count for existing clients
        annual_contract_value: client.annual_contract_value || 0,
        payment_terms: client.payment_terms || "annual",
        notes: client.notes || "",
        settings: client.settings || {
          allow_custom_competencies: true,
          allow_custom_assessments: true,
          allow_custom_learning: true,
          include_leadership_index: true,
          enable_industry_benchmarks: true
        }
      });
    }
  }, [client, preselectedPartnerId]);

  const loadData = async () => {
    try {
      const partnersList = await base44.entities.Partner.list('-created_date');
      setPartners(partnersList || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_email) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (client) {
        console.log('Updating client:', { clientId: client.id, clientData: formData });
        const response = await base44.functions.invoke('clientUpdate', {
          client_id: client.id,
          updates: formData
        });
        
        console.log('Update response:', response);
        
        if (response.data?.success) {
          toast.success('Client updated successfully');
          onClose();
          onSuccess();
        } else {
          console.error('Update failed:', response.data);
          toast.error(response.data?.error || 'Failed to update client');
        }
      } else {
        console.log('Creating client:', formData);
        const response = await base44.functions.invoke('createClient', {
          clientData: formData
        });
        
        console.log('Create response:', response);
        
        if (response.data?.success) {
          toast.success('Client created successfully');
          onClose();
          onSuccess();
        } else {
          console.error('Create failed:', response.data);
          toast.error(response.data?.error || 'Failed to create client');
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {client ? 'Edit Client' : 'Create New Client'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="type">Client Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_customer">Direct Customer</SelectItem>
                    <SelectItem value="partner_client">Partner Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'partner_client' && (
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="partner_id">Partner *</Label>
                  <Select
                    value={formData.partner_id}
                    onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                    disabled={!!preselectedPartnerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map(partner => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="company_size">Company Size</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-300">1-300 employees</SelectItem>
                    <SelectItem value="301-800">301-800 employees</SelectItem>
                    <SelectItem value="801-1200">801-1200 employees</SelectItem>
                    <SelectItem value="1200+">1200+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="jane@company.com"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="billing_email">Billing Email</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  placeholder="billing@company.com"
                />
              </div>
            </div>
          </div>

          {/* Contract & Billing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Contract & Billing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contract_start_date">Contract Start Date</Label>
                <Input
                  id="contract_start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contract_end_date">Contract End Date</Label>
                <Input
                  id="contract_end_date"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="license_count">License Count</Label>
                <Input
                  id="license_count"
                  type="number"
                  value={formData.license_count}
                  onChange={(e) => setFormData({ ...formData, license_count: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Use 999999 for unlimited licenses</p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="annual_contract_value">Annual Contract Value ($)</Label>
                <Input
                  id="annual_contract_value"
                  type="number"
                  value={formData.annual_contract_value}
                  onChange={(e) => setFormData({ ...formData, annual_contract_value: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select
                  value={formData.payment_terms}
                  onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="one_time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Feature Settings
            </h3>
            <div className="space-y-3">
              {[
                { key: 'allow_custom_competencies', label: 'Allow Custom Competencies' },
                { key: 'allow_custom_assessments', label: 'Allow Custom Assessments' },
                { key: 'allow_custom_learning', label: 'Allow Custom Learning Content' },
                { key: 'include_leadership_index', label: 'Include Leadership Index' },
                { key: 'enable_industry_benchmarks', label: 'Enable Industry Benchmarks' }
              ].map(setting => (
                <label key={setting.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings[setting.key]}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, [setting.key]: e.target.checked }
                    })}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{setting.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add internal notes about this client..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  {client ? 'Update Client' : 'Create Client'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}