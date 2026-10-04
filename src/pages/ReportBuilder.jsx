import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { motion } from "framer-motion";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { FileText, BarChart3, Library, Send } from "lucide-react";
import ReportLibraryTab from "@/components/reports/ReportLibraryTab";
import MyReportsTab from "@/components/reports/MyReportsTab";
import DeliveryTab from "@/components/reports/DeliveryTab";
import ReportAnalyticsView from "@/components/reports/ReportAnalyticsView";
import CreateReportDialog from "@/components/reports/CreateReportDialog";

const TABS = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'reports', label: 'My Reports', icon: FileText },
  { id: 'delivery', label: 'Delivery', icon: Send },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function ReportBuilder() {
  const { user, appRole, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [section, setSection] = useState('library');
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Read ?tab= param for deep-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.id === tab)) setSection(tab);
  }, []);

  const handleUseTemplate = (template) => {
    setPendingTemplate(template);
    setSection('reports');
    setShowCreateDialog(true);
  };

  const getPageSubtitle = () => {
    if (isPlatformAdmin || isSuperAdmin) return 'Create, schedule, and deliver analytics reports across the platform';
    if (appRole === 'User Level 3' || appRole === 'Admin Level 2') return 'Create, schedule, and deliver organizational analytics reports';
    if (appRole === 'User Level 2' || appRole === 'Admin Level 1') return 'Create, schedule, and deliver team analytics reports';
    return 'Create, schedule, and deliver personal development reports';
  };

  // Analytics view renders its own MVPPageLayout (has its own tabs + filters)
  if (section === 'analytics') {
    return <ReportAnalyticsView user={user} viewTabs={TABS} activeView={section} setActiveView={setSection} />;
  }

  return (
    <MVPPageLayout title="Report Manager" subtitle={getPageSubtitle()}>
      {/* Pill tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg transition-all whitespace-nowrap ${section === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab content */}
      {section === 'library' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <ReportLibraryTab user={user} onUseTemplate={handleUseTemplate} />
        </motion.div>
      )}

      {section === 'reports' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <MyReportsTab user={user} onUseTemplate={handleUseTemplate} initialTemplate={pendingTemplate} />
        </motion.div>
      )}

      {section === 'delivery' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <DeliveryTab user={user} />
        </motion.div>
      )}

      {/* Shared create dialog — opened when a template is picked from Library */}
      <CreateReportDialog
        open={showCreateDialog}
        onOpenChange={(open) => { if (!open) setPendingTemplate(null); setShowCreateDialog(open); }}
        editingReport={null}
        userEmail={user?.email}
        clientId={user?.client_id}
        initialTemplate={pendingTemplate}
        onSuccess={() => { setPendingTemplate(null); setShowCreateDialog(false); setSection('reports'); }}
      />
    </MVPPageLayout>
  );
}