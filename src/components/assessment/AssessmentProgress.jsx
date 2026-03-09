import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";

export default function AssessmentProgress({ questions, responses, currentIndex }) {
  const competencyGroups = {};
  
  questions.forEach((q, idx) => {
    const compId = q.competency_id;
    if (!competencyGroups[compId]) {
      competencyGroups[compId] = {
        name: q.competency_name || 'Competency',
        questions: []
      };
    }
    competencyGroups[compId].questions.push({ ...q, index: idx });
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
        <div className="space-y-4">
          {Object.entries(competencyGroups).map(([compId, group]) => {
            const answered = group.questions.filter(q => 
              responses.some(r => r.question_id === q.id)
            ).length;
            const total = group.questions.length;
            
            return (
              <div key={compId}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{group.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {answered}/{total}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {group.questions.map((q) => {
                    const isAnswered = responses.some(r => r.question_id === q.id);
                    const isCurrent = q.index === currentIndex;
                    
                    return (
                      <div
                        key={q.id}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          isCurrent
                            ? 'bg-purple-600 ring-2 ring-purple-300'
                            : isAnswered
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}