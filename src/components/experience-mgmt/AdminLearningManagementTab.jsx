import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConversationalLearningTab from "@/components/dev-manager/ConversationalLearningTab";
import CoursesTab from "@/components/dev-manager/CoursesTab";
import CatalogBrowse from "@/components/dev-manager/CatalogBrowse";
import ResourceLibraryTab from "@/components/dev-manager/ResourceLibraryTab";
import { useAuth } from "@/components/useAuth";

/**
 * AdminLearningManagementTab — the content workspace.
 *
 * Catalog holds what a learner can be enrolled in: courses and journeys.
 * Resources (the raw material a course embeds) sit in their own tab, which only
 * HR Admins (Admin Level 2) and above can see at all.
 */
export default function AdminLearningManagementTab({ user, onOpenExperiences }) {
  const { isPlatformAdmin, hasAdminAccess } = useAuth();
  const canManageResources = isPlatformAdmin || hasAdminAccess;
  const [tab, setTab] = useState("catalog");

  const activeTab = tab === "resources" && !canManageResources ? "catalog" : tab;

  return (
    <Tabs value={activeTab} onValueChange={setTab}>
      <TabsList className="bg-gray-100 rounded-xl p-1">
        <TabsTrigger value="catalog" className="rounded-lg text-xs">Catalog</TabsTrigger>
        <TabsTrigger value="courses" className="rounded-lg text-xs">Courses</TabsTrigger>
        <TabsTrigger value="conversational" className="rounded-lg text-xs">Conversational Learning</TabsTrigger>
        {canManageResources && (
          <TabsTrigger value="resources" className="rounded-lg text-xs">Resources</TabsTrigger>
        )}
      </TabsList>

      {/* ── CATALOG (courses + journeys) ── */}
      <TabsContent value="catalog" className="mt-4">
        <CatalogBrowse
          onManageCourses={() => setTab("courses")}
          onManageJourneys={() => onOpenExperiences?.()}
        />
      </TabsContent>

      {/* ── COURSES ── */}
      <TabsContent value="courses" className="mt-4">
        <CoursesTab user={user} />
      </TabsContent>

      {/* ── CONVERSATIONAL LEARNING ── */}
      <TabsContent value="conversational" className="mt-4">
        <ConversationalLearningTab user={user} />
      </TabsContent>

      {/* ── RESOURCES (HR Admin and above only) ── */}
      {canManageResources && (
        <TabsContent value="resources" className="mt-4">
          <ResourceLibraryTab user={user} />
        </TabsContent>
      )}
    </Tabs>
  );
}