import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";


const TIMEFRAMES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' }
];

const LEADERSHIP_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'leading_self', label: 'Leading Self' },
  { value: 'leading_others', label: 'Leading Others' },
  { value: 'leading_managers', label: 'Leading Managers' },
  { value: 'leading_functions', label: 'Leading Functions' },
  { value: 'leading_organizations', label: 'Leading Organizations' }
];

export default function InsightsFilters({ 
  viewScope = 'my', // 'my', 'team', 'org'
  filters,
  onFiltersChange,
  showClient = false,
  showUserGroup = false,
  showLeadershipLevel = true,
  showCompetency = true,
  showDepartment = false,
  clients = [],
  userGroups = [],
  competencies = [],
  departments = []
}) {
  const [localFilters, setLocalFilters] = useState(filters || {
    timeframe: '30d',
    startDate: null,
    endDate: null,
    clientId: 'all',
    userGroupId: 'all',
    leadershipLevel: 'all',
    competencyId: 'all',
    department: 'all'
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    if (filters) {
      setLocalFilters(filters);
    }
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    
    if (key === 'timeframe' && value === 'custom') {
      setShowCustomDatePicker(true);
    } else if (key === 'timeframe') {
      setShowCustomDatePicker(false);
      newFilters.startDate = null;
      newFilters.endDate = null;
    }
    
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      timeframe: '30d',
      startDate: null,
      endDate: null,
      clientId: 'all',
      userGroupId: 'all',
      leadershipLevel: 'all',
      competencyId: 'all',
      department: 'all'
    };
    setLocalFilters(defaultFilters);
    setShowCustomDatePicker(false);
    onFiltersChange?.(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.timeframe !== '30d') count++;
    if (localFilters.clientId && localFilters.clientId !== 'all') count++;
    if (localFilters.userGroupId && localFilters.userGroupId !== 'all') count++;
    if (localFilters.leadershipLevel && localFilters.leadershipLevel !== 'all') count++;
    if (localFilters.competencyId && localFilters.competencyId !== 'all') count++;
    if (localFilters.department && localFilters.department !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Timeframe */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Timeframe</label>
                <Select 
                  value={localFilters.timeframe} 
                  onValueChange={(value) => handleFilterChange('timeframe', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client (for org view) */}
              {showClient && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Client</label>
                  <Select 
                    value={localFilters.clientId} 
                    onValueChange={(value) => handleFilterChange('clientId', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Group */}
              {showUserGroup && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">User Group</label>
                  <Select 
                    value={localFilters.userGroupId} 
                    onValueChange={(value) => handleFilterChange('userGroupId', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Leadership Level */}
              {showLeadershipLevel && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Leadership Level</label>
                  <Select 
                    value={localFilters.leadershipLevel} 
                    onValueChange={(value) => handleFilterChange('leadershipLevel', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEADERSHIP_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Competency */}
              {showCompetency && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Competency</label>
                  <Select 
                    value={localFilters.competencyId} 
                    onValueChange={(value) => handleFilterChange('competencyId', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Competencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Competencies</SelectItem>
                      {competencies.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Department */}
              {showDepartment && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Department</label>
                  <Select 
                    value={localFilters.department} 
                    onValueChange={(value) => handleFilterChange('department', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

        {/* Custom Date Range */}
        {showCustomDatePicker && (
          <div className="mt-4 flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {localFilters.startDate ? format(new Date(localFilters.startDate), 'PP') : 'Start Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={localFilters.startDate ? new Date(localFilters.startDate) : undefined}
                  onSelect={(date) => handleFilterChange('startDate', date?.toISOString())}
                />
              </PopoverContent>
            </Popover>
            <span className="text-gray-400">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {localFilters.endDate ? format(new Date(localFilters.endDate), 'PP') : 'End Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={localFilters.endDate ? new Date(localFilters.endDate) : undefined}
                  onSelect={(date) => handleFilterChange('endDate', date?.toISOString())}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardContent>
    </Card>
  );
}