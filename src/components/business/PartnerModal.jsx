import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Partner Setup Templates
const PARTNER_TEMPLATES = {
  consulting: {
    name: "Consulting Firm",
    type: "consulting_firm",
    commission_rate: 20,
    payment_terms: "net_30",
    description: "Strategic consulting firm providing leadership development services"
  },
  coaching: {
    name: "Coaching Practice",
    type: "coaching_practice",
    commission_rate: 25,
    payment_terms: "net_30",
    description: "Executive coaching practice focused on leadership transformation"
  },
  reseller: {
    name: "Technology Reseller",
    type: "reseller",
    commission_rate: 15,
    payment_terms: "net_45",
    description: "Technology solutions provider offering leadership platforms"
  },
  affiliate: {
    name: "Affiliate Partner",
    type: "affiliate",
    commission_rate: 10,
    payment_terms: "net_60",
    description: "Referral partner for leadership development solutions"
  }
};

export default function PartnerModal({ partner, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "consulting_firm",
    status: "active",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    contract_start_date: "",
    commission_rate: 20,
    payment_terms: "net_30",
    notes: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        type: partner.type || "consulting_firm",
        status: partner.status || "active",
        contact_name: partner.contact_name || "",
        contact_email: partner.contact_email || "",
        contact_phone: partner.contact_phone || "",
        website: partner.website || "",
        contract_start_date: partner.contract_start_date || "",
        commission_rate: partner.commission_rate || 20,
        payment_terms: partner.payment_terms || "net_30",
        notes: partner.notes || ""
      });
    }
  }, [partner]);

  const handleApplyTemplate = (templateKey) => {
    const template = PARTNER_TEMPLATES[templateKey];
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      type: template.type,
      commission_rate: template.commission_rate,
      payment_terms: template.payment_terms,
      notes: template.description
    }));

    setSelectedTemplate(templateKey);
    toast.success(`Applied ${template.name} template`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_email) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (partner) {
        const response = await base44.functions.invoke('updatePartner', {
          partnerId: partner.id,
          partnerData: formData
        });
        
        if (response.data?.success) {
          toast.success('Partner updated successfully');
          onSuccess();
        } else {
          toast.error(response.data?.error || 'Failed to update partner');
        }
      } else {
        const response = await base44.functions.invoke('createPartner', {
          partnerData: formData
        });
        
        if (response.data?.success) {
          toast.success('Partner created successfully');
          onSuccess();
        } else {
          toast.error(response.data?.error || 'Failed to create partner');
        }
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      toast.error('Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {partner ? 'Edit Partner' : 'Create New Partner'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Quick Setup Templates */}
          {!partner && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <Label className="text-sm font-semibold">Quick Setup Templates</Label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(PARTNER_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={selectedTemplate === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleApplyTemplate(key)}
                    className={`text-xs ${selectedTemplate === key ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Templates pre-fill partner type, commission rates, and payment terms
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="name">Partner Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Big Consulting Firm"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="type">Partner Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulting_firm">Consulting Firm</SelectItem>
                    <SelectItem value="coaching_practice">Coaching Practice</SelectItem>
                    <SelectItem value="reseller">Reseller</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://partner.com"
                />
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
                  placeholder="John Smith"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="john@partner.com"
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
                <Label htmlFor="contract_start_date">Contract Start Date</Label>
                <Input
                  id="contract_start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              Financial Terms
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
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
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add internal notes about this partner..."
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
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {partner ? 'Update Partner' : 'Create Partner'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}