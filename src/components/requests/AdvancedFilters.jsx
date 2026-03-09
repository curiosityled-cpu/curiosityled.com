import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

export default function AdvancedFilters({ 
  filters, 
  onFilterChange, 
  searchTerm, 
  onSearchChange,
  programAdmins = [],
  onReset 
}) {
  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({activeFilterCount} active)
              </span>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="triaging">Triaging</SelectItem>
              <SelectItem value="waiting_on_requester">Waiting on Requester</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={filters.priority} onValueChange={(value) => onFilterChange('priority', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={filters.request_type} onValueChange={(value) => onFilterChange('request_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="learning_content">Learning Content</SelectItem>
              <SelectItem value="program_creation">Program Creation</SelectItem>
              <SelectItem value="assessment_development">Assessment Development</SelectItem>
              <SelectItem value="coaching_support">Coaching Support</SelectItem>
              <SelectItem value="reporting">Reporting</SelectItem>
              <SelectItem value="platform_support">Platform Support</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Second Row - Assignee and Risk Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Assignee Filter */}
          <Select value={filters.assigned_to} onValueChange={(value) => onFilterChange('assigned_to', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {programAdmins.map(admin => (
                <SelectItem key={admin.email} value={admin.email}>
                  {admin.display_name || admin.full_name || admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Approval Status Filter */}
          <Select value={filters.approval_status || 'all'} onValueChange={(value) => onFilterChange('approval_status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Approval Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approval Status</SelectItem>
              <SelectItem value="not_required">Not Required</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Risk Filter */}
          <Select value={filters.has_risks || 'all'} onValueChange={(value) => onFilterChange('has_risks', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Risk Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="yes">Has Risk Flags</SelectItem>
              <SelectItem value="no">No Risk Flags</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}