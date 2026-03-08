import React, { useState } from 'react';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Award, TrendingUp, BookOpen,
  GraduationCap, MessageSquare, Route
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import ClassManagement from './ClassManagement';
import CoachingManagement from './CoachingManagement';
import CertificateManagement from './CertificateManagement';
import ProgramAnalytics from './ProgramAnalytics';
import ParticipantManagement from './ParticipantManagement';
import ProgramsManagement from './ProgramsManagement';
import JourneysManagement from './JourneysManagement';


export default function ProgramManagerDashboard({ initialTab }) {
  const { hasPermission } = useAuth();
  
  // Check URL for tab parameter on mount
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    return urlTab || initialTab || 'programs';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Update tab when initialTab changes
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Program Manager Dashboard</h1>
          <p className="text-gray-600">Manage your programs, classes, coaching, and certificates</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 lg:w-auto lg:inline-flex">
          <TabsTrigger value="programs" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Programs</span>
          </TabsTrigger>
          <TabsTrigger value="journeys" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            <span className="hidden sm:inline">Journeys</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Participants</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Classes</span>
          </TabsTrigger>
          <TabsTrigger value="coaching" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Coaching</span>
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Certificates</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Programs Tab */}
        <TabsContent value="programs" className="mt-6">
          <ProgramsManagement />
        </TabsContent>

        {/* Journeys Tab */}
        <TabsContent value="journeys" className="mt-6">
          <JourneysManagement />
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-6">
          <ParticipantManagement />
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="mt-6">
          <ClassManagement />
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching" className="mt-6">
          <CoachingManagement />
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-6">
          <CertificateManagement />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <ProgramAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}