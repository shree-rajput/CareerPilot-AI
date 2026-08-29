import { http } from "./http";

export const codingApi = {
  getQuestions: async () => {
    const { data } = await http.get("/coding/questions");
    return data;
  },

  getQuestion: async (id) => {
    const { data } = await http.get(`/coding/questions/${id}`);
    return data;
  },

  submitCode: async (id, language, code) => {
    const { data } = await http.post(`/coding/questions/${id}/submit`, {
      language,
      code,
    });
    return data;
  },

  getSubmissions: async () => {
    const { data } = await http.get("/coding/submissions");
    return data;
  },
};
