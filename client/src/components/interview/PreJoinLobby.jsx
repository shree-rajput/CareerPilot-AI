import React, { useEffect, useRef, useState } from "react";
import { Camera, Mic, CameraOff, MicOff, AlertCircle, Play, CheckCircle2, ShieldAlert } from "lucide-react";

export default function PreJoinLobby({ onJoin }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  // Device availability states
  const [hasCameraDevice, setHasCameraDevice] = useState(false);
  const [hasMicDevice, setHasMicDevice] = useState(false);
  const [checkingDevices, setCheckingDevices] = useState(true);

  // User preference toggles
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    let activeStream = null;

    async function detectAndSetupDevices() {
      setCheckingDevices(true);

      let foundCamera = false;
      let foundMic = false;

      // 1. Enumerate Media Devices
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          foundCamera = devices.some((device) => device.kind === "videoinput");
          foundMic = devices.some((device) => device.kind === "audioinput");
        }
      } catch (enumErr) {
        console.warn("Device enumeration warning:", enumErr);
      }

      setHasCameraDevice(foundCamera);
      setHasMicDevice(foundMic);

      if (!foundCamera) setCameraEnabled(false);
      if (!foundMic) setMicEnabled(false);

      // 2. Attempt media stream if at least one device exists
      if (foundCamera || foundMic) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: foundCamera,
            audio: foundMic,
          });
          setStream(mediaStream);
          activeStream = mediaStream;
          if (videoRef.current && foundCamera) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.warn("getUserMedia failed or denied:", err);
          if (err.name === "NotAllowedError") {
            setError("Camera/Microphone permission was denied. You can still join in code & text-only mode.");
          } else if (err.name === "NotFoundError") {
            setError("Requested media device was not found on your system. You can continue in code & text-only mode.");
          } else {
            setError("Unable to access media stream. You can continue in text-only mode.");
          }
        }
      } else {
        setError("No camera or microphone detected. You can join the room in text & code-only mode.");
      }

      setCheckingDevices(false);
    }

    detectAndSetupDevices();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (!hasMicDevice) return;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
  };

  const toggleCamera = () => {
    if (!hasCameraDevice) return;
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled(!cameraEnabled);
  };

  const handleJoinRoom = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onJoin?.({
      hasCamera: hasCameraDevice && cameraEnabled,
      hasMic: hasMicDevice && micEnabled,
    });
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white p-4 font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8 shadow-2xl">
        <h2 className="mb-1 text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Practice Room Lobby
        </h2>
        <p className="mb-6 text-center text-xs sm:text-sm text-gray-400">
          Set up audio and video before entering the collaborative workspace.
        </p>

        {/* Device Status Pills */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              hasCameraDevice ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {hasCameraDevice ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {hasCameraDevice ? "Camera Available" : "No camera detected"}
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              hasMicDevice ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {hasMicDevice ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {hasMicDevice ? "Microphone Available" : "No microphone detected"}
          </div>
        </div>

        {/* Video Preview Box */}
        <div className="relative mx-auto mb-6 aspect-video w-full max-w-lg overflow-hidden rounded-xl bg-black shadow-inner border border-white/5">
          {cameraEnabled && stream && hasCameraDevice ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#18181b] p-6 text-center">
              <CameraOff className="mb-3 h-12 w-12 text-gray-500" />
              <p className="text-sm font-semibold text-gray-300">
                {!hasCameraDevice ? "No camera hardware detected" : "Camera preview is turned off"}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                You can join and practice coding, whiteboard system design, and chat cleanly.
              </p>
            </div>
          )}
        </div>

        {/* Error / Warning Notice */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-300 text-xs">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Media Control Toggles */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            disabled={!hasMicDevice}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              !hasMicDevice
                ? "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                : micEnabled
                ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            }`}
            title={hasMicDevice ? (micEnabled ? "Mute Microphone" : "Unmute Microphone") : "No microphone hardware found"}
          >
            {micEnabled && hasMicDevice ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleCamera}
            disabled={!hasCameraDevice}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              !hasCameraDevice
                ? "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                : cameraEnabled
                ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            }`}
            title={hasCameraDevice ? (cameraEnabled ? "Turn Off Camera" : "Turn On Camera") : "No camera hardware found"}
          >
            {cameraEnabled && hasCameraDevice ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Join Practice Room Button */}
        <button
          onClick={handleJoinRoom}
          disabled={checkingDevices}
          className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111111] disabled:opacity-50"
        >
          <Play className="h-4 w-4 fill-white" />
          {!hasCameraDevice && !hasMicDevice ? "Continue Practice Room" : "Join Practice Room"}
        </button>
      </div>
    </div>
  );
}
