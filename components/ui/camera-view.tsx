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

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError("Unable to access camera. Please make sure you have granted camera permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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