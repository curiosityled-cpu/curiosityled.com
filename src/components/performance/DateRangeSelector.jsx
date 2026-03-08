import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const dateRangeOptions = [
  { id: '3months', label: 'Last 3 Months' },
  { id: '6months', label: 'Last 6 Months' },
  { id: '12months', label: 'Last 12 Months' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range', icon: Calendar }
];

export default function DateRangeSelector({
  dateRange,
  customStartDate,
  customEndDate,
  showCustomRange,
  onDateRangeChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onShowCustomRangeChange
}) {
  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return `${format(customStartDate, 'MMM d, yyyy')} - ${format(customEndDate, 'MMM d, yyyy')}`;
    }
    const option = dateRangeOptions.find(o => o.id === dateRange);
    return option?.label || 'Last 6 Months';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[160px] justify-between">
            {getDateRangeLabel()}
            <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {dateRangeOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                if (option.id === 'custom') {
                  onShowCustomRangeChange(true);
                } else {
                  onDateRangeChange(option.id);
                }
              }}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {option.icon && <Calendar className="w-4 h-4" />}
                {option.label}
              </span>
              {dateRange === option.id && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCustomRange} onOpenChange={onShowCustomRangeChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <CalendarComponent
                mode="single"
                selected={customStartDate}
                onSelect={onCustomStartDateChange}
                className="rounded-md border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <CalendarComponent
                mode="single"
                selected={customEndDate}
                onSelect={onCustomEndDateChange}
                className="rounded-md border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onShowCustomRangeChange(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (customStartDate && customEndDate) {
                  onDateRangeChange('custom');
                  onShowCustomRangeChange(false);
                }
              }}
              disabled={!customStartDate || !customEndDate}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}