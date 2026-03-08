import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Save, X, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function LevelConfigurator() {
  const { user } = useAuth();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    level_name: "",
    level_order: 1,
    points_threshold: 0,
    description: "",
    icon_url: "",
    prerequisite_badge_ids: []
  });

  useEffect(() => {
    loadLevels();
  }, [user]);

  const loadLevels = async () => {
    try {
      const allLevels = await base44.entities.GamificationLevel.filter(
        { client_id: user.client_id },
        'level_order'
      );
      setLevels(allLevels);
    } catch (error) {
      console.error("Error loading levels:", error);
      toast.error("Failed to load levels");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingLevel) {
        await base44.entities.GamificationLevel.update(editingLevel.id, formData);
        toast.success("Level updated successfully");
      } else {
        const { data } = await base44.functions.invoke('createGamificationLevel', formData);
        toast.success("Level created successfully");
      }
      
      setEditingLevel(null);
      resetForm();
      loadLevels();
    } catch (error) {
      console.error("Error saving level:", error);
      toast.error("Failed to save level");
    }
  };

  const handleDelete = async (levelId) => {
    if (!confirm("Are you sure you want to delete this level?")) return;
    
    try {
      await base44.entities.GamificationLevel.delete(levelId);
      toast.success("Level deleted successfully");
      loadLevels();
    } catch (error) {
      console.error("Error deleting level:", error);
      toast.error("Failed to delete level");
    }
  };

  const handleEdit = (level) => {
    setEditingLevel(level);
    setFormData({
      level_name: level.level_name,
      level_order: level.level_order,
      points_threshold: level.points_threshold,
      description: level.description || "",
      icon_url: level.icon_url || "",
      prerequisite_badge_ids: level.prerequisite_badge_ids || []
    });
  };

  const resetForm = () => {
    setFormData({
      level_name: "",
      level_order: levels.length + 1,
      points_threshold: 0,
      description: "",
      icon_url: "",
      prerequisite_badge_ids: []
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {editingLevel ? "Edit Level" : "Create New Level"}
          </CardTitle>
          <CardDescription>Configure experience levels for your gamification system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Level Name</Label>
              <Input
                placeholder="e.g., Beginner, Expert, Master"
                value={formData.level_name}
                onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Level Order</Label>
              <Input
                type="number"
                value={formData.level_order}
                onChange={(e) => setFormData({ ...formData, level_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Points Threshold</Label>
            <Input
              type="number"
              placeholder="Minimum points to reach this level"
              value={formData.points_threshold}
              onChange={(e) => setFormData({ ...formData, points_threshold: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe this level and its rewards"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Icon URL (optional)</Label>
            <Input
              placeholder="https://example.com/icon.png"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingLevel ? "Update Level" : "Create Level"}
            </Button>
            {editingLevel && (
              <Button variant="outline" onClick={() => { setEditingLevel(null); resetForm(); }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Levels</CardTitle>
          <CardDescription>Visual progression of your level system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {levels.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No levels configured yet. Create your first level above!</p>
            ) : (
              levels.map((level, index) => (
                <div key={level.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    {level.level_order}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{level.level_name}</h3>
                    <p className="text-sm text-gray-600">{level.points_threshold.toLocaleString()} points</p>
                    {level.description && <p className="text-sm text-gray-500 mt-1">{level.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(level)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(level.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
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