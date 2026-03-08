import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Loader2, Save, X, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { withAuthProtection } from '@/components/hoc/withAuthProtection';
import PageHeader from '@/components/common/PageHeader';

function QuestionEditor() {
  const [questions, setQuestions] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompetency, setFilterCompetency] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    competency_id: '',
    question_number: 1,
    sector: 'Healthcare',
    leadership_level: 'Level 1 (Leading Self)',
    scenario_text: '',
    question_text: '',
    question_type: 'scenario_based_mcq',
    weight: 1,
    branching_logic: null,
    options: [
      { label: 'A', value: '', proficiency_level: 1 },
      { label: 'B', value: '', proficiency_level: 2 },
      { label: 'C', value: '', proficiency_level: 3 },
      { label: 'D', value: '', proficiency_level: 4 }
    ]
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sectors = ['Healthcare', 'Government', 'Corporate/Private', 'Non-Profit', 'Other'];
  const levels = [
    'Level 1 (Leading Self)',
    'Level 2 (Leading Others)',
    'Level 3 (Leading Managers)',
    'Level 4 (Leading Functions)',
    'Level 5 (Leading Organizations)',
    'HiPo Individual Contributor'
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, filterCompetency, filterSector, filterLevel]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questionsData, competenciesData] = await Promise.all([
        base44.entities.AssessmentQuestion.list('-created_date'),
        base44.entities.Competency.filter({ is_platform_default: true })
      ]);
      setQuestions(questionsData);
      setCompetencies(competenciesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.question_text?.toLowerCase().includes(term) ||
        q.scenario_text?.toLowerCase().includes(term)
      );
    }

    if (filterCompetency !== 'all') {
      filtered = filtered.filter(q => q.competency_id === filterCompetency);
    }

    if (filterSector !== 'all') {
      filtered = filtered.filter(q => q.sector === filterSector);
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(q => q.leadership_level === filterLevel);
    }

    setFilteredQuestions(filtered);
  };

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setFormData({
      competency_id: competencies[0]?.id || '',
      question_number: 1,
      sector: 'Healthcare',
      leadership_level: 'Level 1 (Leading Self)',
      scenario_text: '',
      question_text: '',
      question_type: 'scenario_based_mcq',
      weight: 1,
      branching_logic: null,
      options: [
        { label: 'A', value: '', proficiency_level: 1 },
        { label: 'B', value: '', proficiency_level: 2 },
        { label: 'C', value: '', proficiency_level: 3 },
        { label: 'D', value: '', proficiency_level: 4 }
      ]
    });
    setShowAdvanced(false);
    setShowDialog(true);
  };

  const openEditDialog = (question) => {
    setEditingQuestion(question);
    setFormData({
      competency_id: question.competency_id || '',
      question_number: question.question_number || 1,
      sector: question.sector || 'Healthcare',
      leadership_level: question.leadership_level || 'Level 1 (Leading Self)',
      scenario_text: question.scenario_text || '',
      question_text: question.question_text || '',
      question_type: question.question_type || 'scenario_based_mcq',
      weight: question.weight || 1,
      branching_logic: question.branching_logic || null,
      options: question.options || [
        { label: 'A', value: '', proficiency_level: 1 },
        { label: 'B', value: '', proficiency_level: 2 },
        { label: 'C', value: '', proficiency_level: 3 },
        { label: 'D', value: '', proficiency_level: 4 }
      ]
    });
    setShowAdvanced(question.weight !== 1 || question.branching_logic);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.competency_id) {
      toast.error('Please select a competency');
      return;
    }
    if (!formData.question_text.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const invalidOptions = formData.options.filter(opt => !opt.value.trim());
    if (invalidOptions.length > 0) {
      toast.error('Please fill in all answer options');
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        await base44.entities.AssessmentQuestion.update(editingQuestion.id, formData);
        toast.success('Question updated successfully');
      } else {
        await base44.entities.AssessmentQuestion.create(formData);
        toast.success('Question created successfully');
      }
      setShowDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await base44.entities.AssessmentQuestion.delete(questionId);
      toast.success('Question deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const getCompetencyName = (competencyId) => {
    const comp = competencies.find(c => c.id === competencyId);
    return comp?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Leadership Index Question Editor"
          subtitle="Manage assessment questions for the Leadership Index"
          badges={[
            { text: 'Platform Admin', className: 'bg-white text-purple-600' },
            { text: `${questions.length} Questions`, className: 'bg-white text-blue-600' }
          ]}
          onRefresh={loadData}
          headerColor="#0201ff"
        />

        {/* Add Question Button */}
        <div className="mb-6">
          <Button
            onClick={openCreateDialog}
            style={{ backgroundColor: '#0202ff' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCompetency} onValueChange={setFilterCompetency}>
                <SelectTrigger>
                  <SelectValue placeholder="All Competencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Competencies</SelectItem>
                  {competencies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSector} onValueChange={setFilterSector}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredQuestions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No questions found</p>
                  <Button onClick={openCreateDialog} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredQuestions.map((question, idx) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-100 text-purple-800">
                              Q{question.question_number}
                            </Badge>
                            <Badge variant="outline">{getCompetencyName(question.competency_id)}</Badge>
                            <Badge variant="outline">{question.sector}</Badge>
                            <Badge variant="outline">{question.leadership_level?.replace(/Level \d \(/g, 'L').replace(/\)/g, '')}</Badge>
                          </div>
                          {question.scenario_text && (
                            <p className="text-sm text-gray-600 mb-2 italic">
                              <strong>Scenario:</strong> {question.scenario_text}
                            </p>
                          )}
                          <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {question.options?.map((opt, i) => (
                              <div key={i} className="text-sm">
                                <span className="font-medium text-gray-700">{opt.label}.</span>
                                <span className="text-gray-600 ml-2">{opt.value}</span>
                                <Badge className="ml-2 text-xs" variant={opt.proficiency_level === 4 ? 'default' : 'secondary'}>
                                  L{opt.proficiency_level}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(question)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(question.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competency *</Label>
                  <Select
                    value={formData.competency_id}
                    onValueChange={(value) => setFormData({ ...formData, competency_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select competency" />
                    </SelectTrigger>
                    <SelectContent>
                      {competencies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question Number</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.question_number}
                    onChange={(e) => setFormData({ ...formData, question_number: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sector *</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Leadership Level *</Label>
                  <Select
                    value={formData.leadership_level}
                    onValueChange={(value) => setFormData({ ...formData, leadership_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value) => setFormData({ ...formData, question_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scenario_based_mcq">Scenario-Based MCQ</SelectItem>
                    <SelectItem value="self_reflection_mcq">Self-Reflection MCQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scenario (Optional)</Label>
                <Textarea
                  value={formData.scenario_text}
                  onChange={(e) => setFormData({ ...formData, scenario_text: e.target.value })}
                  placeholder="Describe the scenario context..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="What is the question?"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Answer Options (A=Awareness, B=Developing, C=Proficient, D=Mastery)</Label>
                {formData.options.map((option, idx) => (
                  <div key={idx} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Option {option.label}</Label>
                      <Badge className={
                        option.proficiency_level === 4 ? 'bg-green-100 text-green-800' :
                        option.proficiency_level === 3 ? 'bg-blue-100 text-blue-800' :
                        option.proficiency_level === 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        Level {option.proficiency_level}
                      </Badge>
                    </div>
                    <Textarea
                      value={option.value}
                      onChange={(e) => updateOption(idx, 'value', e.target.value)}
                      placeholder={`Answer option ${option.label}...`}
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {/* Advanced Configuration Toggle */}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Advanced Configuration
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Question Weight</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">
                          Multiplier for scoring (default: 1.0)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Higher weights increase the importance of this question in overall competency scoring
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Branching Logic (JSON)</Label>
                      <Textarea
                        value={formData.branching_logic ? JSON.stringify(formData.branching_logic, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : null;
                            setFormData({ ...formData, branching_logic: parsed });
                          } catch (err) {
                            // Keep current value if invalid JSON
                          }
                        }}
                        placeholder={'{\n  "skip_to_question": 5,\n  "conditions": {\n    "A": {"next": 3},\n    "B": {"next": 4}\n  }\n}'}
                        rows={6}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-gray-500">
                        Define conditional logic for question flow. Example: skip patterns based on answers
                      </p>
                      <details className="text-xs text-gray-600 mt-2">
                        <summary className="cursor-pointer font-medium">View example logic patterns</summary>
                        <div className="mt-2 p-3 bg-white rounded border space-y-2">
                          <p><strong>Skip Pattern:</strong></p>
                          <code className="block bg-gray-100 p-2 rounded text-xs">
                            {`{"skip_to_question": 10, "if_answer": "A"}`}
                          </code>
                          <p><strong>Conditional Next:</strong></p>
                          <code className="block bg-gray-100 p-2 rounded text-xs">
                            {`{"conditions": {"A": {"next": 5}, "B": {"next": 7}}}`}
                          </code>
                          <p><strong>Display Condition:</strong></p>
                          <code className="block bg-gray-100 p-2 rounded text-xs">
                            {`{"show_if": {"question_id": "q1", "answer": "C"}}`}
                          </code>
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingQuestion ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withAuthProtection(QuestionEditor, {
  allowedRoles: ['Platform Admin']
});