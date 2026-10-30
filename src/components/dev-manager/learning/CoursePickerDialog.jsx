import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Picks a published course before assignment. Kept separate from AssignCourseModal so
 * that modal keeps owning a single course and this dialog owns the choice.
 */
export default function CoursePickerDialog({ open, onOpenChange, onPick }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.Course.filter({ status: "published" }, { sort: "title", limit: 100 });
      setCourses(Array.isArray(rows) ? rows : rows?.items || []);
    } catch (error) {
      console.error("Could not load courses", error);
      toast.error("Could not load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const filtered = courses.filter((c) => !search || c.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a course</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a course"
            className="pl-8 h-9 text-sm"
          />
        </div>

        <div className="max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-gray-100">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-500">No published courses yet</p>
          ) : (
            filtered.map((course) => (
              <button
                key={course.id}
                onClick={() => onPick(course)}
                className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-gray-50 rounded-lg"
              >
                <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{course.title}</span>
                  <span className="block text-[11px] text-gray-500">
                    {(course.modules || []).reduce((n, m) => n + (m.lessons || []).length, 0)} lessons
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}