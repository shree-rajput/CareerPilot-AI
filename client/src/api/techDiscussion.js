import { http } from "./http";

export async function createTechDiscussionRoom(params = {}) {
  const response = await http.post("/tech-discussion", params);
  return response.data;
}

export async function getAIProblemRecommendation(topic = "architecture", difficulty = "medium", experienceLevel = "junior", excludeId = "") {
  const query = new URLSearchParams({
    topic,
    category: topic,
    difficulty,
    experienceLevel,
    ...(excludeId ? { excludeId } : {})
  }).toString();
  const response = await http.get(`/tech-discussion/ai-recommendation?${query}`);
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

export async function executeTechDiscussionCode(roomId, { questionId, language, code }) {
  const response = await http.post(`/tech-discussion/${roomId}/execute`, {
    questionId,
    language,
    code
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

export async function getNextQuestion(roomId) {
  const response = await http.post(`/tech-discussion/${roomId}/next-question`);
  return response.data;
}

export async function getProgrammingLanguages() {
  const response = await http.get("/tech-discussion/languages");
  return response.data;
}

export async function getTechDiscussionSession(roomId) {
  const response = await http.get(`/tech-discussion/${roomId}/session`);
  return response.data;
}

export async function getTechDiscussionHistory(page = 1, limit = 20) {
  const response = await http.get(`/tech-discussion/history?page=${page}&limit=${limit}`);
  return response.data;
}

export async function saveTechDiscussionDraft(roomId, { code, language, activeWorkspace }) {
  const response = await http.post(`/tech-discussion/${roomId}/draft`, { code, language, activeWorkspace });
  return response.data;
}



