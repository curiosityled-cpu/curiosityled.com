import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Briefcase, Loader2, Plus } from "lucide-react";

const TYPE_LABELS = {
  leadership_coaching: "Leadership Coaching",
  team_coaching: "Team Coaching",
  workshop: "Workshop",
  consultation: "Consultation",
  assessment: "Assessment",
  stretch_project: "Stretch Project",
  leadership_opportunity: "Leadership Opportunity",
  mentorship: "Mentorship",
  conference_event: "Conference / Event",
  volunteer_leadership: "Volunteer Leadership",
  cross_functional_project: "Cross-Functional Project",
  speaking_opportunity: "Speaking Opportunity",
  other: "Other",
};

export default function ExperienceLibraryPicker({ onPick, onClose }) {
  const [experiences, setExperiences] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.DevelopmentExperience.list("-created_date", 200);
        setExperiences(data || []);
      } catch (e) {
        console.error("Failed to load experiences:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return experiences.filter((e) =>
      !q ||
      e.title?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.provider_or_sponsor?.toLowerCase().includes(q)
    );
  }, [experiences, search]);

  return (
    <div className="space-y-2 min-w-0">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          placeholder="Search existing experiences..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
      <ScrollArea className="h-64 rounded-xl border border-gray-100 bg-white">
        <div className="p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No experiences found</div>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => { onPick({ title: e.title, type: e.type, description: e.description, provider_or_sponsor: e.provider_or_sponsor }); }}
                className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {e.type ? TYPE_LABELS[e.type] || e.type : ""}
                    {e.provider_or_sponsor ? ` · ${e.provider_or_sponsor}` : ""}
                  </p>
                </div>
                <Plus className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}