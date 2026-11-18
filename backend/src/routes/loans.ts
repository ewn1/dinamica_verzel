import { Router } from "express";
import { db, nextLoanId } from "../db";
import type { Book, Loan } from "../types";

const router = Router();

function isValidId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

// Keep the two writes synchronous so other requests cannot observe an intermediate state.
function updateStockAndLoan(book: Book, change: number, loan: Loan, index?: number) {
  const loans = db.loans;
  const previousStock = book.availableCopies;
  const previousLength = loans.length;
  const previousLoan = index === undefined ? undefined : loans[index];

  try {
    book.availableCopies = previousStock + change;
    if (index === undefined) {
      loans.push(loan);
    } else {
      loans[index] = loan;
    }
  } catch (error) {
    try {
      if (index !== undefined && previousLoan !== undefined && loans[index] !== previousLoan) {
        loans[index] = previousLoan;
      }
      if (loans.length !== previousLength) {
        loans.length = previousLength;
      }
    } finally {
      if (!Object.is(book.availableCopies, previousStock)) {
        book.availableCopies = previousStock;
      }
    }
    throw error;
  }
}

router.post("/", (req, res) => {
  const { bookId, userId } = req.body ?? {};
  if (!isValidId(bookId) || !isValidId(userId)) {
    res.status(400).json({ errors: ["Informe IDs válidos para o livro e o usuário."] });
    return;
  }

  const book = db.books.find((item) => item.id === bookId);
  if (!book) {
    res.status(404).json({ errors: ["Livro não encontrado."] });
    return;
  }

  if (!db.users.some((user) => user.id === userId)) {
    res.status(404).json({ errors: ["Usuário não encontrado."] });
    return;
  }

  if (book.availableCopies <= 0) {
    res.status(409).json({ errors: ["Não há cópias disponíveis para empréstimo."] });
    return;
  }

  const activeLoans = db.loans.filter((loan) => loan.userId === userId && loan.status === "active");
  if (activeLoans.length >= 3) {
    res.status(409).json({ errors: ["O usuário já possui três empréstimos ativos."] });
    return;
  }

  const loan: Loan = {
    id: nextLoanId(),
    bookId,
    userId,
    status: "active",
    loanDate: new Date().toISOString(),
    returnDate: null,
  };

  try {
    updateStockAndLoan(book, -1, loan);
  } catch {
    res.status(500).json({ errors: ["Não foi possível registrar o empréstimo."] });
    return;
  }

  res.status(201).json(loan);
});

router.post("/:id/return", (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !isValidId(id)) {
    res.status(400).json({ errors: ["Informe um ID válido para o empréstimo."] });
    return;
  }

  const index = db.loans.findIndex((item) => item.id === id);
  if (index === -1) {
    res.status(404).json({ errors: ["Empréstimo não encontrado."] });
    return;
  }

  const loan = db.loans[index];
  if (loan.status !== "active") {
    res.status(409).json({ errors: ["Este empréstimo já foi devolvido."] });
    return;
  }

  const book = db.books.find((item) => item.id === loan.bookId);
  if (!book) {
    res.status(409).json({ errors: ["O livro associado ao empréstimo não foi encontrado."] });
    return;
  }

  if (book.availableCopies >= book.totalCopies) {
    res.status(409).json({ errors: ["O estoque já está no limite de cópias do livro."] });
    return;
  }

  const returned: Loan = {
    ...loan,
    status: "returned",
    returnDate: new Date().toISOString(),
  };

  try {
    updateStockAndLoan(book, 1, returned, index);
  } catch {
    res.status(500).json({ errors: ["Não foi possível registrar a devolução."] });
    return;
  }

  res.status(200).json(returned);
});

export default router;
