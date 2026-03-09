import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Check } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const ALL_COMPETENCIES = [
  'Situational Intelligence',
  'Decision Making',
  'Communication',
  'Resource Management',
  'Stakeholder Management',
  'Performance Management',
  'Strategic Thinking',
  'Change Leadership',
  'Emotional Intelligence',
  'Conflict Resolution',
  'Team Building',
  'Delegation',
  'Coaching & Development',
  'Innovation',
  'Accountability',
  'Vision Setting',
  'Influence',
  'Adaptability',
  'Critical Thinking',
  'Problem Solving',
  'Time Management',
  'Negotiation',
  'Customer Focus',
  'Results Orientation',
  'Collaboration',
  'Business Acumen',
  'Financial Literacy',
  'Risk Management',
  'Ethics & Integrity',
  'Cultural Awareness'
];

const DEFAULT_SELECTED = [
  'Situational Intelligence',
  'Decision Making',
  'Communication',
  'Resource Management',
  'Stakeholder Management',
  'Performance Management'
];

export default function CustomizableSpiderChart({ competencyAverages, onSelectionChange }) {
  const [selectedCompetencies, setSelectedCompetencies] = useState(DEFAULT_SELECTED);
  const [tempSelection, setTempSelection] = useState(DEFAULT_SELECTED);
  const [showDialog, setShowDialog] = useState(false);

  const chartData = selectedCompetencies.map(name => ({
    competency: name.length > 15 ? name.substring(0, 12) + '...' : name,
    fullName: name,
    value: competencyAverages?.[name] || 0,
    benchmark: 70
  }));

  const handleToggle = (competency) => {
    // SI must always be included
    if (competency === 'Situational Intelligence') return;

    setTempSelection(prev => {
      if (prev.includes(competency)) {
        return prev.filter(c => c !== competency);
      } else {
        // Max 6 total (SI + 5 others)
        if (prev.length >= 6) {
          return prev;
        }
        return [...prev, competency];
      }
    });
  };

  const handleApply = () => {
    // Ensure SI is always first
    const sorted = ['Situational Intelligence', ...tempSelection.filter(c => c !== 'Situational Intelligence')];
    setSelectedCompetencies(sorted);
    onSelectionChange?.(sorted);
    setShowDialog(false);
  };

  const handleCancel = () => {
    setTempSelection(selectedCompetencies);
    setShowDialog(false);
  };

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Leadership Competency Profile</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Platform-wide competency averages</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempSelection(selectedCompetencies);
              setShowDialog(true);
            }}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Customize
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCompetencies.map(comp => (
              <Badge 
                key={comp} 
                variant="secondary" 
                className="text-xs"
                style={comp === 'Situational Intelligence' ? { backgroundColor: 'rgba(2,2,255,0.1)', color: '#0202ff' } : {}}
              >
                {comp}
              </Badge>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="competency" 
                tick={{ fontSize: 11 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="#e5e7eb"
                fill="#e5e7eb"
                fillOpacity={0.3}
              />
              <Radar
                name="Current"
                dataKey="value"
                stroke="#0202ff"
                fill="#0202ff"
                fillOpacity={0.4}
              />
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value}%`,
                  props.payload.fullName
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0202ff' }} />
              <span className="text-gray-600">Current Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-gray-600">Benchmark (70%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Competencies to Display</DialogTitle>
            <p className="text-sm text-gray-500">
              Choose up to 5 competencies (plus SI which is always included)
            </p>
          </DialogHeader>

          <div className="py-2">
            <Badge className="mb-4" style={{ backgroundColor: 'rgba(2,2,255,0.1)', color: '#0202ff' }}>
              {tempSelection.length}/6 selected
            </Badge>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {ALL_COMPETENCIES.map(comp => {
                const isSelected = tempSelection.includes(comp);
                const isSI = comp === 'Situational Intelligence';
                const isDisabled = !isSelected && tempSelection.length >= 6;

                return (
                  <div
                    key={comp}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${isDisabled && !isSI ? 'opacity-50' : ''}`}
                    onClick={() => !isDisabled && handleToggle(comp)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isSI || isDisabled}
                      className={isSI ? 'border-blue-600' : ''}
                    />
                    <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                      {comp}
                    </span>
                    {isSI && (
                      <Badge variant="outline" className="text-xs ml-auto">Required</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button 
              onClick={handleApply}
              style={{ backgroundColor: '#0202ff' }}
              className="text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}