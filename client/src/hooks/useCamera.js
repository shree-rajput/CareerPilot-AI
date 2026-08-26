import { useState, useRef, useEffect, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setIsVideoEnabled(false);
    }
  }, []);

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initCamera]);

  return { videoRef, isVideoEnabled };
}
