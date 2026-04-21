import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Check, Briefcase } from "lucide-react";
import { toast } from "sonner";

const EXPERIENCE_TYPE_EMOJIS = {
  leadership_coaching: "🎯",
  stretch_project: "🚀",
  leadership_opportunity: "⭐",
  mentorship: "🤝",
  conference_event: "🎤",
  volunteer_leadership: "🌱",
  cross_functional_project: "🔗",
  speaking_opportunity: "📢",
  other: "💡",
};

export default function ExperienceSelector({ open, onClose, onSelect, selectedExperienceIds = [] }) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    if (!open) return;
    loadExperiences();
  }, [open]);

  const loadExperiences = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (!me?.email) {
        setLoading(false);
        return;
      }
      setUserEmail(me.email);
      
      // Load only this user's experiences
      const exps = await base44.entities.DevelopmentExperience.filter({
        user_email: me.email,
      }, '-created_date');
      
      setExperiences(exps || []);
    } catch (error) {
      console.error('Error loading experiences:', error);
      toast.error('Failed to load experiences');
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredExperiences = experiences.filter(exp => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      exp.title?.toLowerCase().includes(q) ||
      exp.description?.toLowerCase().includes(q) ||
      exp.provider_or_sponsor?.toLowerCase().includes(q)
    );
  });

  const isSelected = (experienceId) => selectedExperienceIds.includes(experienceId);

  const handleSelect = (experience) => {
    onSelect(experience);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Experiences to Journey</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Select from your logged development experiences</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search experiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Experiences List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredExperiences.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {experiences.length === 0
                    ? "No experiences logged yet. Create one in My Development first."
                    : "No experiences match your search."}
                </p>
              </div>
            ) : (
              filteredExperiences.map((experience) => {
                const selected = isSelected(experience.id);
                return (
                  <button
                    key={experience.id}
                    onClick={() => handleSelect(experience)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${selected
                        ? "border-[#0202ff] bg-blue-50"
                        : "border-gray-200 hover:border-[#0202ff]/40 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {EXPERIENCE_TYPE_EMOJIS[experience.type] || "💡"}
                          </span>
                          <h4 className="font-medium text-gray-900">{experience.title}</h4>
                        </div>
                        {experience.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {experience.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {experience.competencies?.slice(0, 2).map((comp) => (
                            <Badge key={comp} variant="outline" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                          {experience.competencies?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{experience.competencies.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {experience.provider_or_sponsor && (
                            <span>{experience.provider_or_sponsor}</span>
                          )}
                          {experience.expected_impact && (
                            <span className="text-emerald-600 font-medium">
                              +{experience.expected_impact}% impact
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {selected ? (
                          <div className="w-6 h-6 rounded-full bg-[#0202ff] flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <Plus className="w-5 h-5 text-[#0202ff]/40" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}