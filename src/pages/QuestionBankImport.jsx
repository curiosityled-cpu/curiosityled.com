import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, AlertCircle, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";

function QuestionBankImport() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste the questions JSON data');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const questions = JSON.parse(jsonInput);
      
      if (!Array.isArray(questions)) {
        throw new Error('JSON must be an array of questions');
      }

      const { bulkImportAssessmentQuestions } = await import('@/functions/bulkImportAssessmentQuestions');
      const response = await bulkImportAssessmentQuestions({ questions });

      setResult(response.data);
      
      if (response.data.success) {
        toast.success(`Successfully imported ${response.data.created_count} questions!`);
        setJsonInput('');
      } else {
        toast.error(response.data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import questions');
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const exampleFormat = `[
  {
    "competency_name": "Decision-Making",
    "question_number": 1,
    "sector": "Healthcare",
    "leadership_level": "Level 2 (Leading Others)",
    "scenario_text": "A patient's family is upset about wait times...",
    "question_text": "What do you do first?",
    "question_type": "scenario_based_mcq",
    "options": [
      {
        "label": "A",
        "value": "Apologize and explain shortages",
        "proficiency_level": 1
      },
      {
        "label": "B",
        "value": "Ask nurse to provide updates",
        "proficiency_level": 2
      },
      {
        "label": "C",
        "value": "Huddle with staff and reorganize",
        "proficiency_level": 3
      },
      {
        "label": "D",
        "value": "Implement triage system",
        "proficiency_level": 4
      }
    ]
  }
]`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Question Bank Import</CardTitle>
                  <CardDescription className="text-base">
                    Bulk import assessment questions from JSON
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Import Format</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Paste a JSON array of questions. Each question must include:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>competency_name</strong>: Decision-Making, Communication, Resource Management, Stakeholder Management, Performance Management, or Situational Intelligence</li>
                  <li><strong>sector</strong>: Healthcare, Government, Corporate/Private, Non-Profit, or Other</li>
                  <li><strong>leadership_level</strong>: Level 1-5 or HiPo Individual Contributor</li>
                  <li><strong>question_text</strong>: The question</li>
                  <li><strong>options</strong>: Array of 4 options with label (A-D), value (text), and proficiency_level (1-4)</li>
                </ul>
              </div>

              {/* Example Format */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Example Format:</h3>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                  {exampleFormat}
                </pre>
              </div>

              {/* JSON Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Paste Questions JSON:
                </label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your questions JSON here..."
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={loading || !jsonInput.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importing Questions...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Import Questions
                  </>
                )}
              </Button>

              {/* Result Display */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-2 ${
                        result.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {result.success ? 'Import Successful!' : 'Import Failed'}
                      </h3>
                      <p className={`text-sm ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.message}
                      </p>
                      
                      {result.success && result.questions_by_sector && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-green-900">Questions by Sector:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(result.questions_by_sector).map(([sector, count]) => (
                              <div key={sector} className="text-sm text-green-800">
                                {sector}: <strong>{count}</strong>
                              </div>
                            ))}
                          </div>
                          
                          {result.questions_by_level && (
                            <>
                              <p className="text-sm font-medium text-green-900 mt-3">Questions by Level:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(result.questions_by_level).map(([level, count]) => (
                                  <div key={level} className="text-sm text-green-800">
                                    {level}: <strong>{count}</strong>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      {result.error && (
                        <pre className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded overflow-x-auto">
                          {result.error}
                        </pre>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default withAuthProtection(QuestionBankImport, {
  allowedRoles: ['Platform Admin']
});