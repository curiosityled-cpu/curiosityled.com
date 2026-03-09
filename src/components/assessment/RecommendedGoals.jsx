import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, AlertTriangle } from 'lucide-react';

export default function RecommendedGoals({ goals }) {
    const getStatusStyles = (status) => {
        switch (status) {
            case 'On Track':
                return { badge: 'bg-green-100 text-green-800', progress: 'bg-green-500' };
            case 'At Risk':
                return { badge: 'bg-yellow-100 text-yellow-800', progress: 'bg-yellow-500' };
            default:
                return { badge: 'bg-gray-100 text-gray-800', progress: 'bg-gray-500' };
        }
    };

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-700" />
                    Recommended Development Goals
                </CardTitle>
                <p className="text-gray-600">AI-suggested goals based on your results</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {goals.map(goal => {
                    const styles = getStatusStyles(goal.status);
                    return (
                        <div key={goal.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900 flex-1 pr-4">{goal.title}</h4>
                                <Badge className={styles.badge}>
                                    {goal.status === 'At Risk' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                    {goal.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">
                                Related to: <span className="font-medium">{goal.related_competency}</span>
                            </p>
                            <div>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-medium">{goal.progress_pct}%</span>
                                </div>
                                <Progress value={goal.progress_pct} className="h-2 [&>*]:bg-purple-600" />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}