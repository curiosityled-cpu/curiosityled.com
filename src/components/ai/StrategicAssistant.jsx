import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, Download, ChevronDown, ChevronUp, Trash2, Plus, Edit2, CheckCircle, Target, Bell, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import CoachMessage from "./CoachMessage";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateGoalsFromPlanModal from "./modals/CreateGoalsFromPlanModal";
import ScheduleFollowUpModal from "./modals/ScheduleFollowUpModal";
import ShareStrategicAnalysisModal from "./modals/ShareStrategicAnalysisModal";
import { createPageUrl } from "@/utils";

export default function StrategicAssistant({ riskData, onClose, onMinimize, user, appRole }) {
  const [messages, setMessages] = useState([]);
  const [actionPlan, setActionPlan] = useState([]);
  const [strategicAnalysis, setStrategicAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedActionItems, setExpandedActionItems] = useState({});
  const [showActionButtons, setShowActionButtons] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [showCreateGoalsModal, setShowCreateGoalsModal] = useState(false);
  const [showScheduleFollowUpModal, setShowScheduleFollowUpModal] = useState(false);
  const [showShareEmailModal, setShowShareEmailModal] = useState(false);
  const scrollRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    loadStrategicAnalysis();
    return () => { isMountedRef.current = false; };
  }, []);

  const loadStrategicAnalysis = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strategic AI assistant analyzing organizational risk.

Risk Title: ${riskData.title}
Description: ${riskData.description}
Severity: ${riskData.severity}
Affected Leaders: ${riskData.affected_count}

Provide a comprehensive strategic analysis with:
1. Detailed risk assessment and business impact
2. Strategic rationale explaining why this matters
3. Specific implementation timeline with phases and durations
4. 6 concrete, actionable steps for an Executive Action Plan

Format your response as JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            rationale: { type: "string" },
            timeline: { type: "string" },
            actionPlan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  action: { type: "string" },
                  completed: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      if (!isMountedRef.current) return;
      setStrategicAnalysis(response);
      setActionPlan(response.actionPlan || []);
      setShowActionPlan(true);
      setMessages([{
        role: "assistant",
        content: `# Strategic Risk Analysis\n\n${response.analysis}\n\n## Strategic Rationale\n\n${response.rationale}\n\n## Implementation Timeline\n\n${response.timeline}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error loading strategic analysis:', error);
      toast.error('Failed to generate strategic analysis');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleExportAsPDF = async () => {
    setExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportConversationPDF', {
        strategic_mode: true,
        risk_data: riskData,
        action_plan: actionPlan
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategic-analysis-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 600) setPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (actionPlan.length > 0) {
      const newExpanded = {};
      actionPlan.forEach(item => {
        newExpanded[item.id] = expandedActionItems[item.id] ?? true;
      });
      setExpandedActionItems(newExpanded);
    }
  }, [actionPlan.length]);

  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="fixed bottom-6 right-6 w-full max-w-[900px] h-[600px] md:w-[900px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex overflow-hidden z-50"
      >
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-4 border-b bg-green-600">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-white" />
              <div>
                <h3 className="font-semibold text-white">Strategic Decision Assistant</h3>
                <p className="text-xs text-white opacity-90">{riskData.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="flex-1 flex min-h-0 relative">
              <div className="flex-1 flex flex-col" style={showActionPlan ? { marginRight: `${panelWidth}px` } : {}}>
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {messages.map((msg, i) => <CoachMessage key={i} message={msg} />)}
                </ScrollArea>
              </div>

              {showActionPlan && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1 hover:w-2 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-all z-10"
                    style={{ right: `${panelWidth}px` }}
                    onMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
                  />
                  <div className="absolute top-0 right-0 bottom-0 border-l bg-gray-50 flex flex-col" style={{ width: `${panelWidth}px` }}>
                    <div className="p-4 border-b bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Executive Action Plan</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          const maxId = Math.max(...actionPlan.map(item => item.id), 0);
                          const newItem = { id: maxId + 1, action: "New action item", completed: false };
                          setActionPlan([...actionPlan, newItem]);
                          setEditingItemId(newItem.id);
                          setEditingItemText(newItem.action);
                        }}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">{actionPlan.length} action items</p>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      {actionPlan.map((item, idx) => (
                        <div key={item.id} className="bg-white rounded-lg border shadow-sm mb-3">
                          <div className="flex items-start gap-3 p-3">
                            <button
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'
                              }`}
                              onClick={() => setActionPlan(actionPlan.map((p, i) => i === idx ? { ...p, completed: !p.completed } : p))}
                            >
                              {item.completed && <CheckCircle className="w-4 h-4 text-white" />}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Action {idx + 1}</span>
                                <div className="flex gap-1">
                                  {editingItemId !== item.id && (
                                    <>
                                      <button onClick={() => { setEditingItemId(item.id); setEditingItemText(item.action); }} className="text-gray-400 hover:text-blue-600">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => {
                                        if (actionPlan.length > 1) setActionPlan(actionPlan.filter(p => p.id !== item.id));
                                      }} className="text-gray-400 hover:text-red-600">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => setExpandedActionItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                                    {expandedActionItems[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedActionItems[item.id] && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-3 pb-3">
                                {editingItemId === item.id ? (
                                  <div className="pl-9 space-y-2">
                                    <Textarea value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} className="text-sm" />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => {
                                        setActionPlan(actionPlan.map(p => p.id === item.id ? { ...p, action: editingItemText } : p));
                                        setEditingItemId(null);
                                      }}>Save</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingItemId(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className={`text-sm pl-9 ${item.completed ? 'line-through text-gray-500' : ''}`}>{item.action}</p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </ScrollArea>

                    <div className="border-t bg-white">
                      <div className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setShowActionButtons(!showActionButtons)}>
                        <span className="text-sm font-medium">Actions</span>
                        {showActionButtons ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                      <AnimatePresence>
                        {showActionButtons && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-4 space-y-2">
                            <Button onClick={() => setShowCreateGoalsModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
                              <Target className="w-4 h-4 mr-2" />Create Goals from Plan
                            </Button>
                            <Button onClick={() => setShowScheduleFollowUpModal(true)} variant="outline" className="w-full text-sm">
                              <Bell className="w-4 h-4 mr-2" />Schedule Follow-up
                            </Button>
                            <Button onClick={() => setShowShareEmailModal(true)} variant="outline" className="w-full text-sm">
                              <Mail className="w-4 h-4 mr-2" />Share via Email
                            </Button>
                            <Button onClick={handleExportAsPDF} disabled={exportingPDF} variant="outline" className="w-full text-sm">
                              {exportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                              Export as PDF
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <CreateGoalsFromPlanModal isOpen={showCreateGoalsModal} onClose={() => setShowCreateGoalsModal(false)} actionPlan={actionPlan.map(i => i.action).join('\n')} riskData={riskData} />
      <ScheduleFollowUpModal isOpen={showScheduleFollowUpModal} onClose={() => setShowScheduleFollowUpModal(false)} riskData={riskData} />
      <ShareStrategicAnalysisModal isOpen={showShareEmailModal} onClose={() => setShowShareEmailModal(false)} analysisContent={strategicAnalysis?.analysis} actionPlan={actionPlan.map(i => i.action).join('\n')} riskData={riskData} />
    </>
  );
}