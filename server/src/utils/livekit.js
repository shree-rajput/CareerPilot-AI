import { AccessToken } from "livekit-server-sdk";

export function createLiveKitToken({ identity, roomName, name }) {
  if (!process.env.LIVEKIT_API_KEY) {
    throw new Error("LIVEKIT_API_KEY is not configured");
  }

  if (!process.env.LIVEKIT_API_SECRET) {
    throw new Error("LIVEKIT_API_SECRET is not configured");
  }

  if (!identity) {
    throw new Error("LiveKit identity is required");
  }

  if (!roomName) {
    throw new Error("LiveKit room name is required");
  }

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity,
      name,
      ttl: "1h",
    },
  );

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
