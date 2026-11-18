import { Router } from "express";
import type { Book, Loan, User } from "../types";

type NewLoan = Pick<Loan, "bookId" | "userId"> & {
  status: "active";
  loanDate: Date;
  returnDate: null;
};

type LoanTransaction = {
  book: {
    findUnique(args: { where: { id: number } }): Promise<Book | null>;
    updateMany(args: {
      where: { id: number; availableCopies: { gt: number } };
      data: { availableCopies: { decrement: number } };
    }): Promise<{ count: number }>;
  };
  user: {
    findUnique(args: { where: { id: number } }): Promise<User | null>;
  };
  loan: {
    count(args: { where: { userId: number; status: "active" } }): Promise<number>;
    create(args: { data: NewLoan }): Promise<Omit<Loan, "status" | "loanDate" | "returnDate"> & {
      status: string;
      loanDate: Date;
      returnDate: Date | null;
    }>;
  };
};

export type LoansPrisma = {
  $transaction<T>(operation: (transaction: LoanTransaction) => Promise<T>): Promise<T>;
};

class LoanError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function isValidId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function createLoansRouter(prisma?: LoansPrisma) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!prisma) {
      res.status(503).json({ errors: ["O serviço de empréstimos está indisponível."] });
      return;
    }

    const { bookId, userId } = req.body ?? {};
    if (!isValidId(bookId) || !isValidId(userId)) {
      res.status(400).json({ errors: ["Informe IDs válidos para o livro e o usuário."] });
      return;
    }

    try {
      const loan = await prisma.$transaction(async (transaction) => {
        const book = await transaction.book.findUnique({ where: { id: bookId } });
        if (!book) throw new LoanError(404, "Livro não encontrado.");

        const user = await transaction.user.findUnique({ where: { id: userId } });
        if (!user) throw new LoanError(404, "Usuário não encontrado.");

        if (book.availableCopies <= 0) {
          throw new LoanError(409, "Não há cópias disponíveis para empréstimo.");
        }

        const activeLoans = await transaction.loan.count({
          where: { userId, status: "active" },
        });
        if (activeLoans >= 3) {
          throw new LoanError(409, "O usuário já possui três empréstimos ativos.");
        }

        const stock = await transaction.book.updateMany({
          where: { id: bookId, availableCopies: { gt: 0 } },
          data: { availableCopies: { decrement: 1 } },
        });
        if (stock.count === 0) {
          throw new LoanError(409, "Não há cópias disponíveis para empréstimo.");
        }

        return transaction.loan.create({
          data: { bookId, userId, status: "active", loanDate: new Date(), returnDate: null },
        });
      });

      res.status(201).json(loan);
    } catch (error) {
      if (error instanceof LoanError) {
        res.status(error.status).json({ errors: [error.message] });
        return;
      }
      res.status(500).json({ errors: ["Não foi possível registrar o empréstimo."] });
    }
  });

  return router;
}

export default createLoansRouter();
