import { useRef, useEffect, useState } from 'react';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebcamDisplayProps {
  isActive: boolean;
  className?: string;
  mirrored?: boolean;
  showPlaceholder?: boolean;
}

/**
 * WebcamDisplay Component
 * Displays the user's webcam feed for self-view during interview
 * Note: Video is NOT recorded or sent to server - stays local only
 */
export function WebcamDisplay({ 
  isActive, 
  className,
  mirrored = true,
  showPlaceholder = true 
}: WebcamDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isActive]);

  const startWebcam = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // Audio handled separately
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error('Webcam error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a webcam.');
        } else {
          setError('Failed to access camera.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div 
      className={cn(
        "relative bg-gray-900 rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover",
          mirrored && "scale-x-[-1]",
          !isActive && "hidden"
        )}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-4 text-center">
          <VideoOff className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-white text-sm">{error}</p>
        </div>
      )}

      {/* Placeholder when inactive */}
      {!isActive && showPlaceholder && !isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          <Video className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-gray-400 text-sm">Camera off</p>
        </div>
      )}

      {/* Self-view label */}
      {isActive && stream && (
        <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white">
          You
        </div>
      )}
    </div>
  );
}

export default WebcamDisplay;
