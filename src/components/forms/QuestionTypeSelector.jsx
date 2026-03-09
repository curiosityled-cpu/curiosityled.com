import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Type,
  AlignLeft,
  CheckSquare,
  Circle,
  ChevronDown,
  Star,
  BarChart,
  Calendar,
  Clock,
  Upload,
  ToggleLeft,
  Mail,
  Hash,
  Phone,
  X
} from "lucide-react";

const questionTypes = [
  { type: "short_text", icon: Type, label: "Short Text", description: "Single line text input" },
  { type: "long_text", icon: AlignLeft, label: "Long Text", description: "Multi-line text area" },
  { type: "multiple_choice", icon: Circle, label: "Multiple Choice", description: "Select one option" },
  { type: "checkboxes", icon: CheckSquare, label: "Checkboxes", description: "Select multiple options" },
  { type: "dropdown", icon: ChevronDown, label: "Dropdown", description: "Select from dropdown menu" },
  { type: "rating_scale", icon: Star, label: "Rating Scale", description: "Star rating" },
  { type: "linear_scale", icon: BarChart, label: "Linear Scale", description: "Numeric scale (e.g., 1-5)" },
  { type: "date", icon: Calendar, label: "Date", description: "Date picker" },
  { type: "time", icon: Clock, label: "Time", description: "Time picker" },
  { type: "file_upload", icon: Upload, label: "File Upload", description: "Upload files" },
  { type: "yes_no", icon: ToggleLeft, label: "Yes/No", description: "Boolean choice" },
  { type: "email", icon: Mail, label: "Email", description: "Email address input" },
  { type: "number", icon: Hash, label: "Number", description: "Numeric input" },
  { type: "phone", icon: Phone, label: "Phone", description: "Phone number input" }
];

export default function QuestionTypeSelector({ onSelect, onCancel }) {
  return (
    <Card className="p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onCancel}
        className="absolute top-2 right-2"
      >
        <X className="w-4 h-4" />
      </Button>

      <h3 className="font-semibold mb-3">Select Question Type</h3>
      
      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
        {questionTypes.map(({ type, icon: Icon, label, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex items-start gap-3 p-3 text-left rounded-lg border hover:bg-gray-50 hover:border-blue-500 transition-all"
          >
            <Icon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}