import { http } from "./http";

export const interviewApi = {
  listSessions: async () => {
    const res = await http.get("/interview");
    return res.data.data;
  },
  createSession: async (data) => {
    const res = await http.post("/interview", data);
    return res.data.data;
  },
  getNextQuestion: async (sessionId) => {
    const res = await http.post(`/interview/${sessionId}/question`);
    return res.data.data;
  },
  submitAnswer: async (questionId, data) => {
    const payload = typeof data === "string" ? { transcript: data, answer: data } : {
      transcript: data?.transcript || data?.answer || data?.text || "",
      answer: data?.answer || data?.transcript || data?.text || "",
      ...(typeof data === "object" ? data : {})
    };
    const res = await http.post(`/interview/question/${questionId}/answer`, payload);
    // Returns { question, interviewerReaction }
    return res.data.data;
  },
  runCode: async (questionId, data) => {
    const res = await http.post(`/interview/question/${questionId}/run`, data);
    return res.data.data;
  },
  submitCodingAnswer: async (questionId, data) => {
    const res = await http.post(`/interview/question/${questionId}/coding-answer`, data);
    // Returns { passedTests, totalTests, results, aiReview, codingFollowUp }
    return res.data.data;
  },
  completeSession: async (sessionId) => {
    const res = await http.post(`/interview/${sessionId}/complete`);
    return res.data.data;
  },
  getSessionReport: async (sessionId) => {
    const res = await http.get(`/interview/${sessionId}/report`);
    return res.data.data;
  },
  getHistory: async (params = {}) => {
    const res = await http.get("/interview/history", { params });
    return res.data.data;
  },
  getReplay: async (sessionId) => {
    const res = await http.get(`/interview/${sessionId}/replay`);
    return res.data.data;
  },
  transcribeAudio: async (formData) => {
    const res = await http.post(`/interview/transcribe`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }
};

