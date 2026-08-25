import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LiveKitInterviewRoom from "../components/interview/LivekitInterviewRoom";
import { getLiveKitToken } from "../api/peerInterview";
export default function PeerInterviewRoomPage() {
  const { roomId } = useParams();

  const [liveKitData, setLiveKitData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function connectInterview() {
      try {
        setLoading(true);
        setError("");

        const data = await getLiveKitToken(roomId);
        console.log("LIVEKIT DATA RECEIVED:", data);

        if (mounted) {
          setLiveKitData(data);
        }
      } catch (err) {
        console.error("LiveKit connection failed:", err);

        if (mounted) {
          setError(err?.response?.data?.message || "Unable to join interview");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (roomId) {
      connectInterview();
    }

    return () => {
      mounted = false;
    };
  }, [roomId]);

  if (loading) {
    return <div>Connecting to interview...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!liveKitData) {
    return null;
  }

  return (
    <LiveKitInterviewRoom
      token={liveKitData.token}
      serverUrl={liveKitData.livekitUrl}
    />
  );
}
