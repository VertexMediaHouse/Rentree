import { Router } from "express";
import { getConversationToken } from "../lib/elevenlabs";

const router = Router();

/**
 * GET /api/elevenlabs/token
 * Returns an ephemeral signed conversation token for low-latency WebRTC sessions.
 */
router.get("/token", async (req, res, next) => {
  try {
    const agentId = typeof req.query.agent_id === "string" ? req.query.agent_id : undefined;
    const data = await getConversationToken(agentId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
