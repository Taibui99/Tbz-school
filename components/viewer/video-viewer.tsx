"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Download, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_PREFIX = "tbz:video";
const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoViewer({
  src,
  resourceId,
  downloadUrl,
  onTimeChange,
  youtubeId,
}: {
  src: string;
  resourceId: string;
  downloadUrl?: string | null;
  onTimeChange?: (seconds: number) => void;
  youtubeId?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [resumed, setResumed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || resumed) return;
    const onLoaded = () => {
      let saved = 0;
      try {
        saved = Number(window.localStorage.getItem(`${STORAGE_PREFIX}:${resourceId}`)) || 0;
      } catch {
        /* ignore */
      }
      if (
        Number.isFinite(video.duration) &&
        saved > 5 &&
        saved < video.duration - 30
      ) {
        video.currentTime = saved;
      }
      setResumed(true);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [resourceId, resumed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastReported = -1;
    const onTime = () => {
      const floored = Math.floor(video.currentTime);
      setCurrentTime(floored);
      if (floored !== lastReported) {
        lastReported = floored;
        onTimeChange?.(floored);
      }
      if (!Number.isFinite(video.duration)) return;
      if (video.currentTime < video.duration - 30) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            window.localStorage.setItem(
              `${STORAGE_PREFIX}:${resourceId}`,
              String(floored),
            );
          } catch {
            /* ignore */
          }
        }, 1000);
      }
    };
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      if (timer) clearTimeout(timer);
    };
  }, [resourceId, onTimeChange]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  if (youtubeId) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title="Phát video YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="size-full"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Video phát qua YouTube (unlisted) — không tốn dung lượng lưu trữ của
            Tbz cloud.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        playsInline
        className="aspect-video w-full bg-black"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Gauge aria-hidden="true" className="size-4" />
          Tốc độ phát
          <div className="ml-1 flex items-center gap-0.5">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeSpeed(value)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                  speed === value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const el = document.getElementById("annotation-section");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            title={`Đánh dấu tại ${formatTime(currentTime)}`}
          >
            <Bookmark aria-hidden="true" />
            <span className="hidden sm:inline">Đánh dấu</span>
          </Button>
          {downloadUrl && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={downloadUrl} download />}
            >
              <Download aria-hidden="true" />
              Tải video
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}