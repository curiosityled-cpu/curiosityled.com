import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Loader2,
  Maximize,
  Minimize,
  Captions,
  FileText,
  Gauge,
  Lock,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getResourceFileUri, resolveFileUri, resolveResourceFileUrl } from "@/lib/resourceFile";
import { getA11yPrefs, setA11yPref } from "@/lib/accessibilityPrefs";
import { parseVtt } from "@/lib/vtt";
import LessonTranscript from "@/components/learning/course/LessonTranscript";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const clock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const hours = Math.floor(mins / 60);
  if (hours) {
    return `${hours}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

/**
 * The lesson video surface: externally hosted videos play in an embedded frame,
 * uploaded videos play in the app's own player. Both offer playback speed,
 * a closed-caption toggle, fullscreen, and (when the lesson locks it) no skipping.
 */
export default function LessonVideoPlayer({
  resource,
  embedUrl = null,
  captionsUrl = null,
  allowSeeking = true,
  allowSpeed = true,
  onEnded,
  title,
}) {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const watchedRef = useRef(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [captionsSrc, setCaptionsSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [prefs, setPrefs] = useState(getA11yPrefs);
  const [showTranscript, setShowTranscript] = useState(false);
  const [cues, setCues] = useState(null);

  const fileUri = getResourceFileUri(resource);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (embedUrl) {
        setLoading(false);
        return;
      }
      if (!fileUri) {
        setLoading(false);
        setFailed(true);
        return;
      }
      setLoading(true);
      const [video, captions] = await Promise.all([
        resolveResourceFileUrl(resource),
        captionsUrl ? resolveFileUri(captionsUrl) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setVideoUrl(video);
      setCaptionsSrc(captions);
      setFailed(!video);
      setLoading(false);
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [embedUrl, fileUri, resource, captionsUrl]);

  // Keep the caption track in step with the toggle.
  useEffect(() => {
    const track = videoRef.current?.textTracks?.[0];
    if (!track) return;
    track.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn, captionsSrc, videoUrl]);

  // Captions can be on from the start for someone who needs them; the choice stays on the device.
  useEffect(() => {
    if (captionsSrc) setCaptionsOn(getA11yPrefs().captionsDefault);
  }, [captionsSrc]);

  // The transcript is the same captions file, read as text.
  useEffect(() => {
    if (!showTranscript || !captionsSrc || cues) return undefined;
    let cancelled = false;
    fetch(captionsSrc)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setCues(parseVtt(text));
      })
      .catch(() => {
        if (!cancelled) setCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showTranscript, captionsSrc, cues]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const node = frameRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch (error) {
      console.error("Fullscreen is unavailable here:", error);
    }
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const applySpeed = (value) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setTime(video.currentTime);
    if (video.currentTime > watchedRef.current) watchedRef.current = video.currentTime;
  };

  // With skipping disabled, the playhead can never move past what has been watched.
  const handleSeeking = () => {
    const video = videoRef.current;
    if (!video || allowSeeking) return;
    if (video.currentTime > watchedRef.current + 1) video.currentTime = watchedRef.current;
  };

  const scrub = (event) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const target = ((event.clientX - rect.left) / rect.width) * duration;
    if (!allowSeeking && target > watchedRef.current) return;
    video.currentTime = target;
  };

  const handleKeyDown = (event) => {
    const video = videoRef.current;
    if (!video) return;
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      togglePlay();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (allowSeeking) {
        video.currentTime = Math.min(duration || video.duration, video.currentTime + 5);
      }
    }
  };

  const applyPref = (key) => {
    const next = setA11yPref(key, !getA11yPrefs()[key]);
    setPrefs(next);
    if (key === "captionsDefault" && captionsSrc) setCaptionsOn(next.captionsDefault);
  };

  // A transcript line is a place in the video, so selecting one goes there.
  const seekTo = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    if (!allowSeeking && seconds > watchedRef.current) return;
    video.currentTime = seconds;
    video.play().catch(() => {});
  };

  const handleBarKeyDown = (event) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    // The bar sits inside the player, which also listens for these keys — handle them once.
    event.stopPropagation();
    const step = event.shiftKey ? 30 : 5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      if (allowSeeking) video.currentTime = Math.min(duration, video.currentTime + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      video.currentTime = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      if (allowSeeking) video.currentTime = duration;
    }
  };

  const fullscreenButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      title="Fullscreen"
      className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
    >
      {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
    </Button>
  );

  if (embedUrl) {
    return (
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-black"
      >
        <div className="relative aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title || resource?.title || "Lesson video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <div className="absolute right-3 top-3 rounded-lg bg-black/60 transition-colors hover:bg-black/80">
          {fullscreenButton}
        </div>
      </div>
    );
  }

  const progress = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div
      ref={frameRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative w-full overflow-hidden rounded-xl border border-border bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0202ff]/40 ${
        prefs.largeCaptions ? "cl-large-captions" : ""
      }`}
    >
      <div className="relative aspect-video w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/70" />
          </div>
        )}

        {!loading && failed && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/80">
            This video could not be loaded. Ask your program team to check the lesson file.
          </div>
        )}

        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={resource?.thumbnail_url || undefined}
            playsInline
            className="absolute inset-0 h-full w-full"
            onClick={togglePlay}
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0);
              event.currentTarget.playbackRate = allowSpeed ? speed : 1;
            }}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              onEnded?.();
            }}
          >
            {captionsSrc && (
              <track kind="captions" src={captionsSrc} srcLang="en" label="Captions" />
            )}
          </video>
        )}
      </div>

      <div className="flex items-center gap-2 bg-black/85 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          disabled={!videoUrl}
          title={playing ? "Pause" : "Play"}
          className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <span className="w-24 text-center text-[11px] font-medium tabular-nums text-white/80">
          {clock(time)} / {clock(duration)}
        </span>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(time || 0)}
          aria-valuetext={`${clock(time)} of ${clock(duration)}`}
          aria-disabled={!allowSeeking}
          className={`h-1.5 flex-1 rounded-full bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            allowSeeking ? "cursor-pointer" : "cursor-not-allowed"
          }`}
          onClick={scrub}
          onKeyDown={handleBarKeyDown}
          title={allowSeeking ? "Seek" : "Skipping ahead is turned off for this lesson"}
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>

        {!allowSeeking && (
          <span
            className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80"
            title="Skipping ahead is turned off for this lesson"
          >
            <Lock className="w-3 h-3" />
            No skipping
          </span>
        )}

        {allowSpeed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!videoUrl}
                title="Playback speed"
                className="h-8 gap-1 px-2 text-white hover:bg-white/15 hover:text-white"
              >
                <Gauge className="w-4 h-4" />
                <span className="text-[11px] font-medium">{speed}×</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[110px]">
              {SPEEDS.map((value) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => applySpeed(value)}
                  className={value === speed ? "text-sm font-semibold text-[#0202ff]" : "text-sm"}
                >
                  {value}×
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!captionsSrc}
          onClick={() => setCaptionsOn((prev) => !prev)}
          title={captionsSrc ? "Toggle closed captions" : "No captions were attached to this video"}
          className={`h-8 gap-1 px-2 text-white hover:bg-white/15 hover:text-white ${
            captionsOn ? "bg-white/20" : ""
          }`}
        >
          <Captions className="w-4 h-4" />
          <span className="text-[11px] font-medium">CC</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!captionsSrc}
          onClick={() => setShowTranscript((prev) => !prev)}
          title={captionsSrc ? "Read the transcript" : "No transcript was attached to this video"}
          className={`h-8 gap-1 px-2 text-white hover:bg-white/15 hover:text-white ${
            showTranscript ? "bg-white/20" : ""
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden text-[11px] font-medium sm:inline">Transcript</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Accessibility options"
              className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[224px]">
            <DropdownMenuItem onClick={() => applyPref("captionsDefault")} disabled={!captionsSrc}>
              <span className="flex-1">Captions on by default</span>
              <span className="text-[11px] text-muted-foreground">
                {prefs.captionsDefault ? "On" : "Off"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyPref("largeCaptions")}>
              <span className="flex-1">Larger captions</span>
              <span className="text-[11px] text-muted-foreground">
                {prefs.largeCaptions ? "On" : "Off"}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {fullscreenButton}
      </div>

      {showTranscript && (
        <div className="border-t border-border bg-card px-3 py-3">
          {cues === null ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <LessonTranscript cues={cues} onSeek={seekTo} />
          )}
        </div>
      )}
    </div>
  );
}