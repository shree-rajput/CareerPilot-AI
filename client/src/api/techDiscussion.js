import { http } from "./http";

export async function createTechDiscussionRoom(params = {}) {
  const response = await http.post("/tech-discussion", params);
  return response.data;
}

export async function getAIProblemRecommendation(topic = "DSA", difficulty = "medium") {
  const response = await http.get(`/tech-discussion/ai-recommendation?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`);
  return response.data;
}

export async function joinTechDiscussionRoom(roomId) {
  const response = await http.post(`/tech-discussion/${roomId}/join`);
  return response.data;
}

export async function getLiveKitToken(roomId) {
  const response = await http.post(`/tech-discussion/${roomId}/livekit-token`);
  return response.data;
}

export async function getAINudge(roomId, { currentCode, hintLevel, questionTitle, selectedSnippet }) {
  const response = await http.post(`/tech-discussion/${roomId}/nudge`, {
    currentCode,
    hintLevel,
    questionTitle,
    selectedSnippet
  });
  return response.data;
}

export async function executeContextAction(roomId, { actionType, selectedCode, currentCode, problem, userQuestion }) {
  const response = await http.post(`/tech-discussion/${roomId}/action`, {
    actionType,
    selectedCode,
    currentCode,
    problem,
    userQuestion
  });
  return response.data;
}

export async function endTechDiscussionSession(roomId) {
  const response = await http.post(`/tech-discussion/${roomId}/end`);
  return response.data;
}

export async function getTechDiscussionReport(roomId) {
  const response = await http.get(`/tech-discussion/${roomId}/report`);
  return response.data;
}
