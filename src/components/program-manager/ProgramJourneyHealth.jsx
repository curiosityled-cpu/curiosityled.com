import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Map, Users, CheckCircle, AlertTriangle, TrendingUp, 
  Loader2, ChevronRight, BookOpen, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProgramJourneyHealth({ programId, journeyIds = [], participantEmails = [] }) {
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    if (journeyIds.length > 0) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [journeyIds.length, participantEmails.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load journey details using $in operator for efficiency
      const loadedJourneys = await base44.entities.LearningJourney.filter({ 
        id: { $in: journeyIds } 
      });
      setJourneys(loadedJourneys);

      // Load enrollments for these journeys
      if (loadedJourneys.length > 0) {
        const allEnrollments = await base44.entities.JourneyEnrollment.filter({
          journey_id: { $in: journeyIds }
        });
        // Filter to only program participants if specified
        const filteredEnrollments = participantEmails.length > 0
          ? allEnrollments.filter(e => participantEmails.includes(e.user_email))
          : allEnrollments;
        setEnrollments(filteredEnrollments);
      }
    } catch (error) {
      console.error('Error loading journey health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const journeyMetrics = useMemo(() => {
    return journeys.map(journey => {
      const journeyEnrollments = enrollments.filter(e => e.journey_id === journey.id);
      const totalEnrolled = journeyEnrollments.length;
      const completed = journeyEnrollments.filter(e => e.status === 'completed').length;
      const inProgress = journeyEnrollments.filter(e => e.status === 'in_progress').length;
      const notStarted = journeyEnrollments.filter(e => e.status === 'not_started').length;
      const atRisk = journeyEnrollments.filter(e => 
        e.status === 'in_progress' && 
        e.completion_percentage < 30 &&
        e.enrolled_date && 
        (new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24) > 14
      ).length;

      const avgCompletion = totalEnrolled > 0
        ? journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrolled
        : 0;

      return {
        journey,
        totalEnrolled,
        completed,
        inProgress,
        notStarted,
        atRisk,
        avgCompletion,
        completionRate: totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0
      };
    });
  }, [journeys, enrollments]);

  const overallMetrics = useMemo(() => {
    const totalEnrolled = enrollments.length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const atRisk = journeyMetrics.reduce((sum, jm) => sum + jm.atRisk, 0);
    const avgCompletion = totalEnrolled > 0
      ? enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrolled
      : 0;

    return {
      totalEnrolled,
      completed,
      atRisk,
      avgCompletion,
      completionRate: totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0
    };
  }, [enrollments, journeyMetrics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (journeyIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Map className="w-5 h-5 text-purple-600" />
            Journey Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Map className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No journeys assigned to this program</p>
            <p className="text-sm mt-1">Add journeys to track participant progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Map className="w-5 h-5 text-purple-600" />
              Journey Health
            </CardTitle>
            <CardDescription>
              Progress across {journeys.length} assigned journey{journeys.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Link to={createPageUrl("JourneyAnalytics")}>
            <Button variant="outline" size="sm">
              View Full Analytics <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-purple-50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Avg Progress</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {Math.round(overallMetrics.avgCompletion)}%
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 bg-green-50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {overallMetrics.completed}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-blue-50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Enrolled</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {overallMetrics.totalEnrolled}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-orange-50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">At Risk</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {overallMetrics.atRisk}
            </p>
          </motion.div>
        </div>

        {/* Individual Journey Progress */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Journey Breakdown</h4>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {journeyMetrics.map((jm, index) => (
                <motion.div
                  key={jm.journey.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">
                        {jm.journey.title}
                      </h5>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {jm.journey.content_structure?.length || 0} resources
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {jm.totalEnrolled} enrolled
                        </span>
                        {jm.journey.estimated_duration_days && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {jm.journey.estimated_duration_days} days
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {jm.atRisk > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {jm.atRisk} at risk
                        </Badge>
                      )}
                      <Badge 
                        className={
                          jm.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                          jm.completionRate >= 50 ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {Math.round(jm.completionRate)}% complete
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Average Progress</span>
                      <span>{Math.round(jm.avgCompletion)}%</span>
                    </div>
                    <Progress value={jm.avgCompletion} className="h-2" />
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-green-600">{jm.completed} completed</span>
                    <span className="text-blue-600">{jm.inProgress} in progress</span>
                    <span className="text-gray-500">{jm.notStarted} not started</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}