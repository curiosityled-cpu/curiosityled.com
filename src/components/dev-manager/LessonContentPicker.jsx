import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Video, Radio, MessageSquare, Search, Loader2,
  FileText, Calendar, CheckCircle, ArrowLeft
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const CONTENT_TYPES = [
  { id: "resource", label: "Resource", description: "Video, article, PDF, or embed from your library.", icon: BookOpen, color: "#0202ff" },
  { id: "live_class", label: "Live Class", description: "Scheduled ILT, virtual, or workshop session.", icon: Video, color: "#ec4899" },
  { id: "signal", label: "Signal", description: "Quiz, assessment, survey, or pulse from your signals.", icon: Radio, color: "#A25DDC" },
  { id: "conversational_module", label: "Conversational Module", description: "AI-guided conversation with Atreus.", icon: MessageSquare, color: "#10b981" },
];

const SIGNAL_FORM_TYPES = ["feedback_survey", "satisfaction_survey", "poll", "quiz", "custom"];

/**
 * LessonContentPicker — lets the admin choose a content type and then
 * search and select an existing entity to reference as a lesson.
 *
 * Props:
 *   lesson    — the current lesson object { content_type, reference_id, reference_title, gate, unlock_offset_days, title }
 *   pacing   — course pacing ("self_paced" | "cohort")
 *   onChange — callback(updatedLesson)
 */
export default function LessonContentPicker({ lesson, pacing, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Determine which content type card is active.
  // "signal" is a UI concept — stored as "assessment" or "form" depending on entity.
  const activeCard = lesson?.content_type === "assessment" || lesson?.content_type === "form"
    ? "signal"
    : lesson?.content_type || null;

  const loadItems = async (cardId) => {
    setLoading(true);
    try {
      let results = [];
      if (cardId === "resource") {
        results = await base44.entities.LearningResource.filter({ is_active: true });
      } else if (cardId === "live_class") {
        results = await base44.entities.Class.list();
      } else if (cardId === "signal") {
        const [assessments, forms] = await Promise.all([
          base44.entities.CustomAssessment.list(),
          base44.entities.CustomForm.list(),
        ]);
        const signalForms = (forms || []).filter(f => SIGNAL_FORM_TYPES.includes(f.form_type));
        results = [
          ...(assessments || []).map(a => ({ ...a, _signalEntity: "assessment" })),
          ...signalForms.map(f => ({ ...f, _signalEntity: "form" })),
        ];
      } else if (cardId === "conversational_module") {
        results = await base44.entities.ConversationalLearningModule.filter({ status: "published" });
      }
      setItems(results || []);
    } catch (error) {
      console.error("Error loading items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardId) => {
    setPickerOpen(true);
    setItems([]);
    setSearch("");
    loadItems(cardId);
  };

  const handleItemSelect = (item) => {
    const cardId = activeCard || (lesson?.content_type === "assessment" || lesson?.content_type === "form" ? "signal" : lesson?.content_type);
    let contentType = cardId;
    if (cardId === "signal") {
      contentType = item._signalEntity || "assessment";
    }
    onChange({
      ...lesson,
      content_type: contentType,
      reference_id: item.id,
      reference_title: item.title || item.name,
    });
    setPickerOpen(false);
  };

  const handleBack = () => {
    setPickerOpen(false);
    setItems([]);
    setSearch("");
  };

  const filteredItems = items.filter(item =>
    !search ||
    (item.title || item.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // If a content type is already selected, show the lesson settings + change option
  if (lesson?.reference_id && !pickerOpen) {
    const cardMeta = CONTENT_TYPES.find(c => c.id === activeCard) || CONTENT_TYPES[0];
    const Icon = cardMeta.icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cardMeta.color}15` }}>
            <Icon className="w-4.5 h-4.5" style={{ color: cardMeta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{cardMeta.label}</p>
            <p className="font-medium text-sm text-gray-900 truncate">{lesson.reference_title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleCardSelect(activeCard)}>
            Change
          </Button>
        </div>

        {/* Lesson settings */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Lesson title (optional)</Label>
            <Input
              placeholder="Override the displayed title for this lesson"
              value={lesson.title || ""}
              onChange={(e) => onChange({ ...lesson, title: e.target.value })}
              className="mt-1 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              checked={lesson.gate || false}
              onCheckedChange={(checked) => onChange({ ...lesson, gate: !!checked })}
              id="lesson-gate"
            />
            <Label htmlFor="lesson-gate" className="text-sm cursor-pointer">
              Gate next lesson until this is complete
            </Label>
          </div>

          {pacing === "cohort" && (
            <div>
              <Label className="text-xs">Unlock offset (days from cohort start)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={lesson.unlock_offset_days ?? ""}
                onChange={(e) => onChange({ ...lesson, unlock_offset_days: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1 h-9 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty for immediate unlock.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Content type card grid
  if (!pickerOpen) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">Choose what this lesson references. Each type pulls from your existing library.</p>
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = activeCard === type.id;
            return (
              <Card
                key={type.id}
                className={`cursor-pointer border rounded-xl transition-all hover:shadow-md ${isActive ? "border-[#0202ff] ring-1 ring-[#0202ff]/20" : "border-gray-100"}`}
                onClick={() => handleCardSelect(type.id)}
              >
                <CardContent className="p-3 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: type.color }} />
                  </div>
                  <p className="font-medium text-xs text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{type.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Entity search picker
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 px-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-sm font-medium text-gray-700">
          {activeCard === "signal" ? "Select a Signal" : `Select a ${CONTENT_TYPES.find(c => c.id === activeCard)?.label || "Resource"}`}
        </span>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
      ) : (
        <ScrollArea className="h-72 border border-gray-100 rounded-xl">
          <div className="p-2 space-y-1">
            {filteredItems.map((item) => {
              const isSelected = lesson?.reference_id === item.id;
              const itemTitle = item.title || item.name || "Untitled";
              const itemSub = item._signalEntity === "assessment" ? "Assessment" :
                item._signalEntity === "form" ? "Form" :
                item.class_type ? item.class_type.replace(/_/g, " ") :
                item.type ? item.type.replace(/_/g, " ") :
                item.provider || "";
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}
                  onClick={() => handleItemSelect(item)}
                >
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-[#0202ff]" : "text-gray-200"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{itemTitle}</p>
                    {itemSub && <p className="text-xs text-gray-500 truncate capitalize">{itemSub}</p>}
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No items found</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}