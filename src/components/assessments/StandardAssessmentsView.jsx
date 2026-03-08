import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, BarChart3, TrendingUp, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function StandardAssessmentsView() {
  const [userAssessment, setUserAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAssessment();
  }, []);

  const loadUserAssessment = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (user?.email) {
        const assessments = await base44.entities.Assessment.filter(
          { email: user.email },
          '-created_date',
          1
        );
        if (assessments.length > 0) {
          setUserAssessment(assessments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const standardAssessments = [
    {
      id: 'leadership-index',
      title: 'Leadership Index Assessment',
      description: 'Comprehensive evaluation of your leadership capabilities across 6 core competencies: Situational Intelligence, Decision Making, Communication, Resource Management, Stakeholder Management, and Performance Management.',
      duration: '20-30 min',
      status: userAssessment ? 'completed' : 'available',
      url: 'LeadershipAssessment',
      icon: Brain,
      color: '#A25DDC',
      resultsUrl: 'AssessmentResults'
    },
    {
      id: 'situational-leadership',
      title: 'Situational Leadership Style',
      description: 'Discover your preferred leadership style and learn how to adapt your approach to different team situations and developmental stages.',
      duration: '15-20 min',
      status: 'coming_soon',
      url: null,
      icon: BarChart3,
      color: '#0202ff'
    },
    {
      id: 'emotional-intelligence',
      title: 'Emotional Intelligence (EQ)',
      description: 'Measure your emotional awareness, empathy, and interpersonal skills to better understand how you connect with and influence others.',
      duration: '15-20 min',
      status: 'coming_soon',
      url: null,
      icon: TrendingUp,
      color: '#10B981'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Validated Leadership Assessments</h2>
        <p className="text-gray-600">Research-backed assessments to measure and develop your leadership capabilities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {standardAssessments.map((assessment, idx) => {
          const Icon = assessment.icon;
          return (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${assessment.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: assessment.color }} />
                    </div>
                    {assessment.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {assessment.status === 'coming_soon' && (
                      <Badge variant="outline" className="text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                    {assessment.status === 'available' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Available
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{assessment.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 flex-grow">{assessment.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <span className="text-xs text-gray-500">{assessment.duration}</span>
                    {assessment.status === 'completed' ? (
                      <Link to={createPageUrl(assessment.resultsUrl)}>
                        <Button variant="outline" size="sm">
                          View Results
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ) : assessment.status === 'available' ? (
                      <Link to={createPageUrl(assessment.url)}>
                        <Button size="sm" style={{ backgroundColor: assessment.color }} className="text-white">
                          Start Assessment
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {userAssessment && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Latest Leadership Index Results</h3>
                <p className="text-gray-600">
                  Overall Score: <span className="font-bold text-purple-600">{userAssessment.overall_pct}%</span>
                  {userAssessment.archetype_label && (
                    <> • Archetype: <span className="font-bold text-blue-600">{userAssessment.archetype_label}</span></>
                  )}
                </p>
              </div>
              <Link to={createPageUrl('AssessmentResults')}>
                <Button>
                  View Full Results
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}