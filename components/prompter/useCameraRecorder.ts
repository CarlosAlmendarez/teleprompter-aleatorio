import { useCallback, useEffect, useRef, useState } from "react";
import { extensionFor, pickMimeType, recordingFileName } from "@/lib/media/recorder";

export type CameraError = "permission" | "unavailable" | "unsupported" | null;

/**
 * Camera preview + MediaRecorder for recording a take while reading. The
 * finished video is downloaded straight to the device — nothing is uploaded.
 */
export function useCameraRecorder(title: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<CameraError>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return false;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = media;
      setStream(media);
      return true;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "unavailable");
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }, []);

  const closeCamera = useCallback(() => {
    stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, [stop]);

  const start = useCallback(() => {
    const media = streamRef.current;
    if (!media) return false;
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      setError("unsupported");
      return false;
    }
    const recorder = new MediaRecorder(media, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = recordingFileName(title, new Date(), extensionFor(mimeType));
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    const startedAt = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    setRecording(true);
    return true;
  }, [title]);

  // Release the camera when leaving the page.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { stream, recording, elapsed, error, openCamera, closeCamera, start, stop };
}
