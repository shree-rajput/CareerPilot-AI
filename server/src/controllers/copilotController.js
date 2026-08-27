import * as copilotService from "../services/career/copilotService.js";

export const askCopilot = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { query } = req.body;
    const response = await copilotService.askCopilot(userId, query);
    res.status(200).json({ status: "success", data: response });
  } catch (error) {
    next(error);
  }
};
