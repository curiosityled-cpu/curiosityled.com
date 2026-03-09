import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Minimize2, X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloatingTestOverlay({ 
  test, 
  onSubmitResults, 
  onMinimize,
  onClose
}) {
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('uat_overlay_position');
    return saved ? JSON.parse(saved) : { x: 20, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem('uat_overlay_position', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const toggleStep = (index) => {
    setCheckedSteps(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const allStepsChecked = checkedSteps.length === test.steps.length;

  return (
    <Card
      className={cn(
        "fixed shadow-2xl border-2 z-50 select-none",
        isDragging && "cursor-grabbing"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        maxHeight: '500px'
      }}
    >
      {/* Header - Draggable */}
      <div
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 cursor-grab active:cursor-grabbing flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripHorizontal className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <Badge variant="outline" className="bg-white text-blue-600 text-xs font-mono mb-1">
              {test.id}
            </Badge>
            <p className="text-sm font-medium truncate">Testing: {test.title}</p>
          </div>
        </div>
        <div className="flex gap-1 no-drag">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="p-4 space-y-4 overflow-y-auto no-drag" style={{ maxHeight: '400px' }}>
        <div>
          <h3 className="font-semibold text-sm mb-3">Test Steps Checklist</h3>
          <div className="space-y-2">
            {test.steps.map((step, index) => (
              <label
                key={index}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={checkedSteps.includes(index)}
                  onCheckedChange={() => toggleStep(index)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700 leading-snug">{step}</span>
              </label>
            ))}
          </div>
        </div>

        {allStepsChecked && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-800 font-medium">All steps completed! ✓</p>
          </div>
        )}

        <Button
          onClick={onSubmitResults}
          className="w-full gap-2"
          style={{ backgroundColor: '#0202ff' }}
        >
          Submit Test Results
        </Button>

        <p className="text-xs text-gray-500 text-center">
          You can minimize or drag this overlay anywhere on the screen
        </p>
      </div>
    </Card>
  );
}