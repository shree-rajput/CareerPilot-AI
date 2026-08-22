import { http } from "./http";

export const matchApi = {
  runMatch: async (applicationId, resumeId) => {
    const { data } = await http.post("/match", { applicationId, resumeId });
    return data;
  },
  
  getOne: async (id) => {
    const { data } = await http.get(`/match/${id}`);
    return data;
  }
};

export const tailoringApi = {
  getRecommendations: async (applicationId, resumeId) => {
    const { data } = await http.post("/tailor", { applicationId, resumeId });
    return data;
  }
};

export const analyticsApi = {
  getDashboard: async () => {
    const { data } = await http.get("/analytics/dashboard");
    return data;
  },

  getCareerIntelligence: async () => {
    const { data } = await http.get("/analytics/career-intelligence");
    return data;
  },
  
  getTrends: async () => {
    const { data } = await http.get("/analytics/trends");
    return data;
  },
  
  getDistribution: async () => {
    const { data } = await http.get("/analytics/distribution");
    return data;
  }
};
