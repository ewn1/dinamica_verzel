import type { Book, Loan, User } from "./types";

export const db = {
  books: [] as Book[],
  users: [
    { id: 1, name: "Ana" },
    { id: 2, name: "Bruno" },
    { id: 3, name: "Carla" },
  ] as User[],
  loans: [] as Loan[],
};

const counters = { book: 1, loan: 1 };

export function nextBookId(): number {
  return counters.book++;
}

export function nextLoanId(): number {
  return counters.loan++;
}
