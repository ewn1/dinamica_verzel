import { Router } from "express";
import { db } from "../db";
import {
  generateLoanReport,
  parseLoanFilters,
} from "../services/loanReport";
import { generateLoansCsv } from "../utils/loansCsv";

const router = Router();

router.get("/export.csv", (req, res) => {
  const { filters, errors } = parseLoanFilters(req.query);

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const rows = generateLoanReport(db, filters);
  const csv = generateLoansCsv(rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="emprestimos.csv"'
  );

  res.status(200).send(csv);
});

export default router;