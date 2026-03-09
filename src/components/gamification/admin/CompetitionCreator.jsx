import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function CompetitionCreator() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    competition_name: "",
    description: "",
    competition_type: "individual",
    start_date: "",
    end_date: "",
    criteria_config: {},
    rewards: []
  });

  useEffect(() => {
    loadCompetitions();
  }, [user]);

  const loadCompetitions = async () => {
    try {
      const allCompetitions = await base44.entities.Competition.filter({
        client_id: user.client_id
      }, '-start_date');
      setCompetitions(allCompetitions);
    } catch (error) {
      console.error("Error loading competitions:", error);
      toast.error("Failed to load competitions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data } = await base44.functions.invoke('createCompetition', formData);
      toast.success("Competition created successfully");
      resetForm();
      loadCompetitions();
    } catch (error) {
      console.error("Error creating competition:", error);
      toast.error("Failed to create competition");
    }
  };

  const resetForm = () => {
    setFormData({
      competition_name: "",
      description: "",
      competition_type: "individual",
      start_date: "",
      end_date: "",
      criteria_config: {},
      rewards: []
    });
  };

  const getStatusBadge = (competition) => {
    const now = new Date();
    const start = new Date(competition.start_date);
    const end = new Date(competition.end_date);
    
    if (now < start) {
      return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Upcoming</span>;
    } else if (now >= start && now <= end) {
      return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Active</span>;
    } else {
      return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Completed</span>;
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
            <Trophy className="w-5 h-5" />
            Create Competition
          </CardTitle>
          <CardDescription>Launch competitions to boost engagement and friendly rivalry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Competition Name</Label>
            <Input
              placeholder="e.g., Q1 Learning Challenge"
              value={formData.competition_name}
              onChange={(e) => setFormData({ ...formData, competition_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the competition rules and objectives"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.competition_type} onValueChange={(value) => setFormData({ ...formData, competition_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="cohort">Cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Competition
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active & Upcoming Competitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No competitions yet. Create your first competition above!</p>
            ) : (
              competitions.map((competition) => (
                <div key={competition.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{competition.competition_name}</h3>
                      <p className="text-sm text-gray-600">{competition.description}</p>
                    </div>
                    {getStatusBadge(competition)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(competition.start_date).toLocaleDateString()} - {new Date(competition.end_date).toLocaleDateString()}
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">
                      {competition.competition_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {competition.participant_emails?.length || 0} participants
                    </span>
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