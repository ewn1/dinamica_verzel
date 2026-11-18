export interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
  totalCopies: number;
  availableCopies: number;
}

export interface User {
  id: number;
  name: string;
}

export type LoanStatus = "active" | "returned";

export interface Loan {
  id: number;
  bookId: number;
  userId: number;
  loanDate: string;
  returnDate: string | null;
  status: LoanStatus;
}
