import { Router } from "express";
import { db } from "../db";
import { generateLoanReport, parseLoanFilters } from "../services/loanReport";

const router = Router();

router.get("/", (req, res) => {
  const { filters, errors } = parseLoanFilters(req.query);

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  res.json(generateLoanReport(db, filters));
});

export default router;