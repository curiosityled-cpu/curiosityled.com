import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function GamificationSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    peer_point_budget_weekly: 100,
    manager_point_budget_weekly: 500,
    point_giving_enabled: true,
    leaderboard_visibility: "public",
    gamification_enabled: true,
    badge_notifications_enabled: true,
    level_up_notifications_enabled: true
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const allSettings = await base44.entities.GamificationSettings.filter({
        client_id: user.client_id
      });
      
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.functions.invoke('updateGamificationSettings', settings);
      toast.success("Settings saved successfully");
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gamification Settings
          </CardTitle>
          <CardDescription>Configure global gamification settings for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Gamification</Label>
                <p className="text-sm text-gray-600">Master switch for all gamification features</p>
              </div>
              <Switch
                checked={settings.gamification_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, gamification_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Point Giving</Label>
                <p className="text-sm text-gray-600">Allow peer-to-peer and manager point awards</p>
              </div>
              <Switch
                checked={settings.point_giving_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, point_giving_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Badge Notifications</Label>
                <p className="text-sm text-gray-600">Notify users when they earn badges</p>
              </div>
              <Switch
                checked={settings.badge_notifications_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, badge_notifications_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Level Up Notifications</Label>
                <p className="text-sm text-gray-600">Notify users when they level up</p>
              </div>
              <Switch
                checked={settings.level_up_notifications_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, level_up_notifications_enabled: checked })}
              />
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-lg">Point Budgets</h3>
            
            <div>
              <Label>Peer Point Budget (Weekly)</Label>
              <p className="text-sm text-gray-600 mb-2">Points each user can give to peers per week</p>
              <Input
                type="number"
                value={settings.peer_point_budget_weekly}
                onChange={(e) => setSettings({ ...settings, peer_point_budget_weekly: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label>Manager Point Budget (Weekly)</Label>
              <p className="text-sm text-gray-600 mb-2">Points managers can award to their teams per week</p>
              <Input
                type="number"
                value={settings.manager_point_budget_weekly}
                onChange={(e) => setSettings({ ...settings, manager_point_budget_weekly: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}