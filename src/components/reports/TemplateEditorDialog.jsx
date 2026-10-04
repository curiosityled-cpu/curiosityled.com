import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AVAILABLE_METRICS, getIconByName } from "./reportTemplates";

const CATEGORY_OPTIONS = [
  'Individual Development', 'Team Performance', 'Organizational Strategy',
  'Program Management', 'Platform Administration', 'Executive Summary', 'Custom'
];
const AUDIENCE_OPTIONS = [
  'User Level 1', 'User Level 2', 'User Level 3',
  'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'
];
const ICON_OPTIONS = ['Award', 'Target', 'BookOpen', 'Users', 'TrendingUp', 'Building2', 'BarChart3', 'Sparkles', 'GraduationCap', 'UserCheck', 'Briefcase'];
const COLOR_OPTIONS = ['bg-[#0202ff]', 'bg-purple-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500'];

export default function TemplateEditorDialog({ open, onOpenChange, editingTemplate, userEmail, clientId, onSuccess }) {
  const [title, setTitle] = useState(editingTemplate?.title || '');
  const [description, setDescription] = useState(editingTemplate?.description || '');
  const [category, setCategory] = useState(editingTemplate?.category || 'Custom');
  const [audienceRole, setAudienceRole] = useState(editingTemplate?.audience_role || 'User Level 3');
  const [metrics, setMetrics] = useState(editingTemplate?.metrics || []);
  const [filters, setFilters] = useState(editingTemplate?.filters || { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' });
  const [outputFormat, setOutputFormat] = useState(editingTemplate?.output_format || 'pdf');
  const [defaultSchedule, setDefaultSchedule] = useState(editingTemplate?.default_schedule_interval || 'once');
  const [iconName, setIconName] = useState(editingTemplate?.icon_name || 'BarChart3');
  const [color, setColor] = useState(editingTemplate?.color || 'bg-[#0202ff]');
  const [saving, setSaving] = useState(false);

  const handleMetricToggle = (id) => {
    setMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Please enter a template name'); return; }
    if (metrics.length === 0) { toast.error('Please select at least one metric'); return; }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        category,
        audience_role: audienceRole,
        metrics,
        filters,
        output_format: outputFormat,
        default_schedule_interval: defaultSchedule,
        icon_name: iconName,
        color,
        is_builtin: false,
        created_by_email: userEmail,
        client_id: clientId
      };

      if (editingTemplate) {
        await base44.entities.ReportTemplate.update(editingTemplate.id, data);
        toast.success('Template updated');
      } else {
        await base44.entities.ReportTemplate.create(data);
        toast.success('Template created');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      console.error('Error saving template:', e);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? 'Edit Custom Template' : 'New Custom Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Template Name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Quarterly Sales Leadership Review" />
          </div>

          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this report covers..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Audience Role</Label>
              <Select value={audienceRole} onValueChange={setAudienceRole}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Icon</Label>
              <Select value={iconName} onValueChange={setIconName}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(i => {
                    const Icon = getIconByName(i);
                    return (
                      <SelectItem key={i} value={i}>
                        <div className="flex items-center gap-2">{Icon && <Icon className="w-3.5 h-3.5" />} {i}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => <SelectItem key={c} value={c}><div className="flex items-center gap-2"><div className={`w-3 h-3 rounded ${c}`} /> {c.replace('bg-', '')}</div></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Default Schedule</Label>
            <Select value={defaultSchedule} onValueChange={setDefaultSchedule}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="first_weekday_of_month">First Weekday of Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Metrics</Label>
            <div className="mt-1.5 space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-3">
              {Object.entries(
                AVAILABLE_METRICS.reduce((acc, m) => {
                  if (!acc[m.category]) acc[m.category] = [];
                  acc[m.category].push(m);
                  return acc;
                }, {})
              ).map(([cat, items]) => (
                <div key={cat} className="mb-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{cat}</p>
                  {items.map(m => (
                    <div key={m.id} className="flex items-center gap-2 ml-2 mb-1">
                      <Checkbox id={`tpl-metric-${m.id}`} checked={metrics.includes(m.id)} onCheckedChange={() => handleMetricToggle(m.id)} />
                      <Label htmlFor={`tpl-metric-${m.id}`} className="text-xs cursor-pointer">{m.label}</Label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{metrics.length} metric{metrics.length !== 1 ? 's' : ''} selected</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}