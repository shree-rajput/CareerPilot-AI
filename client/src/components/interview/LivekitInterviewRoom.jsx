import React from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";

import "@livekit/components-styles";

export default function LiveKitInterviewRoom({ token, serverUrl }) {
  if (!token || !serverUrl) {
    return <div>Unable to connect to interview room.</div>;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={true}
      audio={true}
    >
      <VideoConference />

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
