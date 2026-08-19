import { User } from "../models/User.js";
import { AppError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/tokens.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new AppError("User no longer exists", 401, "USER_NOT_FOUND");
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError("Invalid or expired token", 401, "INVALID_TOKEN")
    );
  }
}
