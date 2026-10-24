import { Router } from "express";
import { dealScoreSchema, investmentSchema, rentScoreSchema, matchSchema, mortgageSchema, rtaSchema } from "../lib/schemas";
import { validate } from "../middleware/http";
import { calculateMortgageAffordability } from "../services/mortgageCalculator";
import { calculateMatchScore, calculateNetRent } from "../services/matchCalculator";
import { calculateRTANoticeDates } from "../services/rtaCalculator";
import { dealScore, rentFairnessScore } from "../services/scoreService";
import { calculateInvestmentMetrics } from "../services/investmentCalculator";

const router = Router();

router.post("/mortgage", validate(mortgageSchema), (req, res) => {
  res.json({ success: true, data: calculateMortgageAffordability(req.body) });
});

router.post("/match", validate(matchSchema), (req, res) => {
  const { scores, prefs, basePrice, addOns, selectedAddOns } = req.body;
  const matchScore = calculateMatchScore(scores, prefs);
  const netRent =
    typeof basePrice === "number" && addOns ? calculateNetRent(basePrice, addOns, selectedAddOns) : null;
  res.json({ success: true, data: { matchScore, netRent } });
});

router.post("/rta-notice", validate(rtaSchema), (req, res) => {
  res.json({ success: true, data: calculateRTANoticeDates(req.body) });
});

router.post("/investment", validate(investmentSchema), (req, res) => {
  res.json({ success: true, data: calculateInvestmentMetrics(req.body) });
});

router.post("/rent-score", validate(rentScoreSchema), (req, res) => {
  res.json({ success: true, data: rentFairnessScore(req.body) });
});

router.post("/deal-score", validate(dealScoreSchema), (req, res) => {
  res.json({ success: true, data: dealScore(req.body) });
});

export default router;
