import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, ChevronDown, ChevronRight, Loader2, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DivisionTeamSelector({ selectedEmails = [], onSelectionChange }) {
  const [loading, setLoading] = useState(true);
  const [teamsData, setTeamsData] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    loadTeams();
  }, [selectedDivision]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getDivisionTeams', {
        division_name: selectedDivision
      });

      if (response.data?.success) {
        setTeamsData(response.data.data);
      } else {
        toast.error('Failed to load teams');
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load division data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (managerEmail) => {
    setExpandedTeams(prev => ({
      ...prev,
      [managerEmail]: !prev[managerEmail]
    }));
  };

  const handleSelectTeam = (team) => {
    const teamEmails = team.member_emails;
    const allSelected = teamEmails.every(email => selectedEmails.includes(email));
    
    if (allSelected) {
      onSelectionChange(selectedEmails.filter(email => !teamEmails.includes(email)));
    } else {
      const newSelection = [...new Set([...selectedEmails, ...teamEmails])];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectDivision = () => {
    const divisionUsers = teamsData?.teams
      .filter(t => selectedDivision === 'all' || t.department === selectedDivision)
      .flatMap(t => t.member_emails) || [];
    
    const allSelected = divisionUsers.every(email => selectedEmails.includes(email));
    
    if (allSelected) {
      onSelectionChange(selectedEmails.filter(email => !divisionUsers.includes(email)));
    } else {
      const newSelection = [...new Set([...selectedEmails, ...divisionUsers])];
      onSelectionChange(newSelection);
    }
  };

  const handleToggleUser = (email) => {
    if (selectedEmails.includes(email)) {
      onSelectionChange(selectedEmails.filter(e => e !== email));
    } else {
      onSelectionChange([...selectedEmails, email]);
    }
  };

  const handleSelectAll = () => {
    const allEmails = teamsData?.teams.flatMap(t => t.member_emails) || [];
    const allSelected = allEmails.length > 0 && allEmails.every(email => selectedEmails.includes(email));
    
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...new Set(allEmails)]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading divisions and teams...</p>
        </CardContent>
      </Card>
    );
  }

  if (!teamsData || teamsData.teams.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No teams found</p>
        </CardContent>
      </Card>
    );
  }

  const filteredTeams = selectedDivision === 'all' 
    ? teamsData.teams 
    : teamsData.teams.filter(t => t.department === selectedDivision);

  const totalMembers = filteredTeams.reduce((sum, t) => sum + t.member_count, 0);

  return (
    <div className="space-y-4">
      {/* Division Filter and Actions */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {teamsData.divisions.map(div => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white">
                {selectedEmails.length} selected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleSelectDivision}>
                {selectedDivision === 'all' ? 'Select All' : `Select ${selectedDivision}`}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedEmails.length > 0 ? 'Clear All' : 'Select All Teams'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {filteredTeams.length} teams • {totalMembers} total members
          </p>
        </CardContent>
      </Card>

      {/* Teams List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredTeams.map((team) => {
            const isExpanded = expandedTeams[team.manager_email];
            const teamSelectedCount = team.member_emails.filter(e => selectedEmails.includes(e)).length;
            const allTeamSelected = teamSelectedCount === team.member_count;

            return (
              <motion.div
                key={team.manager_email}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className={`border ${allTeamSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTeam(team.manager_email)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-600" />
                            {team.manager_name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{team.department}</Badge>
                            <Badge variant="outline" className="text-xs">{team.member_count} members</Badge>
                            {team.manager_role && (
                              <span className="text-xs text-gray-500">{team.manager_role}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {teamSelectedCount > 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {teamSelectedCount}/{team.member_count}
                          </Badge>
                        )}
                        <Checkbox
                          checked={allTeamSelected}
                          onCheckedChange={() => handleSelectTeam(team)}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2 pl-8 border-l-2 border-gray-200 ml-3">
                        {team.members.map((member) => (
                          <div
                            key={member.email}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer hover:border-blue-300 hover:bg-blue-50 ${
                              selectedEmails.includes(member.email) ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                            }`}
                            onClick={() => handleToggleUser(member.email)}
                          >
                            <Checkbox
                              checked={selectedEmails.includes(member.email)}
                              onCheckedChange={() => handleToggleUser(member.email)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {member.full_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                            {member.current_role && (
                              <Badge variant="outline" className="text-xs">
                                {member.current_role}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}

          {/* Users Without Managers */}
          {teamsData.users_without_managers?.length > 0 && (
            <Card className="border-gray-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  Individual Contributors
                  <Badge variant="outline">{teamsData.users_without_managers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamsData.users_without_managers.map((user) => (
                    <div
                      key={user.email}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer hover:border-blue-300 hover:bg-blue-50 ${
                        selectedEmails.includes(user.email) ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                      }`}
                      onClick={() => handleToggleUser(user.email)}
                    >
                      <Checkbox
                        checked={selectedEmails.includes(user.email)}
                        onCheckedChange={() => handleToggleUser(user.email)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}