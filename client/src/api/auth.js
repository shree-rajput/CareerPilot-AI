import { http } from "./http";

export const authApi = {
  verifyEmail: (token) => http.post("/auth/verify-email", { token }).then((res) => res.data),
  resendVerification: (email) => http.post("/auth/resend-verification", { email }).then((res) => res.data),
  forgotPassword: (email) => http.post("/auth/forgot-password", { email }).then((res) => res.data),
  resetPassword: (token, newPassword) => http.post("/auth/reset-password", { token, newPassword }).then((res) => res.data),
};
