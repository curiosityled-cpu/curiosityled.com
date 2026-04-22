import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Plus, Sparkles, Award, Lock, CheckCircle2, Layers, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

export default function ResourceCard({ 
    resource, 
    recommendation, 
    onAssignClick,
    showAssignButton = false,
    onAddToJourneyClick,
    showSelfAssign = false,
}) {
    const { user } = useAuth();
    const [selfAssigning, setSelfAssigning] = React.useState(false);
    const [progress, setProgress] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAccess();
    }, [resource, user]);

    const handleSelfAssign = async () => {
        setSelfAssigning(true);
        try {
            const me = await base44.auth.me();
            if (!me?.email) throw new Error("Not authenticated");
            
            await base44.entities.AssignedLearning.create({
                user_email: me.email,
                learning_resource_id: resource.id,
                assigned_by: me.email,
                title: resource.title,
                description: resource.description || "",
                status: "assigned",
                client_id: me.client_id || null,
            });
            
            await base44.entities.LearnerProgress.create({
                user_email: me.email,
                learning_resource_id: resource.id,
                status: 'not_started',
                progress_percentage: 0,
                last_accessed_date: new Date().toISOString()
            });
            
            toast.success("Added to your learning progress!");
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('learningAssigned', { detail: { resource_id: resource.id } }));
            }
            await checkAccess();
        } catch (err) {
            toast.error("Failed to assign: " + (err?.message || "Unknown error"));
        } finally {
            setSelfAssigning(false);
        }
    };

    const checkAccess = async () => {
        if (!user) return;
        
        try {
            // Check user's progress for this resource
            const userProgress = await base44.entities.LearnerProgress.filter({
                user_email: user.email,
                learning_resource_id: resource.id
            });
            
            if (userProgress.length > 0) {
                setProgress(userProgress[0]);
            }

            // Check prerequisites
            if (resource.prerequisite_resource_ids && resource.prerequisite_resource_ids.length > 0) {
                const prereqProgress = await base44.entities.LearnerProgress.filter({
                    user_email: user.email,
                    learning_resource_id: { $in: resource.prerequisite_resource_ids }
                });

                const completedPrereqs = prereqProgress.filter(p => p.status === 'completed');
                if (completedPrereqs.length < resource.prerequisite_resource_ids.length) {
                    setIsLocked(true);
                }
            }
        } catch (error) {
            console.error('Error checking access:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccess = async () => {
        if (isLocked) return;

        // Track access
        try {
            if (!progress) {
                await base44.entities.LearnerProgress.create({
                    user_email: user.email,
                    learning_resource_id: resource.id,
                    status: 'in_progress',
                    progress_percentage: 0,
                    last_accessed_date: new Date().toISOString()
                });
            } else {
                await base44.entities.LearnerProgress.update(progress.id, {
                    last_accessed_date: new Date().toISOString(),
                    status: progress.status === 'not_started' ? 'in_progress' : progress.status
                });
            }
            
            window.open(resource.url, '_blank');
        } catch (error) {
            console.error('Error tracking access:', error);
            window.open(resource.url, '_blank');
        }
    };

    return (
        <Card className={`border-0 shadow-lg hover:shadow-xl transition-all h-full flex flex-col ${
            recommendation ? 'ring-2 ring-purple-500' : ''
        } ${isLocked ? 'opacity-60' : ''}`}>
            <CardHeader>
                {resource.thumbnail_url && (
                    <div className="relative">
                        <img
                            src={resource.thumbnail_url}
                            alt={resource.title}
                            className="w-full h-40 object-cover rounded-md mb-3"
                        />
                        {isLocked && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center">
                                <Lock className="w-12 h-12 text-white" />
                            </div>
                        )}
                        {progress?.status === 'completed' && !isLocked && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                        {resource.type}
                    </Badge>
                    {recommendation && !isLocked && (
                        <Badge className="bg-purple-600 text-white text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Pick
                        </Badge>
                    )}
                    {isLocked && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                {resource.author && (
                    <p className="text-sm text-gray-600">by {resource.author}</p>
                )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {resource.description}
                </p>

                {/* Progress Bar */}
                {progress && !isLocked && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-blue-900">Your Progress</span>
                            <span className="text-blue-700">{progress.progress_percentage || 0}%</span>
                        </div>
                        <Progress value={progress.progress_percentage || 0} className="h-2" />
                        {progress.status === 'completed' && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed on {new Date(progress.completed_date).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                )}

                {isLocked && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                            Complete prerequisites to unlock this resource
                        </p>
                    </div>
                )}

                <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-1">
                        {resource.competencies?.slice(0, 3).map((comp, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {comp}
                            </Badge>
                        ))}
                        {resource.competencies?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{resource.competencies.length - 3} more
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{resource.provider}</span>
                        {resource.duration_string && (
                            <span>{resource.duration_string}</span>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <Badge className={
                            resource.access === 'Free'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                        }>
                            {resource.access}
                        </Badge>
                        {resource.year && (
                            <span className="text-xs text-gray-500">{resource.year}</span>
                        )}
                    </div>
                </div>

                {/* AI Recommendation Reason */}
                {recommendation && !isLocked && (
                    <div className="mt-auto pt-4 border-t border-purple-100 mb-4">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-purple-900 mb-1">
                                    Why this is recommended:
                                </p>
                                <p className="text-xs text-purple-800">
                                    {recommendation.reason}
                                </p>
                                <Badge className="bg-purple-100 text-purple-800 text-xs mt-2">
                                    <Award className="w-3 h-3 mr-1" />
                                    Priority: {recommendation.priority_score}/10
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mt-auto">
                    <Button
                        onClick={handleAccess}
                        className="flex-1"
                        variant="outline"
                        disabled={isLocked}
                    >
                        {isLocked ? (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Locked
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Access
                            </>
                        )}
                    </Button>
                    {showSelfAssign && !isLocked && (
                        <Button
                            type="button"
                            onClick={handleSelfAssign}
                            disabled={selfAssigning}
                            variant="outline"
                            size="sm"
                            title="Assign to myself"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <UserPlus className="w-4 h-4" />
                        </Button>
                    )}
                    {onAddToJourneyClick && !isLocked && (
                        <Button
                            type="button"
                            onClick={() => onAddToJourneyClick(resource)}
                            variant="outline"
                            size="sm"
                            title="Add to Journey"
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                            <Layers className="w-4 h-4" />
                        </Button>
                    )}
                    {showAssignButton && (
                        <Button
                            onClick={() => onAssignClick(resource)}
                            variant="secondary"
                            size="sm"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}