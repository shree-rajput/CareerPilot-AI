import React, { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  useConnectionState,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import { Loader2, CameraOff } from "lucide-react";

import "@livekit/components-styles";

function VideoGrid() {
  // Get all camera and screen share tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "calc(100% - 60px)" }}
      className="p-4"
    >
      <ParticipantTile />
    </GridLayout>
  );
}

function ConnectionStatus({ mediaError }) {
  const connectionState = useConnectionState();
  
  if (connectionState === "connected" && !mediaError) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {mediaError ? (
        <>
          <CameraOff className="mb-4 h-8 w-8 text-yellow-500" />
          <p className="text-sm font-medium text-white">{mediaError}</p>
          <p className="mt-2 text-xs text-gray-400 text-center max-w-sm">
            You can still participate in the coding session and text chat, but your camera/microphone are unavailable.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Retry Permissions
          </button>
        </>
      ) : (
        <>
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-white">
            {connectionState === "connecting"
              ? "Connecting to secure room..."
              : connectionState === "reconnecting"
                ? "Reconnecting to room..."
                : "Disconnected from room"}
          </p>
        </>
      )}
    </div>
  );
}

export default function LiveKitInterviewRoom({ token, serverUrl, onDisconnected }) {
  const [mediaError, setMediaError] = useState(null);

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111111] text-gray-400">
        Waiting for secure connection...
      </div>
    );
  }

  const handleMediaDeviceFailure = (e) => {
    console.error("LiveKit Media Device Failure:", e);
    if (e?.message?.includes("Permission denied") || e?.name === "NotAllowedError") {
      setMediaError("Camera or microphone permission was denied.");
    } else if (e?.name === "NotFoundError") {
      setMediaError("No camera or microphone found on your device.");
    } else {
      setMediaError("Unable to access camera or microphone.");
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#111111]">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={!mediaError}
        audio={!mediaError}
        onDisconnected={onDisconnected}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        className="flex h-full flex-col"
      >
        <ConnectionStatus mediaError={mediaError} />
        <VideoGrid />
        
        <div className="flex h-[60px] items-center justify-center border-t border-white/10 bg-[#18181b] px-4">
          <ControlBar 
            variation="minimal"
            controls={{ microphone: true, camera: true, screenShare: true, leave: true }}
          />
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
