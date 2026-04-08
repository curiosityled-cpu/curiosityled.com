import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/useAuth';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { getMVPRole } from '@/components/mvp/MVPLayout';

import ProgramsManagement from './ProgramsManagement';
import JourneysManagement from './JourneysManagement';
import ParticipantManagement from './ParticipantManagement';
import ClassManagement from './ClassManagement';
import CoachingManagement from './CoachingManagement';
import CertificateManagement from './CertificateManagement';

export default function JourneyManagementDashboard({ initialSubTab }) {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const subtabFromUrl = searchParams.get('subtab');
  const isMVPBuyer = getMVPRole(user?.app_role) === 'buyer';
  
  const [activeTab, setActiveTab] = useState(initialSubTab || subtabFromUrl || (isMVPBuyer ? 'journeys' : 'programs'));

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    } else if (subtabFromUrl) {
      setActiveTab(subtabFromUrl);
    }
  }, [initialSubTab, subtabFromUrl]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="programs" className="mt-0">
          <ProgramsManagement onTabChange={setActiveTab} activeSubTab={activeTab} isMVPBuyer={isMVPBuyer} />
        </TabsContent>

        <TabsContent value="journeys" className="mt-0">
          <JourneysManagement onTabChange={setActiveTab} activeSubTab={activeTab} />
        </TabsContent>

        <TabsContent value="participants" className="mt-0">
          <ParticipantManagement onTabChange={setActiveTab} activeSubTab={activeTab} />
        </TabsContent>

        <TabsContent value="classes" className="mt-0">
          <ClassManagement onTabChange={setActiveTab} activeSubTab={activeTab} />
        </TabsContent>

        <TabsContent value="coaching" className="mt-0">
          <CoachingManagement onTabChange={setActiveTab} activeSubTab={activeTab} />
        </TabsContent>

        <TabsContent value="certificates" className="mt-0">
          <CertificateManagement onTabChange={setActiveTab} activeSubTab={activeTab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}