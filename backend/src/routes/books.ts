import { Router } from "express";
import { db, nextBookId } from "../db";
import type { Book } from "../types";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.books);
});

router.post("/", (req, res) => {
  const { title, author, year, copies } = req.body ?? {};
  const errors: string[] = [];
  const currentYear = new Date().getFullYear();

  if (typeof title !== "string" || title.trim() === "") {
    errors.push("O título é obrigatório.");
  }
  if (typeof author !== "string" || author.trim() === "") {
    errors.push("O autor é obrigatório.");
  }
  if (!Number.isInteger(year) || year < 1) {
    errors.push("Informe um ano de publicação válido.");
  } else if (year > currentYear) {
    errors.push("O ano de publicação não pode ser no futuro.");
  }
  if (!Number.isInteger(copies)) {
    errors.push("Informe a quantidade de cópias.");
  } else if (copies < 0) {
    errors.push("A quantidade de cópias não pode ser negativa.");
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const book: Book = {
    id: nextBookId(),
    title: title.trim(),
    author: author.trim(),
    year,
    totalCopies: copies,
    availableCopies: copies,
  };
  db.books.push(book);
  res.status(201).json(book);
});

export default router;
