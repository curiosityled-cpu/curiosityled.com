import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Users, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function TeamHierarchySelector({ selectedEmails = [], onSelectionChange }) {
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState(null);
  const [expandedLevels, setExpandedLevels] = useState({ 1: true }); // Level 1 expanded by default

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const response = await base44.functions.invoke('getTeamHierarchy', {
        manager_email: currentUser.email
      });

      if (response.data?.success) {
        setHierarchy(response.data.data);
      } else {
        toast.error('Failed to load team hierarchy');
      }
    } catch (error) {
      console.error('Error loading hierarchy:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }));
  };

  const handleSelectLevel = (level) => {
    const levelUsers = hierarchy.hierarchy_by_level[level] || [];
    const levelEmails = levelUsers.map(u => u.email);
    
    // Check if all in this level are selected
    const allSelected = levelEmails.every(email => selectedEmails.includes(email));
    
    if (allSelected) {
      // Deselect all from this level
      onSelectionChange(selectedEmails.filter(email => !levelEmails.includes(email)));
    } else {
      // Select all from this level
      const newSelection = [...new Set([...selectedEmails, ...levelEmails])];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === hierarchy?.total_subordinates) {
      onSelectionChange([]);
    } else {
      onSelectionChange(hierarchy?.subordinate_emails || []);
    }
  };

  const handleToggleUser = (email) => {
    if (selectedEmails.includes(email)) {
      onSelectionChange(selectedEmails.filter(e => e !== email));
    } else {
      onSelectionChange([...selectedEmails, email]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading team hierarchy...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy || hierarchy.total_subordinates === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No team members found</p>
        </CardContent>
      </Card>
    );
  }

  const levels = Object.keys(hierarchy.hierarchy_by_level || {}).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-4">
      {/* Summary and Select All */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Your Team Hierarchy
              </p>
              <p className="text-xs text-gray-600">
                {hierarchy.total_subordinates} team members across {levels.length} level{levels.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-600 text-white">
                {selectedEmails.length} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedEmails.length === hierarchy.total_subordinates ? 'Clear All' : 'Select All'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Tree */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {levels.map((level) => {
            const levelUsers = hierarchy.hierarchy_by_level[level] || [];
            const isExpanded = expandedLevels[level];
            const levelSelectedCount = levelUsers.filter(u => selectedEmails.includes(u.email)).length;
            const allLevelSelected = levelSelectedCount === levelUsers.length;

            return (
              <motion.div
                key={level}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className={`border ${allLevelSelected ? 'border-blue-500' : 'border-gray-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLevel(level)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <CardTitle className="text-sm">
                          Level {level} - {levelUsers[0]?.manager_email ? 'Reports to Manager' : 'Direct Reports'}
                        </CardTitle>
                        <Badge variant="outline">{levelUsers.length} members</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {levelSelectedCount > 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {levelSelectedCount}/{levelUsers.length}
                          </Badge>
                        )}
                        <Checkbox
                          checked={allLevelSelected}
                          onCheckedChange={() => handleSelectLevel(level)}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {levelUsers.map((user) => (
                          <div
                            key={user.email}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-blue-300 hover:bg-blue-50 ${
                              selectedEmails.includes(user.email) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
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
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="truncate">{user.email}</span>
                                {user.department && (
                                  <>
                                    <span>•</span>
                                    <span>{user.department}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {user.current_role && (
                              <Badge variant="outline" className="text-xs">
                                {user.current_role}
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
        </div>
      </ScrollArea>
    </div>
  );
}