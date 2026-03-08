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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, Download, Calendar, Clock, Plus, Search, 
  BarChart3, Users, Award, GraduationCap, MessageSquare,
  Play, Loader2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { 
    id: 'program_summary', 
    label: 'Program Summary Report',
    description: 'Overview of all your programs with participant counts and completion rates',
    icon: BarChart3,
    sections: ['overview', 'programs', 'participants']
  },
  { 
    id: 'class_attendance', 
    label: 'Class Attendance Report',
    description: 'Detailed attendance records for all classes',
    icon: GraduationCap,
    sections: ['classes', 'attendance', 'trends']
  },
  { 
    id: 'coaching_progress', 
    label: 'Coaching Progress Report',
    description: 'Progress tracking for all coaching engagements',
    icon: MessageSquare,
    sections: ['engagements', 'sessions', 'goals']
  },
  { 
    id: 'certificate_report', 
    label: 'Certificate Issuance Report',
    description: 'Summary of all certificates issued',
    icon: Award,
    sections: ['certificates', 'recipients']
  },
  { 
    id: 'participant_progress', 
    label: 'Participant Progress Report',
    description: 'Individual participant progress across programs',
    icon: Users,
    sections: ['participants', 'completion', 'assessments']
  }
];

export default function ProgramReports() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [reportConfig, setReportConfig] = useState({
    type: 'program_summary',
    title: '',
    dateFrom: '',
    dateTo: '',
    selectedPrograms: [],
    includeCharts: true,
    includeRawData: false
  });

  // Data for reports
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, classesData, engagementsData, sessionsData, certificatesData] = await Promise.all([
        base44.entities.Program.filter({ manager_emails: { $in: [user.email] } }),
        base44.entities.Class.filter({ facilitator_email: user.email }),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }),
        base44.entities.CoachingSession.filter({ coach_email: user.email }),
        base44.entities.Certificate.filter({ issued_by_email: user.email })
      ]);

      setPrograms(programsData);
      setClasses(classesData);
      setEngagements(engagementsData);
      setSessions(sessionsData);
      setCertificates(certificatesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const reportType = REPORT_TYPES.find(r => r.id === reportConfig.type);
      let reportData = {};
      let csvRows = [];

      const dateFrom = reportConfig.dateFrom ? new Date(reportConfig.dateFrom) : null;
      const dateTo = reportConfig.dateTo ? new Date(reportConfig.dateTo) : null;

      switch (reportConfig.type) {
        case 'program_summary':
          reportData = {
            totalPrograms: programs.length,
            totalParticipants: new Set(programs.flatMap(p => p.participant_emails || [])).size,
            programDetails: programs.map(p => ({
              name: p.name,
              status: p.status,
              participants: p.participant_emails?.length || 0,
              startDate: p.start_date,
              endDate: p.end_date
            }))
          };
          csvRows = [
            ['Program Name', 'Status', 'Participants', 'Start Date', 'End Date'],
            ...reportData.programDetails.map(p => [p.name, p.status, p.participants, p.startDate || '', p.endDate || ''])
          ];
          break;

        case 'class_attendance':
          const filteredClasses = classes.filter(c => {
            if (!dateFrom && !dateTo) return true;
            const classDate = new Date(c.scheduled_date);
            if (dateFrom && classDate < dateFrom) return false;
            if (dateTo && classDate > dateTo) return false;
            return true;
          });
          
          reportData = {
            totalClasses: filteredClasses.length,
            totalEnrolled: filteredClasses.reduce((sum, c) => sum + (c.enrolled_emails?.length || 0), 0),
            classDetails: filteredClasses.map(c => {
              const present = c.attendance_records?.filter(r => r.status === 'present').length || 0;
              const enrolled = c.enrolled_emails?.length || 0;
              return {
                title: c.title,
                date: c.scheduled_date,
                type: c.class_type,
                enrolled,
                present,
                attendanceRate: enrolled > 0 ? Math.round((present / enrolled) * 100) : 0
              };
            })
          };
          csvRows = [
            ['Class Title', 'Date', 'Type', 'Enrolled', 'Present', 'Attendance Rate'],
            ...reportData.classDetails.map(c => [c.title, c.date || '', c.type, c.enrolled, c.present, `${c.attendanceRate}%`])
          ];
          break;

        case 'coaching_progress':
          reportData = {
            totalEngagements: engagements.length,
            activeEngagements: engagements.filter(e => e.status === 'active').length,
            completedSessions: sessions.filter(s => s.status === 'completed').length,
            engagementDetails: engagements.map(e => ({
              title: e.title,
              coachee: e.coachee_email,
              type: e.engagement_type,
              status: e.status,
              progress: e.overall_progress || 0,
              sessionsCompleted: e.sessions_completed || 0,
              sessionsPlanned: e.total_sessions_planned || 0,
              riskLevel: e.risk_level
            }))
          };
          csvRows = [
            ['Engagement', 'Coachee', 'Type', 'Status', 'Progress', 'Sessions', 'Risk'],
            ...reportData.engagementDetails.map(e => [
              e.title, e.coachee, e.type, e.status, `${e.progress}%`, 
              `${e.sessionsCompleted}/${e.sessionsPlanned}`, e.riskLevel
            ])
          ];
          break;

        case 'certificate_report':
          const filteredCerts = certificates.filter(c => {
            if (!dateFrom && !dateTo) return true;
            const certDate = new Date(c.issued_date);
            if (dateFrom && certDate < dateFrom) return false;
            if (dateTo && certDate > dateTo) return false;
            return true;
          });

          reportData = {
            totalCertificates: filteredCerts.length,
            byType: filteredCerts.reduce((acc, c) => {
              acc[c.certificate_type] = (acc[c.certificate_type] || 0) + 1;
              return acc;
            }, {}),
            certificateDetails: filteredCerts.map(c => ({
              title: c.title,
              recipient: c.user_name || c.user_email,
              type: c.certificate_type,
              issuedDate: c.issued_date,
              credentialId: c.credential_id,
              status: c.status
            }))
          };
          csvRows = [
            ['Certificate Title', 'Recipient', 'Type', 'Issued Date', 'Credential ID', 'Status'],
            ...reportData.certificateDetails.map(c => [
              c.title, c.recipient, c.type, format(new Date(c.issuedDate), 'yyyy-MM-dd'), c.credentialId, c.status
            ])
          ];
          break;

        case 'participant_progress':
          const allParticipants = new Set([
            ...programs.flatMap(p => p.participant_emails || []),
            ...classes.flatMap(c => c.enrolled_emails || []),
            ...engagements.map(e => e.coachee_email)
          ]);

          reportData = {
            totalParticipants: allParticipants.size,
            participantDetails: Array.from(allParticipants).map(email => {
              const participantPrograms = programs.filter(p => p.participant_emails?.includes(email));
              const participantClasses = classes.filter(c => c.enrolled_emails?.includes(email));
              const participantEngagements = engagements.filter(e => e.coachee_email === email);
              const participantCerts = certificates.filter(c => c.user_email === email);

              return {
                email,
                programs: participantPrograms.length,
                classes: participantClasses.length,
                engagements: participantEngagements.length,
                certificates: participantCerts.length
              };
            })
          };
          csvRows = [
            ['Participant Email', 'Programs', 'Classes', 'Coaching Engagements', 'Certificates'],
            ...reportData.participantDetails.map(p => [p.email, p.programs, p.classes, p.engagements, p.certificates])
          ];
          break;
      }

      // Generate CSV content
      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Create report record
      const report = {
        id: Date.now().toString(),
        type: reportConfig.type,
        title: reportConfig.title || reportType.label,
        generatedAt: new Date().toISOString(),
        dateRange: {
          from: reportConfig.dateFrom,
          to: reportConfig.dateTo
        },
        data: reportData,
        csvContent
      };

      setGeneratedReports(prev => [report, ...prev]);
      setShowCreateModal(false);
      resetReportConfig();

    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (report) => {
    const blob = new Blob([report.csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(report.generatedAt), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const resetReportConfig = () => {
    setReportConfig({
      type: 'program_summary',
      title: '',
      dateFrom: '',
      dateTo: '',
      selectedPrograms: [],
      includeCharts: true,
      includeRawData: false
    });
  };

  const filteredReports = generatedReports.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Program Reports</h2>
          <p className="text-gray-600">Generate and download custom reports</p>
        </div>
        {hasPermission('reports.program.create') && (
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        )}
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Card 
              key={type.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setReportConfig(prev => ({ ...prev, type: type.id }));
                setShowCreateModal(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{type.label}</h4>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generated Reports */}
      {generatedReports.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Reports</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filteredReports.map((report) => {
                const reportType = REPORT_TYPES.find(r => r.id === report.type);
                const Icon = reportType?.icon || FileText;
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{report.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="w-3 h-3" />
                                Generated {format(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => downloadReport(report)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download CSV
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {generatedReports.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No reports generated yet</p>
          <p className="text-sm">Click on a report type above or use the Generate Report button</p>
        </div>
      )}

      {/* Generate Report Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportConfig.type} onValueChange={(v) => setReportConfig({ ...reportConfig, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Report Title (optional)</Label>
              <Input
                value={reportConfig.title}
                onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                placeholder={REPORT_TYPES.find(r => r.id === reportConfig.type)?.label}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={reportConfig.dateFrom}
                  onChange={(e) => setReportConfig({ ...reportConfig, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={reportConfig.dateTo}
                  onChange={(e) => setReportConfig({ ...reportConfig, dateTo: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2 text-sm text-gray-600">
              <p><strong>Report includes:</strong></p>
              <ul className="list-disc list-inside mt-1">
                {REPORT_TYPES.find(r => r.id === reportConfig.type)?.sections.map(section => (
                  <li key={section} className="capitalize">{section.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={generateReport}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}