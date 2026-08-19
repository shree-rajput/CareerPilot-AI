import { http } from "./http";

export const resumeApi = {
  upload: async (formData) => {
    // Note: formData must be sent directly, no JSON stringify
    const { data } = await http.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  
  getAll: async () => {
    const { data } = await http.get("/resume");
    return data;
  },
  
  getOne: async (id) => {
    const { data } = await http.get(`/resume/${id}`);
    return data;
  },
  
  delete: async (id) => {
    const { data } = await http.delete(`/resume/${id}`);
    return data;
  },
  
  getDiff: async (v1Id, v2Id) => {
    const { data } = await http.get(`/resume/diff?v1=${v1Id}&v2=${v2Id}`);
    return data;
  }
};
