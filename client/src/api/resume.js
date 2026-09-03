import { http } from "./http";

export const resumeApi = {
  upload: async (formData) => {
    const { data } = await http.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
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

  saveDraft: async (id, structuredData, templateId) => {
    const { data } = await http.post(`/resume/${id}/draft`, { structuredData, templateId });
    return data;
  },

  runParseabilityCheck: async (id) => {
    const { data } = await http.post(`/resume/${id}/parseability-check`);
    return data;
  },

  downloadPdf: async (id, filename = "Resume.pdf") => {
    const response = await http.get(`/resume/${id}/export/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadDocx: async (id, filename = "Resume.docx") => {
    const response = await http.get(`/resume/${id}/export/docx`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  analyze: async (resumeId, jobDescription) => {
    const { data } = await http.post("/resume/analyze", {
      resumeId,
      jobDescription,
    });
    return data;
  },

  tailor: async (id, jobDescription, jobId = null) => {
    const { data } = await http.post(`/resume/${id}/tailor`, { jobDescription, jobId });
    return data;
  },

  suggestBullets: async (id, bulletText, context = {}) => {
    const { data } = await http.post(`/resume/${id}/suggest-bullets`, { bulletText, context });
    return data;
  },

  delete: async (id) => {
    const { data } = await http.delete(`/resume/${id}`);
    return data;
  },

  getDiff: async (v1Id, v2Id) => {
    const { data } = await http.get(`/resume/diff?v1=${v1Id}&v2=${v2Id}`);
    return data;
  },

  getVersions: async (id) => {
    const { data } = await http.get(`/resume/${id}/versions`);
    return data;
  },

  restore: async (id) => {
    const { data } = await http.post(`/resume/${id}/restore`);
    return data;
  },

  downloadOriginal: async (id, fallbackName = "Original_Resume") => {
    const response = await http.get(`/resume/${id}/download`, {
      responseType: "blob",
    });
    
    // Extract filename from Content-Disposition header if present
    let filename = fallbackName;
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.includes("filename=")) {
      const matches = disposition.match(/filename="?([^";]+)"?/);
      if (matches && matches[1]) filename = matches[1];
    }

    const contentType = response.headers["content-type"] || "application/octet-stream";
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  download: async (id, fallbackName = "Original_Resume") => {
    return resumeApi.downloadOriginal(id, fallbackName);
  },

  getSuggestions: async (id, { jobId, jobDescription } = {}) => {
    const { data } = await http.post(`/resume/${id}/suggestions`, { jobId, jobDescription });
    return data;
  },

  downloadUrl: (id) => `/api/resume/${id}/download`,
  exportPdfUrl: (id) => `/api/resume/${id}/export/pdf`,
  exportDocxUrl: (id) => `/api/resume/${id}/export/docx`,
  viewUrl: (id) => `/api/resume/${id}/view`,
};
