import { http } from "./http";

export const jobsApi = {
  ingest: async (payload) => {
    const { data } = await http.post("/jobs/ingest", payload);
    return data;
  },

  uploadJdPdf: async (formData) => {
    const { data } = await http.post("/jobs/upload-jd-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  getInbox: async () => {
    const { data } = await http.get("/jobs/inbox");
    return data;
  },

  getAll: async (params = {}) => {
    const { data } = await http.get("/jobs", { params });
    return data;
  },

  getOne: async (id) => {
    const { data } = await http.get(`/jobs/${id}`);
    return data;
  },

  delete: async (id) => {
    const { data } = await http.delete(`/jobs/${id}`);
    return data;
  },
};
