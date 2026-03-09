import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, Search, Plus, Download, Ban, CheckCircle, Clock, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const CERTIFICATE_TYPES = [
  { value: 'class_completion', label: 'Class Completion' },
  { value: 'program_completion', label: 'Program Completion' },
  { value: 'journey_completion', label: 'Journey Completion' },
  { value: 'coaching_completion', label: 'Coaching Completion' },
  { value: 'competency_achievement', label: 'Competency Achievement' },
  { value: 'custom', label: 'Custom Certificate' }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-yellow-100 text-yellow-700',
  revoked: 'bg-red-100 text-red-700'
};

export default function CertificateManagement() {
  const { user, hasPermission } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Related data for dropdowns
  const [classes, setClasses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [engagements, setEngagements] = useState([]);

  const [formData, setFormData] = useState({
    user_email: '',
    user_name: '',
    certificate_type: 'class_completion',
    title: '',
    description: '',
    class_id: '',
    program_id: '',
    coaching_engagement_id: '',
    hours_completed: 0,
    score: null,
    skills_earned: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [certsData, classesData, programsData, engagementsData] = await Promise.all([
        base44.entities.Certificate.filter({ issued_by_email: user.email }, '-issued_date'),
        base44.entities.Class.filter({ facilitator_email: user.email }),
        base44.entities.Program.filter({ manager_emails: { $in: [user.email] } }),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email })
      ]);
      setCertificates(certsData);
      setClasses(classesData);
      setPrograms(programsData);
      setEngagements(engagementsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCredentialId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CL-${timestamp}-${random}`;
  };

  const handleIssueCertificate = async () => {
    setSaving(true);
    try {
      const certificate = {
        ...formData,
        client_id: user.client_id,
        issued_by_email: user.email,
        issued_by_name: user.full_name,
        issued_date: new Date().toISOString(),
        credential_id: generateCredentialId(),
        status: 'active'
      };

      // Clean up empty fields
      if (!certificate.class_id) delete certificate.class_id;
      if (!certificate.program_id) delete certificate.program_id;
      if (!certificate.coaching_engagement_id) delete certificate.coaching_engagement_id;
      if (!certificate.score) delete certificate.score;
      if (certificate.skills_earned?.length === 0) delete certificate.skills_earned;

      await base44.entities.Certificate.create(certificate);
      setShowIssueModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error issuing certificate:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!selectedCertificate || !revokeReason) return;
    setSaving(true);
    try {
      await base44.entities.Certificate.update(selectedCertificate.id, {
        status: 'revoked',
        revoked_date: new Date().toISOString(),
        revoked_reason: revokeReason
      });
      setShowRevokeModal(false);
      setSelectedCertificate(null);
      setRevokeReason('');
      loadData();
    } catch (error) {
      console.error('Error revoking certificate:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      user_email: '',
      user_name: '',
      certificate_type: 'class_completion',
      title: '',
      description: '',
      class_id: '',
      program_id: '',
      coaching_engagement_id: '',
      hours_completed: 0,
      score: null,
      skills_earned: []
    });
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || cert.certificate_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const stats = {
    total: certificates.length,
    active: certificates.filter(c => c.status === 'active').length,
    thisMonth: certificates.filter(c => {
      const issued = new Date(c.issued_date);
      const now = new Date();
      return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
    }).length,
    revoked: certificates.filter(c => c.status === 'revoked').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Certificate Management</h2>
          <p className="text-gray-600">Issue and manage completion certificates</p>
        </div>
        {hasPermission('certificates.issue') && (
          <Button onClick={() => { resetForm(); setShowIssueModal(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Issue Certificate
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Issued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
            <div className="text-sm text-gray-600">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
            <div className="text-sm text-gray-600">Revoked</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CERTIFICATE_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Certificates List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredCertificates.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{cert.title}</h4>
                        <p className="text-sm text-gray-600">{cert.user_name || cert.user_email}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="font-mono">{cert.credential_id}</span>
                          <span>•</span>
                          <span>{format(new Date(cert.issued_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_COLORS[cert.status]}>{cert.status}</Badge>
                      <Badge variant="outline">
                        {CERTIFICATE_TYPES.find(t => t.value === cert.certificate_type)?.label}
                      </Badge>
                      {cert.status === 'active' && hasPermission('certificates.revoke') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => { setSelectedCertificate(cert); setShowRevokeModal(true); }}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {cert.description && (
                    <p className="text-sm text-gray-600 mt-3 pl-16">{cert.description}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredCertificates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No certificates found</p>
        </div>
      )}

      {/* Issue Certificate Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Certificate</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={formData.user_email}
                onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                placeholder="recipient@company.com"
              />
            </div>
            
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={formData.user_name}
                onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                placeholder="Full name for certificate"
              />
            </div>
            
            <div>
              <Label>Certificate Type *</Label>
              <Select 
                value={formData.certificate_type} 
                onValueChange={(v) => setFormData({ ...formData, certificate_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Certificate Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Leadership Fundamentals Certificate"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Achievement description"
                rows={2}
              />
            </div>

            {formData.certificate_type === 'class_completion' && classes.length > 0 && (
              <div>
                <Label>Related Class</Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.certificate_type === 'program_completion' && programs.length > 0 && (
              <div>
                <Label>Related Program</Label>
                <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(prog => (
                      <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.certificate_type === 'coaching_completion' && engagements.length > 0 && (
              <div>
                <Label>Related Coaching Engagement</Label>
                <Select value={formData.coaching_engagement_id} onValueChange={(v) => setFormData({ ...formData, coaching_engagement_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map(eng => (
                      <SelectItem key={eng.id} value={eng.id}>{eng.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Hours Completed</Label>
              <Input
                type="number"
                value={formData.hours_completed}
                onChange={(e) => setFormData({ ...formData, hours_completed: parseFloat(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
            <Button 
              onClick={handleIssueCertificate}
              disabled={saving || !formData.user_email || !formData.user_name || !formData.title}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Issuing...' : 'Issue Certificate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Modal */}
      <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to revoke this certificate for <strong>{selectedCertificate?.user_name}</strong>?
              This action cannot be undone.
            </p>
            <Label>Reason for Revocation *</Label>
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Please provide a reason for revoking this certificate"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRevokeModal(false); setRevokeReason(''); }}>Cancel</Button>
            <Button 
              onClick={handleRevokeCertificate}
              disabled={saving || !revokeReason}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? 'Revoking...' : 'Revoke Certificate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}