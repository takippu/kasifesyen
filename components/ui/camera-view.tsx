"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraViewProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Stop previous stream if exists
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });

        // Only set state if component is still mounted
        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } else {
          // Clean up if component unmounted during getUserMedia call
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Camera access denied';
        setError(`Unable to access camera: ${message}`);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]); // Remove stream dependency

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="relative w-full max-w-md h-[400px] bg-black rounded-lg overflow-hidden">
        {error ? (
          <div className="text-center p-4 h-full flex flex-col items-center justify-center">
            <p className="text-white mb-4">{error}</p>
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-white hover:bg-gray-100"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 px-4">
              <Button
                onClick={capturePhoto}
                size="icon"
                className="rounded-full w-16 h-16 bg-white hover:bg-gray-100"
              >
                <Camera className="h-8 w-8 text-pink-600" />
              </Button>
              <Button
                onClick={() => setFacingMode(facingMode === "environment" ? "user" : "environment")}
                size="icon"
                variant="outline"
                className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 border-white/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-white"
                >
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M8 6h8" />
                  <path d="m12 18 4-4-4-4" />
                </svg>
              </Button>
              <Button
                onClick={onClose}
                size="icon"
                variant="outline"
                className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 border-white/20"
              >
                <X className="h-6 w-6 text-white" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}