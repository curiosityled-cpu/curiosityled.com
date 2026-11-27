import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Layers, Search, Loader2, ArrowRight, PlayCircle, CheckCircle2,
} from "lucide-react";

/**
 * LearnerCatalog — what a learner can be enrolled in: courses and journeys.
 *
 * Resources are never listed here. They are the material a course embeds, so a
 * learner meets them inside the course they are working through.
 */

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

const OPEN_JOURNEY_STATUSES = ["published", "active"];

const CACHE_TTL_MS = 60_000;

/** The catalogue is the same for a learner for a minute — don't re-ask on every visit. */
let catalogCache = { email: null, at: 0, data: null };

const isRateLimited = (error) => /rate limit/i.test(error?.message || "");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function countLessons(course) {
  return (course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
}

function countJourneySteps(journey) {
  return (
    (journey.content_structure || []).length +
    (journey.experiences || []).length +
    (journey.learning_items || []).length +
    (journey.signal_items || []).length
  );
}

function CourseCard({ course, percent, onOpen }) {
  const lessons = countLessons(course);
  const started = percent > 0;
  return (
    <Card className="border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col">
      {course.thumbnail_url && (
        <img src={course.thumbnail_url} alt="" className="h-32 w-full object-cover" />
      )}
      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground line-clamp-2">{course.title}</p>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">Course</Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {course.description || "A guided course in your catalogue."}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {[
            lessons ? `${lessons} lesson${lessons === 1 ? "" : "s"}` : null,
            course.estimated_duration_minutes ? `${course.estimated_duration_minutes} min` : null,
          ].filter(Boolean).join(" · ")}
        </p>

        {started && (
          <div className="mt-1 space-y-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[#0202ff]" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">{percent}% complete</p>
          </div>
        )}

        <Button
          type="button"
          onClick={onOpen}
          className="mt-auto bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs"
        >
          {started ? <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> : null}
          {started ? "Continue course" : "Start course"}
        </Button>
      </CardContent>
    </Card>
  );
}

function JourneyCard({ journey, onOpen }) {
  const steps = countJourneySteps(journey);
  return (
    <Card className="border border-border shadow-sm rounded-2xl flex flex-col">
      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground line-clamp-2">{journey.title}</p>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">Journey</Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {journey.description || "A sequenced path through your development."}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {[
            steps ? `${steps} step${steps === 1 ? "" : "s"}` : null,
            journey.estimated_duration_days ? `${journey.estimated_duration_days} days` : null,
          ].filter(Boolean).join(" · ")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          className="mt-auto h-9 text-xs"
        >
          Open journey
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LearnerCatalog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;

  const [courses, setCourses] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [progressByCourse, setProgressByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;

    const apply = (data) => {
      setCourses(data.courses);
      setJourneys(data.journeys);
      setProgressByCourse(data.progressByCourse);
    };

    const cached = catalogCache.data;
    const cacheFresh =
      cached && catalogCache.email === email && Date.now() - catalogCache.at < CACHE_TTL_MS;

    if (cacheFresh && reloadToken === 0) {
      apply(cached);
      setLoading(false);
      return;
    }

    const load = async (attempt = 0) => {
      setLoading(attempt === 0 && !cached);
      try {
        const [courseRows, journeyRows, progressRows] = await Promise.all([
          base44.entities.Course.filter({ status: "published" }),
          base44.entities.Journey.list("-created_date", 100).catch(() => []),
          base44.entities.CourseProgress.filter({ learner_email: email }).catch(() => []),
        ]);
        if (cancelled) return;

        const data = {
          courses: asArray(courseRows),
          journeys: asArray(journeyRows).filter((row) =>
            OPEN_JOURNEY_STATUSES.includes(row.status)
          ),
          progressByCourse: Object.fromEntries(
            asArray(progressRows).map((row) => [row.course_id, row.overall_percentage || 0])
          ),
        };

        catalogCache = { email, at: Date.now(), data };
        apply(data);
        setBusy(false);
        setFailed(false);
      } catch (error) {
        if (cancelled) return;

        // The app shares one list budget per caller, so another screen can use it
        // up. Wait out the window once rather than failing the whole page.
        if (isRateLimited(error) && attempt < 2) {
          setBusy(true);
          await wait(5000);
          if (!cancelled) await load(attempt + 1);
          return;
        }
        setBusy(false);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [email, reloadToken]);

  const term = search.trim().toLowerCase();

  const visibleCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          !term ||
          course.title?.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
      ),
    [courses, term]
  );

  const visibleJourneys = useMemo(
    () =>
      journeys.filter(
        (journey) =>
          !term ||
          journey.title?.toLowerCase().includes(term) ||
          journey.description?.toLowerCase().includes(term)
      ),
    [journeys, term]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
        {busy && (
          <p className="text-sm text-muted-foreground">
            The app is busy right now — loading your catalogue in a moment.
          </p>
        )}
      </div>
    );
  }

  const isEmpty = courses.length === 0 && journeys.length === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Course library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Courses and journeys you can take. Resources sit inside the courses that use them.
        </p>
      </div>

      {busy && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1">
            The app is busy right now — refreshing the catalogue.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Retry now
          </Button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search courses and journeys..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {failed && isEmpty ? (
        <Card className="border border-border rounded-2xl">
          <CardContent className="p-10 text-center">
            <BookOpen className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              The catalogue didn't load
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The app was busy. Try again in a few seconds.
            </p>
            <Button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="mt-4 bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <Card className="border border-dashed border-border rounded-2xl">
          <CardContent className="p-10 text-center">
            <BookOpen className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Nothing in the catalogue yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Courses and journeys your team publishes will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Courses</h2>
              <span className="text-xs text-muted-foreground">{visibleCourses.length}</span>
            </div>
            {visibleCourses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No courses match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    percent={progressByCourse[course.id] || 0}
                    onOpen={() => navigate(`/course/${course.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Journeys</h2>
              <span className="text-xs text-muted-foreground">{visibleJourneys.length}</span>
            </div>
            {visibleJourneys.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No journeys match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleJourneys.map((journey) => (
                  <JourneyCard
                    key={journey.id}
                    journey={journey}
                    onOpen={() => navigate(`/journey/${journey.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}