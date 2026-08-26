import React, { useEffect, useRef, useState } from "react";
import { Camera, Mic, CameraOff, MicOff, AlertCircle, Play } from "lucide-react";

export default function PreJoinLobby({ onJoin }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    let activeStream = null;
    async function setupDevices() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        activeStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Failed to get media devices:", err);
        setCameraEnabled(false);
        setMicEnabled(false);
        if (err.name === "NotAllowedError") {
          setError("Camera/Microphone permission denied. You can join in text/code-only mode.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. You can join in text/code-only mode.");
        } else {
          setError("Unable to access camera or microphone.");
        }
      }
    }
    setupDevices();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !cameraEnabled;
      });
      setCameraEnabled(!cameraEnabled);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111111] p-8 shadow-2xl">
        <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Interview Lobby</h2>
        <p className="mb-8 text-center text-gray-400">
          Check your devices before joining the session.
        </p>

        <div className="relative mx-auto mb-6 aspect-video w-full max-w-lg overflow-hidden rounded-xl bg-black shadow-inner">
          {cameraEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#1a1a1a]">
              <CameraOff className="mb-3 h-12 w-12 text-gray-500" />
              <p className="text-gray-400">Camera is off</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mb-8 flex items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            disabled={!stream && !error}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              micEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            }`}
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleCamera}
            disabled={!stream && !error}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              cameraEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            }`}
          >
            {cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </button>
        </div>

        <button
          onClick={() => {
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            onJoin();
          }}
          className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111111]"
        >
          <Play className="h-5 w-5" />
          Join Interview Room
        </button>
      </div>
    </div>
  );
}
