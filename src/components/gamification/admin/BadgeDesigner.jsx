import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function BadgeDesigner() {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState(null);
  const [formData, setFormData] = useState({
    badge_name: "",
    description: "",
    badge_category: "completion",
    criteria_type: "single_event",
    criteria_config: {},
    points_awarded: 50,
    rarity: "common",
    icon_url: ""
  });

  useEffect(() => {
    loadBadges();
  }, [user]);

  const loadBadges = async () => {
    try {
      const allBadges = await base44.entities.BadgeTemplate.filter({
        '$or': [
          { client_id: user.client_id },
          { is_platform_default: true, client_id: null }
        ]
      });
      setBadges(allBadges);
    } catch (error) {
      console.error("Error loading badges:", error);
      toast.error("Failed to load badges");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingBadge) {
        await base44.entities.BadgeTemplate.update(editingBadge.id, formData);
        toast.success("Badge updated successfully");
      } else {
        const { data } = await base44.functions.invoke('createBadgeTemplate', formData);
        toast.success("Badge created successfully");
      }
      
      setEditingBadge(null);
      resetForm();
      loadBadges();
    } catch (error) {
      console.error("Error saving badge:", error);
      toast.error("Failed to save badge");
    }
  };

  const handleDelete = async (badgeId) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;
    
    try {
      await base44.entities.BadgeTemplate.delete(badgeId);
      toast.success("Badge deleted successfully");
      loadBadges();
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast.error("Failed to delete badge");
    }
  };

  const handleEdit = (badge) => {
    setEditingBadge(badge);
    setFormData({
      badge_name: badge.badge_name,
      description: badge.description || "",
      badge_category: badge.badge_category,
      criteria_type: badge.criteria_type,
      criteria_config: badge.criteria_config || {},
      points_awarded: badge.points_awarded || 50,
      rarity: badge.rarity || "common",
      icon_url: badge.icon_url || ""
    });
  };

  const resetForm = () => {
    setFormData({
      badge_name: "",
      description: "",
      badge_category: "completion",
      criteria_type: "single_event",
      criteria_config: {},
      points_awarded: 50,
      rarity: "common",
      icon_url: ""
    });
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: "bg-gray-100 text-gray-800",
      uncommon: "bg-green-100 text-green-800",
      rare: "bg-blue-100 text-blue-800",
      epic: "bg-purple-100 text-purple-800",
      legendary: "bg-yellow-100 text-yellow-800"
    };
    return colors[rarity] || colors.common;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {editingBadge ? "Edit Badge" : "Create New Badge"}
          </CardTitle>
          <CardDescription>Design badges to recognize achievements and milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Badge Name</Label>
              <Input
                placeholder="e.g., Goal Crusher, Learning Champion"
                value={formData.badge_name}
                onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Points Awarded</Label>
              <Input
                type="number"
                value={formData.points_awarded}
                onChange={(e) => setFormData({ ...formData, points_awarded: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe how to earn this badge"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.badge_category} onValueChange={(value) => setFormData({ ...formData, badge_category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                  <SelectItem value="recognition">Recognition</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Criteria Type</Label>
              <Select value={formData.criteria_type} onValueChange={(value) => setFormData({ ...formData, criteria_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_event">Single Event</SelectItem>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="manual">Manual Award</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rarity</Label>
              <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Icon URL (optional)</Label>
            <Input
              placeholder="https://example.com/badge-icon.png"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingBadge ? "Update Badge" : "Create Badge"}
            </Button>
            {editingBadge && (
              <Button variant="outline" onClick={() => { setEditingBadge(null); resetForm(); }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badge Library</CardTitle>
          <CardDescription>All configured badges in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.length === 0 ? (
              <p className="text-gray-500 text-center py-8 col-span-full">No badges configured yet. Create your first badge above!</p>
            ) : (
              badges.map((badge) => (
                <div key={badge.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{badge.badge_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getRarityColor(badge.rarity)}`}>
                        {badge.rarity}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-600">+{badge.points_awarded} points</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(badge)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(badge.id)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}