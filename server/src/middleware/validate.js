export function validate(schema) {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    req.body = result.data;
    return next();
  };
}
