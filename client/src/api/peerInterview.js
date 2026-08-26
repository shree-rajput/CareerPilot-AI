import { http } from "./http";

// export async function getLiveKitToken(roomId) {
//   const response = await http.post(`/interview-rooms/${roomId}/livekit-token`);

//   const payload = response.data;

//   if (!payload?.success) {
//     throw new Error(payload?.message || "Failed to generate LiveKit token");
//   }

//   const liveKitData = payload.data;

//   if (!liveKitData?.token) {
//     throw new Error("LiveKit token missing from server response");
//   }

//   if (!liveKitData?.livekitUrl) {
//     throw new Error("LiveKit URL missing from server response");
//   }

//   if (typeof liveKitData.token !== "string") {
//     throw new Error("LiveKit token must be a string");
//   }

//   return liveKitData;
// }
export const getLiveKitToken = async (interviewId) => {
  const response = await http.post(`/interview-rooms/${interviewId}/livekit-token`);

  const liveKitData = response.data;

  if (!liveKitData) {
    throw new Error("Invalid LiveKit token response");
  }

  if (typeof liveKitData.token !== "string") {
    console.error("Invalid LiveKit token:", liveKitData);
    throw new Error("LiveKit token must be a string");
  }

  return liveKitData;
};
export async function createPeerInterviewRoom(params = {}) {
  const response = await http.post("/interview-rooms", params);
  return response.data;
}

export async function joinPeerInterviewRoom(roomId) {
  const response = await http.post(`/interview-rooms/${roomId}/join`);

  return response.data;
}

export const getCodingQuestion = async (sessionId) => {
  const response = await http.get(`/interview/${sessionId}/coding-question`);

  return response.data;
};
