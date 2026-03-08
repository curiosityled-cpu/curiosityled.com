import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function BoardTimelineView({
  milestones,
  onUpdateMilestone,
  onDeleteMilestone
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = month, 2 = 2 months, 3 = 3 months

  const getTimelineRange = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(addMonths(currentMonth, zoomLevel - 1));
    return { start, end };
  };

  const { start, end } = getTimelineRange();
  const days = eachDayOfInterval({ start, end });
  const totalDays = days.length;

  // Filter milestones that have start/end dates or due dates
  const timelineMilestones = milestones.filter(m => {
    return m.data?.start_date || m.data?.due_date;
  }).map(m => {
    const startDate = m.data?.start_date ? parseISO(m.data.start_date) : null;
    const endDate = m.data?.end_date ? parseISO(m.data.end_date) : 
                    m.data?.due_date ? parseISO(m.data.due_date) : null;
    
    return {
      ...m,
      startDate,
      endDate: endDate || startDate
    };
  }).filter(m => m.startDate && m.endDate);

  const getMilestonePosition = (milestone) => {
    const daysSinceStart = differenceInDays(milestone.startDate, start);
    const duration = differenceInDays(milestone.endDate, milestone.startDate) + 1;
    
    const leftPercent = (daysSinceStart / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(widthPercent, 100 - leftPercent)}%`
    };
  };

  const handlePrevPeriod = () => {
    setCurrentMonth(subMonths(currentMonth, zoomLevel));
  };

  const handleNextPeriod = () => {
    setCurrentMonth(addMonths(currentMonth, zoomLevel));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-400',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500'
    };
    return colors[priority] || 'bg-gray-400';
  };

  const getStatusOpacity = (status) => {
    return status === 'done' ? 'opacity-60' : 'opacity-100';
  };

  // Generate month markers
  const monthMarkers = [];
  let currentMarker = startOfMonth(start);
  while (currentMarker <= end) {
    const daysSinceStart = differenceInDays(currentMarker, start);
    const position = (daysSinceStart / totalDays) * 100;
    monthMarkers.push({
      date: currentMarker,
      position: `${position}%`
    });
    currentMarker = addMonths(currentMarker, 1);
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {format(start, 'MMM yyyy')} - {format(end, 'MMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <div className="flex items-center gap-1 border rounded-md">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                disabled={zoomLevel <= 1}
                className="h-8 w-8"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="px-2 text-sm font-medium text-gray-600">
                {zoomLevel}M
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setZoomLevel(Math.min(6, zoomLevel + 1))}
                disabled={zoomLevel >= 6}
                className="h-8 w-8"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={handlePrevPeriod}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Timeline Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span>Low Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Critical Priority</span>
          </div>
        </div>

        {/* Month Markers */}
        <div className="relative h-8 border-b">
          {monthMarkers.map((marker, idx) => (
            <div
              key={idx}
              className="absolute top-0 bottom-0 border-l border-gray-300"
              style={{ left: marker.position }}
            >
              <span className="absolute -top-1 -left-8 text-xs font-medium text-gray-600">
                {format(marker.date, 'MMM')}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Bars */}
        <div className="space-y-3 mt-4">
          {timelineMilestones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No milestones with dates in this period</p>
              <p className="text-xs">Add start/end dates or due dates to milestones to see them here</p>
            </div>
          ) : (
            timelineMilestones.map((milestone) => {
              const position = getMilestonePosition(milestone);
              
              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 min-w-[200px] truncate">
                      {milestone.title}
                    </span>
                    <Badge 
                      variant="outline"
                      className={
                        milestone.status === 'done' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'working_on_it' ? 'bg-blue-100 text-blue-800' :
                        milestone.status === 'stuck' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="relative h-8 bg-gray-100 rounded">
                    <div
                      className={`absolute h-full rounded ${getPriorityColor(milestone.priority)} ${getStatusOpacity(milestone.status)} transition-all hover:opacity-90 cursor-pointer`}
                      style={position}
                      title={`${milestone.title}\n${format(milestone.startDate, 'MMM d')} - ${format(milestone.endDate, 'MMM d')}`}
                    >
                      <div className="h-full flex items-center justify-center text-white text-xs font-medium px-2">
                        {milestone.status === 'done' && '✓'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {format(milestone.startDate, 'MMM d')} - {format(milestone.endDate, 'MMM d')}
                    {' '}({differenceInDays(milestone.endDate, milestone.startDate) + 1} days)
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </Card>

      {/* Today Marker */}
      {isWithinInterval(new Date(), { start, end }) && (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-blue-500 pointer-events-none"
          style={{
            left: `${(differenceInDays(new Date(), start) / totalDays) * 100}%`
          }}
        >
          <div className="absolute -top-6 -left-8 text-xs font-medium text-blue-600">
            Today
          </div>
        </div>
      )}
    </div>
  );
}