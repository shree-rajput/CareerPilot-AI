import { http } from "./http";

export const applicationsApi = {
  create: async (payload) => {
    const { data } = await http.post("/applications", payload);
    return data;
  },

  getAll: async (status) => {
    const url = status ? `/applications?status=${status}` : "/applications";
    const { data } = await http.get(url);
    return data;
  },

  getOne: async (id) => {
    const { data } = await http.get(`/applications/${id}`);
    return data;
  },

  getIntelligence: async (id) => {
    const { data } = await http.get(`/applications/${id}/intelligence`);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await http.patch(`/applications/${id}`, payload);
    return data;
  },

  delete: async (id) => {
    const { data } = await http.delete(`/applications/${id}`);
    return data;
  }
};
