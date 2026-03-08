import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, GitBranch } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CascadeGoalModal({ isOpen, onClose, goal, onSuccess }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      
      if (!currentUser.subordinate_emails || currentUser.subordinate_emails.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      // Get all direct reports
      const directReports = await base44.entities.User.filter({
        email: { $in: currentUser.subordinate_emails }
      });

      // Group by teams - managers with their own subordinates form teams
      const teamList = [];
      
      // Add managers who have subordinates (team leads)
      for (const report of directReports) {
        if (report.subordinate_emails && report.subordinate_emails.length > 0) {
          const teamMembers = await base44.entities.User.filter({
            email: { $in: report.subordinate_emails }
          });
          
          teamList.push({
            leaderId: report.id,
            leaderName: report.full_name,
            leaderEmail: report.email,
            members: teamMembers,
            memberCount: teamMembers.length
          });
        }
      }

      // Also add individual contributors as "Direct Reports" team
      const individualContributors = directReports.filter(
        r => !r.subordinate_emails || r.subordinate_emails.length === 0
      );

      if (individualContributors.length > 0) {
        teamList.push({
          leaderId: 'direct',
          leaderName: 'Direct Reports',
          leaderEmail: null,
          members: individualContributors,
          memberCount: individualContributors.length
        });
      }

      setTeams(teamList);
      // Select all teams by default
      setSelectedTeams(teamList.map(t => t.leaderId));
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleCascade = async () => {
    if (selectedTeams.length === 0) return;

    setIsProcessing(true);
    try {
      // Get all team member emails from selected teams
      const selectedTeamData = teams.filter(t => selectedTeams.includes(t.leaderId));
      const targetEmails = [];

      for (const team of selectedTeamData) {
        if (team.leaderId === 'direct') {
          // For direct reports, cascade to them directly
          targetEmails.push(...team.members.map(m => m.email));
        } else {
          // For teams with a leader, cascade to the leader
          targetEmails.push(team.leaderEmail);
        }
      }

      await base44.functions.invoke('cascadeGoals', {
        goal_id: goal.id,
        target_emails: targetEmails
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error cascading goal:', error);
      // Show error via toast instead of alert
      import('sonner').then(({ toast }) => {
        toast.error('Failed to cascade goal: ' + error.message);
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            Cascade Goal to Teams
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : teams.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No teams found</p>
            <p className="text-sm mt-1">You need direct reports to cascade goals</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Select which teams should receive this goal. A copy will be created for each team lead or member.
              </p>

              <div className="border border-gray-200 rounded-lg divide-y">
                {teams.map((team) => (
                  <div key={team.leaderId} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`team-${team.leaderId}`}
                        checked={selectedTeams.includes(team.leaderId)}
                        onCheckedChange={() => toggleTeam(team.leaderId)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`team-${team.leaderId}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {team.leaderName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {team.members.slice(0, 3).map(m => m.full_name).join(', ')}
                          {team.members.length > 3 && ` +${team.members.length - 3} more`}
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTeams.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedTeams.length}</strong> {selectedTeams.length === 1 ? 'team' : 'teams'} selected
                    {' · '}
                    <strong>
                      {teams
                        .filter(t => selectedTeams.includes(t.leaderId))
                        .reduce((sum, t) => sum + (t.leaderId === 'direct' ? t.memberCount : 1), 0)}
                    </strong> {' goal copies will be created'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCascade}
                disabled={selectedTeams.length === 0 || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cascading...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Cascade Goal
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}