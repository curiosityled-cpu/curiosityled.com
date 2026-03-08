import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, CheckCircle2, Target, TrendingUp, Calendar, Award } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LearningRecommendations from "@/components/learning/LearningRecommendations";
import CertificateViewer from "@/components/learning/CertificateViewer";

export default function MyLearning() {
    const { user } = useAuth();
    const [assignedLearning, setAssignedLearning] = useState([]);
    const [learnerProgress, setLearnerProgress] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        
        try {
            const [assigned, progress, allPrograms] = await Promise.all([
                base44.entities.AssignedLearning.filter({ user_email: user.email }),
                base44.entities.LearnerProgress.filter({ user_email: user.email }),
                base44.entities.Program.list()
            ]);

            setAssignedLearning(assigned);
            setLearnerProgress(progress);
            setPrograms(allPrograms);
        } catch (error) {
            console.error('Error loading learning data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressForResource = (resourceId) => {
        return learnerProgress.find(p => p.learning_resource_id === resourceId);
    };

    const calculateOverallProgress = () => {
        if (learnerProgress.length === 0) return 0;
        const total = learnerProgress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0);
        return Math.round(total / learnerProgress.length);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-800' },
            in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
            completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
            abandoned: { label: 'Paused', className: 'bg-orange-100 text-orange-800' }
        };
        const config = statusConfig[status] || statusConfig.not_started;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const recentlyAccessed = [...learnerProgress]
        .sort((a, b) => new Date(b.last_accessed_date) - new Date(a.last_accessed_date))
        .slice(0, 5);

    const inProgressItems = learnerProgress.filter(p => p.status === 'in_progress');
    const completedItems = learnerProgress.filter(p => p.status === 'completed');

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your learning journey...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning</h1>
                    <p className="text-gray-600">Track progress and continue the development journey</p>
                </motion.div>

                {/* Overview Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Target className="w-8 h-8 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                            <p className="text-3xl font-bold text-gray-900">{calculateOverallProgress()}%</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <TrendingUp className="w-8 h-8 text-green-600" />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">In Progress</p>
                            <p className="text-3xl font-bold text-gray-900">{inProgressItems.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Completed</p>
                            <p className="text-3xl font-bold text-gray-900">{completedItems.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Calendar className="w-8 h-8 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Assigned</p>
                            <p className="text-3xl font-bold text-gray-900">{assignedLearning.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="assigned" className="space-y-6">
                    <TabsList className="bg-white shadow-sm">
                        <TabsTrigger value="assigned">Assigned Learning</TabsTrigger>
                        <TabsTrigger value="progress">Progress</TabsTrigger>
                        <TabsTrigger value="recent">Recently Accessed</TabsTrigger>
                        <TabsTrigger value="certificates">
                            <Award className="w-4 h-4 mr-2" />
                            Certificates
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assigned" className="space-y-4">
                        {assignedLearning.length === 0 ? (
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-12 text-center">
                                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-xl font-semibold mb-2">No Assigned Learning</h3>
                                    <p className="text-gray-600 mb-4">You don't have any assigned learning yet.</p>
                                    <Link to={createPageUrl('Development')}>
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            Browse Learning Library
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            assignedLearning.map((item, index) => {
                                const progress = getProgressForResource(item.learning_resource_id);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                                                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                                        <div className="flex gap-2 items-center">
                                                            {getStatusBadge(item.status)}
                                                            {item.priority && (
                                                                <Badge variant="outline" className="capitalize">
                                                                    {item.priority} Priority
                                                                </Badge>
                                                            )}
                                                            {item.due_date && (
                                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                                    <Clock className="w-4 h-4" />
                                                                    Due: {new Date(item.due_date).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {progress && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">Progress</span>
                                                            <span className="font-medium">{progress.progress_percentage || 0}%</span>
                                                        </div>
                                                        <Progress value={progress.progress_percentage || 0} />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </TabsContent>

                    <TabsContent value="progress" className="space-y-4">
                        {learnerProgress.length === 0 ? (
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-12 text-center">
                                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-xl font-semibold mb-2">No Progress Yet</h3>
                                    <p className="text-gray-600">Start learning to track your progress.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            learnerProgress.map((progress, index) => (
                                <motion.div
                                    key={progress.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="shadow-lg border-0">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-semibold text-lg">Learning Resource</h3>
                                                        {getStatusBadge(progress.status)}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        Last accessed: {new Date(progress.last_accessed_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Progress</span>
                                                    <span className="font-medium">{progress.progress_percentage || 0}%</span>
                                                </div>
                                                <Progress value={progress.progress_percentage || 0} />
                                            </div>
                                            {progress.notes && progress.notes.length > 0 && (
                                                <div className="mt-4 pt-4 border-t">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Notes ({progress.notes.length})</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="recent" className="space-y-4">
                        {recentlyAccessed.length === 0 ? (
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-12 text-center">
                                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
                                    <p className="text-gray-600">Your recently accessed resources will appear here.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            recentlyAccessed.map((progress, index) => (
                                <motion.div
                                    key={progress.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">Learning Resource</h3>
                                                    <p className="text-sm text-gray-600">
                                                        Accessed {new Date(progress.last_accessed_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(progress.status)}
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-gray-900">
                                                            {progress.progress_percentage || 0}%
                                                        </p>
                                                        <p className="text-xs text-gray-500">Complete</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="certificates">
                        <CertificateViewer />
                    </TabsContent>
                </Tabs>

                {/* AI Recommendations */}
                <div className="mt-8">
                    <LearningRecommendations />
                </div>
            </div>
        </div>
    );
}