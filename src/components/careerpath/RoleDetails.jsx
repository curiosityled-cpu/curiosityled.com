
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Briefcase, BookOpen, Users, Target, TrendingUp, 
    Lightbulb, Calendar, MessageSquare, DollarSign, Play 
} from "lucide-react";
import ReadinessScore from "./ReadinessScore";

export default function RoleDetails({ 
    role, 
    careerPath, 
    currentUserRole,
    readinessData,
    learningResources = []
}) {
    
    if (!role) {
        return (
            <Card className="shadow-lg border-0 h-full">
                <CardContent className="p-12 text-center text-gray-500">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold mb-2">Select a Role to Explore</h3>
                    <p>Choose a role from the list to see detailed requirements, your readiness assessment, and personalized development recommendations.</p>
                </CardContent>
            </Card>
        );
    }

    // Get learning resources for this path
    const pathLearningResources = careerPath?.learning_resources 
        ? learningResources.filter(r => careerPath.learning_resources.includes(r.id))
        : [];

    return (
        <div className="space-y-6">
            {/* Role Overview */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">{role.title}</CardTitle>
                            <p className="text-gray-600">{role.department} • {role.level?.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right">
                            {careerPath && (
                                <>
                                    <Badge className={careerPath.path_type === 'vertical' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                        {careerPath.path_type === 'vertical' ? 'Promotion Path' : 'Lateral Move'}
                                    </Badge>
                                    <p className="text-sm text-gray-500 mt-1">{careerPath.typical_duration_months} months typical</p>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Description */}
                    {role.description && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Role Description</h4>
                            <p className="text-gray-700 leading-relaxed">{role.description}</p>
                        </div>
                    )}

                    {/* Key Responsibilities */}
                    {role.key_responsibilities && role.key_responsibilities.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Key Responsibilities</h4>
                            <ul className="space-y-2">
                                {role.key_responsibilities.map((responsibility, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span>{responsibility}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Success Metrics */}
                    {role.success_metrics && role.success_metrics.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Success Metrics</h4>
                            <ul className="space-y-2">
                                {role.success_metrics.map((metric, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                        <Target className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>{metric}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Salary Range */}
                    {role.salary_range && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-800">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    Salary Range: ${role.salary_range.min?.toLocaleString()} - ${role.salary_range.max?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Readiness Score */}
            {readinessData && (
                <ReadinessScore 
                    score={readinessData.overall}
                    breakdown={readinessData.breakdown}
                    remainingSteps={readinessData.remainingSteps}
                />
            )}

            {/* Development Plan */}
            {careerPath ? (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                            Your Development Plan
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            {careerPath.brief_description || `Personalized path from ${currentUserRole} to ${role.title}`}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Core Competencies */}
                        {careerPath.core_competencies && careerPath.core_competencies.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Core Competencies to Develop</h4>
                                <div className="space-y-2">
                                    {careerPath.core_competencies.map((comp, index) => (
                                        <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-purple-900">
                                                    {comp.competency_name || comp}
                                                </span>
                                                {comp.priority && (
                                                    <Badge className={
                                                        comp.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                        comp.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }>
                                                        {comp.priority} priority
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Development Focus */}
                        {careerPath.development_focus && careerPath.development_focus.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Key Development Focus</h4>
                                <div className="space-y-3">
                                    {careerPath.development_focus.map((focus, index) => {
                                        // Handle both string and object formats
                                        const isObject = typeof focus === 'object' && focus !== null;
                                        const displayText = isObject 
                                            ? (focus.competency_name || focus.description || JSON.stringify(focus))
                                            : focus;
                                        
                                        return (
                                            <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-start gap-2">
                                                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <span className="text-sm text-blue-900">{displayText}</span>
                                                        {isObject && focus.current_gap && (
                                                            <p className="text-xs text-blue-700 mt-1">Gap: {focus.current_gap}</p>
                                                        )}
                                                        {isObject && focus.development_actions && Array.isArray(focus.development_actions) && (
                                                            <ul className="text-xs text-blue-700 mt-2 ml-4 list-disc">
                                                                {focus.development_actions.map((action, idx) => (
                                                                    <li key={idx}>{action}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Experiential Opportunities */}
                        {careerPath.experiential_opportunities && careerPath.experiential_opportunities.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Experiential Learning</h4>
                                <div className="space-y-3">
                                    {careerPath.experiential_opportunities.map((opportunity, index) => (
                                        <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <div className="flex items-start gap-2">
                                                <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-amber-900">{opportunity}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Learning Resources */}
                        {pathLearningResources.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Recommended Learning Resources</h4>
                                <div className="space-y-3">
                                    {pathLearningResources.slice(0, 4).map((resource) => (
                                        <div key={resource.id} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <h5 className="font-medium text-gray-900 text-sm mb-1">{resource.title}</h5>
                                                    <p className="text-xs text-gray-600 mb-2">{resource.provider}</p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                                                        {resource.duration_string && (
                                                            <Badge variant="outline" className="text-xs">{resource.duration_string}</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => window.open(resource.url, '_blank')}>
                                                    <Play className="w-3 h-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mentorship Suggestions */}
                        {careerPath.mentorship_suggestions && careerPath.mentorship_suggestions.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Mentorship & Sponsorship</h4>
                                <div className="space-y-3">
                                    {careerPath.mentorship_suggestions.map((suggestion, index) => (
                                        <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-start gap-2">
                                                <Users className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-green-900">{suggestion}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <span className="font-medium">Typical Timeline: {careerPath.typical_duration_months} months</span>
                            </div>
                            <Badge className={
                                careerPath.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                                careerPath.difficulty_level === 'moderate' ? 'bg-blue-100 text-blue-800' :
                                careerPath.difficulty_level === 'challenging' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }>
                                {careerPath.difficulty_level?.replace('_', ' ')} path
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                            Development Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-6 text-center text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-4">
                                Development plan is being generated for this career transition.
                            </p>
                            <p className="text-sm">
                                Once complete, you'll see personalized development steps, learning resources, and mentorship recommendations.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <Card className="shadow-lg border-0">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Button className="flex-1">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Discuss with Manager
                        </Button>
                        <Button variant="outline" className="flex-1">
                            <Target className="w-4 h-4 mr-2" />
                            Create Development Goals
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
