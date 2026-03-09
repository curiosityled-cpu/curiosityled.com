import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Search, Filter, Plus, Edit, Trash2, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { createPageUrl } from "@/utils";

function QuestionBankManager() {
  const [questions, setQuestions] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterCompetency, setFilterCompetency] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

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

  const handleDelete = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await base44.entities.AssessmentQuestion.delete(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast.success('Question deleted');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const exportToJSON = () => {
    const exportData = filteredQuestions.map(q => ({
      competency_id: q.competency_id,
      competency_name: competencies.find(c => c.id === q.competency_id)?.name,
      question_number: q.question_number,
      sector: q.sector,
      leadership_level: q.leadership_level,
      scenario_text: q.scenario_text,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchTerm || 
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.scenario_text?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = filterSector === 'all' || q.sector === filterSector;
    const matchesLevel = filterLevel === 'all' || q.leadership_level === filterLevel;
    const matchesCompetency = filterCompetency === 'all' || q.competency_id === filterCompetency;

    return matchesSearch && matchesSector && matchesLevel && matchesCompetency;
  });

  const stats = {
    total: questions.length,
    bySector: questions.reduce((acc, q) => {
      acc[q.sector] = (acc[q.sector] || 0) + 1;
      return acc;
    }, {}),
    byLevel: questions.reduce((acc, q) => {
      acc[q.leadership_level] = (acc[q.leadership_level] || 0) + 1;
      return acc;
    }, {})
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 animate-pulse mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading question bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Question Bank Manager</h1>
                <p className="text-gray-600">{stats.total} total questions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportToJSON}
                disabled={filteredQuestions.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button
                onClick={() => window.location.href = createPageUrl('QuestionBankImport')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import Questions
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Sectors</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.bySector).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Levels</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byLevel).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Competencies</p>
                <p className="text-2xl font-bold text-gray-900">{competencies.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sector</label>
                <Select value={filterSector} onValueChange={setFilterSector}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Corporate/Private">Corporate/Private</SelectItem>
                    <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Leadership Level</label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Level 1 (Leading Self)">Level 1</SelectItem>
                    <SelectItem value="Level 2 (Leading Others)">Level 2</SelectItem>
                    <SelectItem value="Level 3 (Leading Managers)">Level 3</SelectItem>
                    <SelectItem value="Level 4 (Leading Functions)">Level 4</SelectItem>
                    <SelectItem value="Level 5 (Leading Organizations)">Level 5</SelectItem>
                    <SelectItem value="HiPo Individual Contributor">HiPo IC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Competency</label>
                <Select value={filterCompetency} onValueChange={setFilterCompetency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competencies</SelectItem>
                    {competencies.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No questions found</p>
              </CardContent>
            </Card>
          ) : (
            filteredQuestions.map((question, idx) => {
              const competency = competencies.find(c => c.id === question.competency_id);
              
              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-purple-100 text-purple-800">
                              Q{question.question_number}
                            </Badge>
                            <Badge variant="outline">
                              {competency?.name || 'Unknown'}
                            </Badge>
                            <Badge variant="outline">
                              {question.sector}
                            </Badge>
                            <Badge variant="outline">
                              {question.leadership_level?.replace(/Level \d \(/g, 'L').replace(/\)/g, '')}
                            </Badge>
                          </div>

                          {question.scenario_text && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-xs font-medium text-blue-900 mb-1">Scenario:</p>
                              <p className="text-sm text-blue-800">{question.scenario_text}</p>
                            </div>
                          )}

                          <p className="text-gray-900 font-medium">
                            {question.question_text}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.options?.map((option) => (
                              <div key={option.label} className="text-sm">
                                <span className="font-semibold text-gray-700">{option.label}.</span>
                                <span className="text-gray-600 ml-2">{option.value}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  L{option.proficiency_level}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(question.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(QuestionBankManager, {
  allowedRoles: ['Platform Admin']
});