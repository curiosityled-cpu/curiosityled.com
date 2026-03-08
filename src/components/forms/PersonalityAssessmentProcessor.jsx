import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PersonalityAssessmentProcessor({ form, submission }) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(submission?.result_data || null);

  const processDISC = (responses) => {
    // Standard DISC scoring (simplified)
    const scores = { D: 0, I: 0, S: 0, C: 0 };
    
    Object.values(responses).forEach(answer => {
      if (typeof answer === 'string') {
        const upper = answer.toUpperCase();
        if (upper.includes('DOMINANCE') || upper.includes('DIRECT')) scores.D++;
        if (upper.includes('INFLUENCE') || upper.includes('INSPIRING')) scores.I++;
        if (upper.includes('STEADINESS') || upper.includes('SUPPORTIVE')) scores.S++;
        if (upper.includes('CONSCIENTIOUSNESS') || upper.includes('CAUTIOUS')) scores.C++;
      }
    });

    // Find primary type
    const sortedTypes = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primaryType = sortedTypes[0][0];
    const secondaryType = sortedTypes[1][0];

    const profiles = {
      D: { label: "Dominance", description: "Direct, results-oriented, decisive" },
      I: { label: "Influence", description: "Enthusiastic, optimistic, people-oriented" },
      S: { label: "Steadiness", description: "Calm, patient, supportive" },
      C: { label: "Conscientiousness", description: "Analytical, detail-oriented, systematic" }
    };

    return {
      type: "DISC",
      primary_type: primaryType,
      secondary_type: secondaryType,
      profile: profiles[primaryType],
      scores,
      description: `${profiles[primaryType].label} with ${profiles[secondaryType].label} tendencies`
    };
  };

  const processMBTI = (responses) => {
    // Simplified MBTI scoring
    const dimensions = {
      E: 0, I: 0, // Extraversion vs Introversion
      S: 0, N: 0, // Sensing vs Intuition
      T: 0, F: 0, // Thinking vs Feeling
      J: 0, P: 0  // Judging vs Perceiving
    };

    Object.values(responses).forEach(answer => {
      if (typeof answer === 'string') {
        const upper = answer.toUpperCase();
        if (upper.includes('OUTGOING') || upper.includes('SOCIAL')) dimensions.E++;
        if (upper.includes('QUIET') || upper.includes('REFLECTIVE')) dimensions.I++;
        if (upper.includes('PRACTICAL') || upper.includes('CONCRETE')) dimensions.S++;
        if (upper.includes('IMAGINATIVE') || upper.includes('ABSTRACT')) dimensions.N++;
        if (upper.includes('LOGICAL') || upper.includes('OBJECTIVE')) dimensions.T++;
        if (upper.includes('EMPATHETIC') || upper.includes('VALUES')) dimensions.F++;
        if (upper.includes('ORGANIZED') || upper.includes('PLANNED')) dimensions.J++;
        if (upper.includes('FLEXIBLE') || upper.includes('SPONTANEOUS')) dimensions.P++;
      }
    });

    const type = 
      (dimensions.E > dimensions.I ? 'E' : 'I') +
      (dimensions.S > dimensions.N ? 'S' : 'N') +
      (dimensions.T > dimensions.F ? 'T' : 'F') +
      (dimensions.J > dimensions.P ? 'J' : 'P');

    const typeDescriptions = {
      'INTJ': 'The Architect - Strategic and analytical',
      'ENTJ': 'The Commander - Bold and decisive',
      'INFJ': 'The Advocate - Idealistic and principled',
      'ENFJ': 'The Protagonist - Charismatic and inspiring',
      // Add more types as needed
    };

    return {
      type: "MBTI",
      personality_type: type,
      dimensions,
      description: typeDescriptions[type] || `${type} personality type`,
      profile_url: `https://www.16personalities.com/${type.toLowerCase()}-personality`
    };
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      let processedResult;

      if (form.form_type === 'disc_assessment') {
        processedResult = processDISC(submission.responses);
      } else if (form.form_type === 'mbti_assessment') {
        processedResult = processMBTI(submission.responses);
      } else {
        throw new Error('Unsupported assessment type');
      }

      // Save result to submission
      await base44.entities.CustomFormSubmission.update(submission.id, {
        result_data: processedResult,
        status: 'submitted'
      });

      setResult(processedResult);
      toast.success("Assessment processed successfully");
    } catch (error) {
      console.error("Error processing assessment:", error);
      toast.error("Failed to process assessment");
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {result.type === 'DISC' ? 'DISC Profile' : 'MBTI Type'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.type === 'DISC' && (
            <>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {result.primary_type}
                </div>
                <p className="text-lg font-medium">{result.profile.label}</p>
                <p className="text-sm text-gray-600">{result.profile.description}</p>
              </div>
              
              <Card className="bg-gray-50">
                <CardContent className="p-3 space-y-2">
                  {Object.entries(result.scores).map(([type, score]) => (
                    <div key={type} className="flex items-center justify-between">
                      <Badge variant="outline">{type}</Badge>
                      <div className="flex-1 mx-3 bg-gray-200 h-2 rounded">
                        <div 
                          className="bg-blue-600 h-2 rounded"
                          style={{ width: `${(score / Math.max(...Object.values(result.scores))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{score}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {result.type === 'MBTI' && (
            <>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {result.personality_type}
                </div>
                <p className="text-sm text-gray-600 mb-4">{result.description}</p>
                {result.profile_url && (
                  <Button
                    onClick={() => window.open(result.profile_url, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    Learn More at 16Personalities
                  </Button>
                )}
              </div>

              <Card className="bg-gray-50">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Dimension Scores</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>E: {result.dimensions.E} | I: {result.dimensions.I}</div>
                    <div>S: {result.dimensions.S} | N: {result.dimensions.N}</div>
                    <div>T: {result.dimensions.T} | F: {result.dimensions.F}</div>
                    <div>J: {result.dimensions.J} | P: {result.dimensions.P}</div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Process Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleProcess}
          disabled={processing}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Process {form.form_type === 'disc_assessment' ? 'DISC' : 'MBTI'} Results
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}