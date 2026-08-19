import { api } from "./client.js";

export const interviewApi = {
  listSessions: async () => {
    const res = await api.get("/interview");
    return res.data.data;
  },
  createSession: async (data) => {
    const res = await api.post("/interview", data);
    return res.data.data;
  },
  getNextQuestion: async (sessionId) => {
    const res = await api.post(`/interview/${sessionId}/question`);
    return res.data.data;
  },
  submitAnswer: async (questionId, data) => {
    const res = await api.post(`/interview/question/${questionId}/answer`, data);
    return res.data.data;
  },
  completeSession: async (sessionId) => {
    const res = await api.post(`/interview/${sessionId}/complete`);
    return res.data.data;
  },
  getSessionReport: async (sessionId) => {
    const res = await api.get(`/interview/${sessionId}/report`);
    return res.data.data;
  }
};
