"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_PREFIX = "tbz:video";
const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

export function VideoViewer({
  src,
  resourceId,
  downloadUrl,
}: {
  src: string;
  resourceId: string;
  downloadUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [resumed, setResumed] = useState(false);

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
    const onTime = () => {
      if (!Number.isFinite(video.duration)) return;
      if (video.currentTime < video.duration - 30) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            window.localStorage.setItem(
              `${STORAGE_PREFIX}:${resourceId}`,
              String(Math.floor(video.currentTime)),
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
  }, [resourceId]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

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
  );
}