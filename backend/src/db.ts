import type { Book, Loan, User } from "./types";

const users: User[] = [
  { id: 1, name: "Ana" },
  { id: 2, name: "Bruno" },
  { id: 3, name: "Carla" },
];

const books: Book[] = [
  {
    id: 1,
    title: "Dom Casmurro",
    author: "Machado de Assis",
    year: 1899,
    totalCopies: 1,
    availableCopies: 0,
  },
  {
    id: 2,
    title: "O Cortiço",
    author: "Aluísio Azevedo",
    year: 1890,
    totalCopies: 2,
    availableCopies: 2,
  },
  {
    id: 3,
    title: "Vidas Secas",
    author: "Graciliano Ramos",
    year: 1938,
    totalCopies: 3,
    availableCopies: 2,
  },
  {
    id: 4,
    title: "O Senhor dos Anéis",
    author: "J. R. R. Tolkien",
    year: 1954,
    totalCopies: 4,
    availableCopies: 3,
  },
  {
    id: 5,
    title: "Grande Sertão: Veredas",
    author: "Guimarães Rosa",
    year: 1956,
    totalCopies: 2,
    availableCopies: 2,
  },
  {
    id: 6,
    title: "A Hora da Estrela",
    author: "Clarice Lispector",
    year: 1977,
    totalCopies: 2,
    availableCopies: 2,
  },
];

const loans: Loan[] = [
  // Devolvidos (histórico)
  {
    id: 1,
    bookId: 4,
    userId: 1,
    loanDate: "2026-11-02T10:00:00.000Z",
    returnDate: "2026-11-05T10:00:00.000Z",
    status: "returned",
  },
  {
    id: 2,
    bookId: 1,
    userId: 2,
    loanDate: "2026-11-03T10:00:00.000Z",
    returnDate: "2026-11-08T10:00:00.000Z",
    status: "returned",
  },
  {
    id: 3,
    bookId: 3,
    userId: 3,
    loanDate: "2026-11-04T10:00:00.000Z",
    returnDate: "2026-11-10T10:00:00.000Z",
    status: "returned",
  },
  {
    id: 4,
    bookId: 4,
    userId: 2,
    loanDate: "2026-11-06T10:00:00.000Z",
    returnDate: "2026-11-12T10:00:00.000Z",
    status: "returned",
  },
  {
    id: 5,
    bookId: 2,
    userId: 3,
    loanDate: "2026-11-09T10:00:00.000Z",
    returnDate: "2026-11-14T10:00:00.000Z",
    status: "returned",
  },
  // Ativos
  {
    id: 6,
    bookId: 1,
    userId: 1,
    loanDate: "2026-11-15T10:00:00.000Z",
    returnDate: null,
    status: "active",
  },
  {
    id: 7,
    bookId: 3,
    userId: 2,
    loanDate: "2026-11-16T10:00:00.000Z",
    returnDate: null,
    status: "active",
  },
  {
    id: 8,
    bookId: 4,
    userId: 1,
    loanDate: "2026-11-17T10:00:00.000Z",
    returnDate: null,
    status: "active",
  },
];

export const db = { users, books, loans };

// Os contadores começam depois dos dados de teste, para nunca repetir um id
const counters = { book: books.length + 1, loan: loans.length + 1 };

export function nextBookId(): number {
  return counters.book++;
}

export function nextLoanId(): number {
  return counters.loan++;
}
