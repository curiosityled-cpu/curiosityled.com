import React, { useState } from "react";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Target, BarChart3, Settings, Sparkles, Layout } from "lucide-react";
import LevelConfigurator from "@/components/gamification/admin/LevelConfigurator";
import BadgeDesigner from "@/components/gamification/admin/BadgeDesigner";
import PointValueManager from "@/components/gamification/admin/PointValueManager";
import CompetitionCreator from "@/components/gamification/admin/CompetitionCreator";
import LeaderboardDesigner from "@/components/gamification/admin/LeaderboardDesigner";
import GamificationSettingsPanel from "@/components/gamification/admin/GamificationSettingsPanel";
import GamificationAnalytics from "@/components/gamification/admin/GamificationAnalytics";
import AIGamificationAssistant from "@/components/gamification/admin/AIGamificationAssistant";
import TemplateBrowser from "@/components/gamification/admin/TemplateBrowser";

export default function GamificationManager() {
  const { user, hasAdminAccess } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin access to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gamification Manager</h1>
          <p className="text-gray-600">Configure and manage your organization's gamification system</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-9 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="levels" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Levels</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Points</span>
            </TabsTrigger>
            <TabsTrigger value="competitions" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Competitions</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboards</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TemplateBrowser />
          </TabsContent>

          <TabsContent value="levels">
            <LevelConfigurator />
          </TabsContent>

          <TabsContent value="badges">
            <BadgeDesigner />
          </TabsContent>

          <TabsContent value="points">
            <PointValueManager />
          </TabsContent>

          <TabsContent value="competitions">
            <CompetitionCreator />
          </TabsContent>

          <TabsContent value="leaderboards">
            <LeaderboardDesigner />
          </TabsContent>

          <TabsContent value="settings">
            <GamificationSettingsPanel />
          </TabsContent>

          <TabsContent value="analytics">
            <GamificationAnalytics />
          </TabsContent>

          <TabsContent value="ai">
            <AIGamificationAssistant />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}