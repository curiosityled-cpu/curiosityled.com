import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AIEnhancedInput from "@/components/ai/AIEnhancedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Globe, Target, TrendingUp, Calendar as CalendarIcon, Sparkles, Loader2, Lightbulb, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import FormAssistant from "@/components/ai/FormAssistant";
import AtreusGoalRefiner from "@/components/goals/AtreusGoalRefiner";

const colorOptions = [
  { name: 'Ocean Blue', value: '#0202ff' },
  { name: 'Success Green', value: '#00C875' },
  { name: 'Warning Orange', value: '#FFCB00' },
  { name: 'Danger Red', value: '#E2445C' },
  { name: 'Purple', value: '#A25DDC' },
  { name: 'Teal', value: '#00D9FF' }
];

export default function CreateGoalModal({ isOpen, onClose, onSubmit }) {
  const { isManagerOfManagers } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'standard',
    timeframe_start: '',
    timeframe_end: '',
    color: '#0202ff',
    visibility: 'private',
    linked_competency_ids: [],
    assigned_to_emails: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSmartGoal, setShowSmartGoal] = useState(false);
  const [smartGoalText, setSmartGoalText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form state every time the modal opens
      setFormData({
        title: '',
        description: '',
        goal_type: 'standard',
        timeframe_start: '',
        timeframe_end: '',
        color: '#0202ff',
        visibility: 'private',
        linked_competency_ids: [],
        assigned_to_emails: []
      });
      setAiSuggestions(null);
      setShowSmartGoal(false);
      setSmartGoalText('');
      setIsProcessing(false);
      setIsSubmitting(false);
      if (isManagerOfManagers) {
        loadTeamMembers();
      }
    }
  }, [isOpen, isManagerOfManagers]);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.subordinate_emails && currentUser.subordinate_emails.length > 0) {
        const teamUsers = await base44.entities.User.filter({
          email: { $in: currentUser.subordinate_emails }
        });
        setTeamMembers(teamUsers);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const toggleTeamMember = (email) => {
    setFormData(prev => ({
      ...prev,
      assigned_to_emails: prev.assigned_to_emails.includes(email)
        ? prev.assigned_to_emails.filter(e => e !== email)
        : [...prev.assigned_to_emails, email]
    }));
  };

  const handleSmartGoalProcess = async () => {
    if (!smartGoalText.trim()) return;

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('smartGoal', {
        user_input: smartGoalText,
        goal_type_hint: null
      });

      const aiGoal = response.data.goal;
      
      setFormData(prev => ({
        ...prev,
        title: aiGoal.title,
        description: aiGoal.description,
        goal_type: aiGoal.goal_type,
        timeframe_start: aiGoal.timeframe.start || '',
        timeframe_end: aiGoal.timeframe.end || ''
      }));

      setAiSuggestions({
        rationale: aiGoal.rationale,
        suggestions: aiGoal.suggestions,
        competency_suggestions: aiGoal.competency_suggestions
      });

      setShowSmartGoal(false);
    } catch (error) {
      console.error('Smart Goal error:', error);
      toast.error('Failed to process Smart Goal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (formData.goal_type === 'okr_objective' && (!formData.timeframe_start || !formData.timeframe_end)) {
      toast.error('OKR Objectives require a timeframe. Please set start and end dates.');
      return;
    }

    setIsSubmitting(true);
    const goalData = {
      ...formData,
      status: 'active',
      progress: 0,
      columns: [
        {
          id: 'task',
          title: 'Task',
          type: 'text',
          width: 250
        },
        {
          id: 'priority',
          title: 'Priority',
          type: 'dropdown',
          width: 120,
          options: {
            choices: [
              { value: 'low', label: 'Low', color: '#787D80' },
              { value: 'medium', label: 'Medium', color: '#FFCB00' },
              { value: 'high', label: 'High', color: '#FDAB3D' },
              { value: 'critical', label: 'Critical', color: '#E2445C' }
            ]
          }
        },
        {
          id: 'status',
          title: 'Status',
          type: 'status',
          width: 150,
          options: {
            choices: [
              { label: 'Not Started', color: '#C4C4C4' },
              { label: 'Working on it', color: '#FFCB00' },
              { label: 'Done', color: '#00C875' },
              { label: 'Stuck', color: '#E2445C' }
            ]
          }
        },
        {
          id: 'owner',
          title: 'Owner',
          type: 'people',
          width: 150
        },
        {
          id: 'due_date',
          title: 'Due Date',
          type: 'date',
          width: 150
        }
      ],
      groups: [
        {
          id: 'group1',
          title: 'New Group',
          color: formData.color,
          collapsed: false
        }
      ]
    };

    try {
      await onSubmit(goalData);
      setFormData({ 
        title: '', 
        description: '', 
        goal_type: 'standard',
        timeframe_start: '',
        timeframe_end: '',
        color: '#0202ff', 
        visibility: 'private',
        linked_competency_ids: [],
        assigned_to_emails: []
      });
      setAiSuggestions(null);
      setShowSmartGoal(false);
      setSmartGoalText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOKR = formData.goal_type === 'okr_objective';

  const goalFormSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      goal_type: { type: "string", enum: ["standard", "okr_objective"] },
      timeframe_start: { type: "string" },
      timeframe_end: { type: "string" }
    }
  };

  const handleAIFormApply = (aiData) => {
    setFormData(prev => ({
      ...prev,
      ...aiData
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#323338]">
            Create a Goal
          </DialogTitle>
        </DialogHeader>

        {!showSmartGoal && !aiSuggestions && (
          <>
            <FormAssistant
              formSchema={goalFormSchema}
              onApply={handleAIFormApply}
              formType="goal"
              placeholder="Describe your goal, e.g., 'Improve team communication by implementing weekly standups and getting 90% attendance over the next quarter'"
              compact={true}
            />
          </>
        )}

        {!showSmartGoal && !aiSuggestions && (
          <div className="mb-4">
            <Button
              type="button"
              onClick={() => setShowSmartGoal(true)}
              className="w-full text-white"
              style={{ background: 'linear-gradient(to right, #A25DDC, #0202ff)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #9147cc, #0101dd)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #A25DDC, #0202ff)'}
              variant="default"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Use Smart Goal Assistant
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Let AI help you create a clear, actionable goal
            </p>
          </div>
        )}

        {showSmartGoal && (
          <div className="space-y-4 p-4 rounded-lg border" style={{ background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)', borderColor: '#e9d5ff' }}>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-[#323338] mb-2">Smart Goal Assistant</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Describe what you want to achieve in plain language. I'll help make it clear, actionable, and properly scoped.
                </p>
                <Textarea
                  value={smartGoalText}
                  onChange={(e) => setSmartGoalText(e.target.value)}
                  placeholder="e.g., Improve communication across my team and build stronger relationships"
                  rows={3}
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSmartGoalProcess}
                    disabled={isProcessing || !smartGoalText.trim()}
                    style={{ backgroundColor: '#A25DDC' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Goal
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSmartGoal(false);
                      setSmartGoalText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiSuggestions && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-[#323338] mb-1">AI Insights</h4>
                <p className="text-sm text-gray-700 mb-3">{aiSuggestions.rationale}</p>
                {aiSuggestions.suggestions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Suggestions:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {aiSuggestions.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSuggestions.competency_suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Related Competencies:</p>
                    <div className="flex flex-wrap gap-1">
                      {aiSuggestions.competency_suggestions.map((comp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[#323338] font-medium">Goal Type</Label>
            <div className="space-y-3">
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.goal_type === 'standard' 
                ? 'bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
                }`}
                style={formData.goal_type === 'standard' ? { borderColor: '#0202ff' } : {}}
                onClick={() => setFormData(prev => ({ ...prev, goal_type: 'standard' }))}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.goal_type === 'standard'}
                    onChange={() => setFormData(prev => ({ ...prev, goal_type: 'standard' }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4" style={{ color: '#0202ff' }} />
                      <span className="font-semibold text-[#323338]">Standard Goal</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Set a clear target you want to achieve. Best for focused initiatives, projects, or behavioral shifts.
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.goal_type === 'okr_objective' 
                    ? 'bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={formData.goal_type === 'okr_objective' ? { borderColor: '#0202ff' } : {}}
                onClick={() => setFormData(prev => ({ ...prev, goal_type: 'okr_objective' }))}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.goal_type === 'okr_objective'}
                    onChange={() => setFormData(prev => ({ ...prev, goal_type: 'okr_objective' }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4" style={{ color: '#0202ff' }} />
                      <span className="font-semibold text-[#323338]">OKR Objective</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Define an ambitious objective with measurable Key Results. Best for quarterly priorities and strategic outcomes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-[#323338] font-medium">
              {isOKR ? 'Objective Title' : 'Goal Title'} *
            </Label>
            <AIEnhancedInput
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              fieldName="title"
              fieldType="goal_title"
              formContext={{ goal_type: formData.goal_type }}
              placeholder={isOKR 
                ? 'e.g., Make new manager onboarding world-class in Q3' 
                : 'e.g., Improve new manager onboarding experience'
              }
              className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(2, 2, 255, 0.2)' }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#323338] font-medium">
              {isOKR ? 'Objective Description' : 'Goal Description'}
            </Label>
            <AIEnhancedInput
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fieldName="description"
              fieldType="goal_description"
              formContext={{ title: formData.title, goal_type: formData.goal_type }}
              multiline={true}
              placeholder={isOKR 
                ? 'What does success look like by the end of the quarter?' 
                : 'What are you trying to change or improve, and why does it matter?'
              }
              className="rounded-xl border-[#E1E5F3] min-h-20 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(2, 2, 255, 0.2)' }}
            />
          </div>

          {/* Atreus goal refiner — shown once title or description has content */}
          {(formData.title.trim().length > 3 || formData.description.trim().length > 0) && (
            <AtreusGoalRefiner
              title={formData.title}
              description={formData.description}
              resetKey={isOpen}
              onAccept={({ title, description }) =>
                setFormData(prev => ({ ...prev, title, description }))
              }
            />
          )}

          <div className="space-y-3">
            <Label className="text-[#323338] font-medium">
              Timeframe {isOKR && <span className="text-red-500">*</span>}
            </Label>
            {isOKR && !formData.timeframe_start && !formData.timeframe_end && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                OKRs work best when they're time-bound. Add a quarter or date range.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-10">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.timeframe_start ? format(new Date(formData.timeframe_start), 'MMM d, yyyy') : 'Select...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.timeframe_start ? new Date(formData.timeframe_start) : undefined}
                      onSelect={(date) => setFormData(prev => ({ 
                        ...prev, 
                        timeframe_start: date ? date.toISOString().split('T')[0] : '' 
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-10">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.timeframe_end ? format(new Date(formData.timeframe_end), 'MMM d, yyyy') : 'Select...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.timeframe_end ? new Date(formData.timeframe_end) : undefined}
                      onSelect={(date) => setFormData(prev => ({ 
                        ...prev, 
                        timeframe_end: date ? date.toISOString().split('T')[0] : '' 
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#323338] font-medium">Goal Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === color.value 
                      ? 'border-[#323338] scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#323338] font-medium">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value }))}
            >
              <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </div>
                </SelectItem>
                <SelectItem value="shared">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Shared</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManagerOfManagers && teamMembers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[#323338] font-medium">
                <Users className="w-4 h-4 inline mr-2" />
                Assign to Team Members (Optional)
              </Label>
              <div className="p-4 border border-[#E1E5F3] rounded-xl max-h-48 overflow-y-auto space-y-2">
                {loadingTeam ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : (
                  <>
                    {teamMembers.map((member) => (
                      <div key={member.email} className="flex items-center gap-3">
                        <Checkbox
                          id={`member-${member.email}`}
                          checked={formData.assigned_to_emails.includes(member.email)}
                          onCheckedChange={() => toggleTeamMember(member.email)}
                        />
                        <label
                          htmlFor={`member-${member.email}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          {member.full_name}
                          <span className="text-gray-500 ml-2">({member.email})</span>
                        </label>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {formData.assigned_to_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.assigned_to_emails.map((email) => {
                    const member = teamMembers.find(m => m.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {member?.full_name || email}
                        <button
                          type="button"
                          onClick={() => toggleTeamMember(email)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim() || isSubmitting}
              className="text-white rounded-xl h-12 px-6 font-medium"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            >
              {isSubmitting ? 'Creating...' : `Create ${isOKR ? 'Objective' : 'Goal'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}