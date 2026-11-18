import { Router } from "express";
import { db } from "../db";
import { generateLoansCsv } from "../utils/loansCsv";

const router = Router();

router.get("/export.csv", (req, res) => {
  const { userId, from, to, status } = req.query;

  if (
    (userId !== undefined &&
      (typeof userId !== "string" ||
        !/^[1-9]\d*$/.test(userId))) ||
    (status !== undefined &&
      status !== "active" &&
      status !== "returned") ||
    (from !== undefined &&
      (typeof from !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(from))) ||
    (to !== undefined &&
      (typeof to !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(to)))
  ) {
    res.status(400).json({
      errors: ["Filtros inválidos"],
    });
    return;
  }

  const filteredLoans = db.loans.filter((loan) => {
    if (userId && loan.userId !== Number(userId)) {
      return false;
    }

    if (status && loan.status !== status) {
      return false;
    }

    const date = loan.loanDate.slice(0, 10);

    if (from && date < from) return false;
    if (to && date > to) return false;

    return true;
  });

  const rows = filteredLoans.map((loan) => {
    const book = db.books.find(
      (item) => item.id === loan.bookId
    );

    const user = db.users.find(
      (item) => item.id === loan.userId
    );

    return {
      id: loan.id,
      book: book?.title ?? "Livro não encontrado",
      user: user?.name ?? "Usuário não encontrado",
      loanDate: loan.loanDate,
      status: loan.status,
    };
  });

  const csv = generateLoansCsv(rows);

  res.setHeader(
    "Content-Type",
    "text/csv; charset=utf-8"
  );

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="emprestimos.csv"'
  );

  res.status(200).send(csv);
});

export default router;