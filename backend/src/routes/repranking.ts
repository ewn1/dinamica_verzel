import { Router } from "express";
import { db } from "../db";

const router = Router();

router.get("/ranking", (_request, response) => {
  try {
    const loanCounts = new Map<number, number>();
    for (const loan of db.loans) {
      loanCounts.set(loan.bookId, (loanCounts.get(loan.bookId) ?? 0) + 1);
    }
    const ranking = db.books
      .filter(book => loanCounts.has(book.id))
      .map(book => ({
        bookId: book.id,
        title: book.title,
        author: book.author,
        totalLoans: loanCounts.get(book.id) ?? 0,
      }))
      .sort((first, second) =>
        second.totalLoans - first.totalLoans
        || first.title.localeCompare(second.title, "pt-BR")
        || first.bookId - second.bookId);
    response.status(200).json(ranking);
  } catch {
    response.status(500).json({ message: "Não foi possível carregar o ranking de livros." });
  }
});

export default router;

