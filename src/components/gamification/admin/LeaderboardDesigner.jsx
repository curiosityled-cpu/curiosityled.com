import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function LeaderboardDesigner() {
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBoard, setEditingBoard] = useState(null);
  const [formData, setFormData] = useState({
    leaderboard_name: "",
    description: "",
    scope: "global",
    metric_type: "total_points",
    time_period: "all_time",
    display_count: 10,
    filter_config: {}
  });

  useEffect(() => {
    loadLeaderboards();
  }, [user]);

  const loadLeaderboards = async () => {
    try {
      const boards = await base44.entities.LeaderboardTemplate.filter({
        client_id: user.client_id
      });
      setLeaderboards(boards);
    } catch (error) {
      console.error("Error loading leaderboards:", error);
      toast.error("Failed to load leaderboards");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingBoard) {
        await base44.entities.LeaderboardTemplate.update(editingBoard.id, formData);
        toast.success("Leaderboard updated successfully");
      } else {
        await base44.entities.LeaderboardTemplate.create({
          ...formData,
          client_id: user.client_id
        });
        toast.success("Leaderboard created successfully");
      }
      
      setEditingBoard(null);
      resetForm();
      loadLeaderboards();
    } catch (error) {
      console.error("Error saving leaderboard:", error);
      toast.error("Failed to save leaderboard");
    }
  };

  const handleDelete = async (boardId) => {
    if (!confirm("Are you sure you want to delete this leaderboard?")) return;
    
    try {
      await base44.entities.LeaderboardTemplate.delete(boardId);
      toast.success("Leaderboard deleted successfully");
      loadLeaderboards();
    } catch (error) {
      console.error("Error deleting leaderboard:", error);
      toast.error("Failed to delete leaderboard");
    }
  };

  const handleEdit = (board) => {
    setEditingBoard(board);
    setFormData({
      leaderboard_name: board.leaderboard_name,
      description: board.description || "",
      scope: board.scope,
      metric_type: board.metric_type,
      time_period: board.time_period,
      display_count: board.display_count || 10,
      filter_config: board.filter_config || {}
    });
  };

  const resetForm = () => {
    setFormData({
      leaderboard_name: "",
      description: "",
      scope: "global",
      metric_type: "total_points",
      time_period: "all_time",
      display_count: 10,
      filter_config: {}
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
            <BarChart3 className="w-5 h-5" />
            {editingBoard ? "Edit Leaderboard" : "Create New Leaderboard"}
          </CardTitle>
          <CardDescription>Design leaderboards to showcase top performers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Leaderboard Name</Label>
            <Input
              placeholder="e.g., Top Learners, Goal Champions"
              value={formData.leaderboard_name}
              onChange={(e) => setFormData({ ...formData, leaderboard_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what this leaderboard tracks"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scope</Label>
              <Select value={formData.scope} onValueChange={(value) => setFormData({ ...formData, scope: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Users)</SelectItem>
                  <SelectItem value="cohort">Cohort</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Metric</Label>
              <Select value={formData.metric_type} onValueChange={(value) => setFormData({ ...formData, metric_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_points">Total Points</SelectItem>
                  <SelectItem value="specific_badge">Specific Badge</SelectItem>
                  <SelectItem value="competency_score">Competency Score</SelectItem>
                  <SelectItem value="learning_completion">Learning Completion</SelectItem>
                  <SelectItem value="goal_achievement">Goal Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Period</Label>
              <Select value={formData.time_period} onValueChange={(value) => setFormData({ ...formData, time_period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Display Count</Label>
              <Input
                type="number"
                value={formData.display_count}
                onChange={(e) => setFormData({ ...formData, display_count: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingBoard ? "Update Leaderboard" : "Create Leaderboard"}
            </Button>
            {editingBoard && (
              <Button variant="outline" onClick={() => { setEditingBoard(null); resetForm(); }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Leaderboards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaderboards.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No leaderboards configured yet.</p>
            ) : (
              leaderboards.map((board) => (
                <div key={board.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{board.leaderboard_name}</h3>
                      <p className="text-sm text-gray-600">{board.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{board.scope}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{board.metric_type}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{board.time_period}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(board)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(board.id)}>
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