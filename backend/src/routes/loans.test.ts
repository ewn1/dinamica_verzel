import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, beforeEach, test } from "node:test";
import express from "express";
import { db } from "../db";
import type { Loan } from "../types";
import router from "./loans";

const original = { ...db };
const request = { bookId: 1, userId: 1 };
const targetId = 100;
const returnPath = `/loans/${targetId}/return`;
const loanDate = "2025-01-01T00:00:00.000Z";
const returnDate = "2025-01-02T00:00:00.000Z";

function existingLoan(id: number, status: Loan["status"] = "active", userId = 1): Loan {
  return {
    id, bookId: 1, userId, status, loanDate,
    returnDate: status === "returned" ? returnDate : null,
  };
}

const app = express();
app.use(express.json());
app.use("/loans", router);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

// Top-level tests run in sequence. Each uses fresh arrays on the real db object.
beforeEach(() => {
  db.books = [
    { id: 1, title: "Acervo de teste", author: "Autor", year: 2020, totalCopies: 2, availableCopies: 1 },
  ];
  db.users = [{ id: 1, name: "Leitor" }, { id: 2, name: "Outra leitora" }];
  db.loans = [];
});

afterEach(() => {
  Object.assign(db, original);
});

async function post(path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  return { status: response.status, body: await response.json() };
}

function borrow(body: unknown = request) {
  return post("/loans", body);
}

function assertCurrentDate(date: string, started: number) {
  const time = Date.parse(date);
  assert.ok(time >= started && time <= Date.now());
  assert.equal(date, new Date(time).toISOString());
}

async function assertUnchanged(
  operation: () => ReturnType<typeof post>,
  status: number,
  message: string,
) {
  const before = structuredClone(db);
  assert.deepEqual(await operation(), { status, body: { errors: [message] } });
  assert.deepEqual(db, before);
}

test("cria o empréstimo, registra as datas e debita uma cópia", async () => {
  db.loans.push(
    existingLoan(100), existingLoan(101), existingLoan(102, "returned"),
    existingLoan(103, "active", 2),
  );
  const before = structuredClone(db);
  const started = Date.now();

  const result = await borrow();

  assert.equal(result.status, 201);
  assert.equal(db.loans.length, before.loans.length + 1);
  const loan = db.loans[before.loans.length];
  assert.ok(Number.isSafeInteger(loan.id) && loan.id > 0);
  assert.ok(!before.loans.some(({ id }) => id === loan.id));
  assertCurrentDate(loan.loanDate, started);
  assert.deepEqual(result.body, loan);
  assert.deepEqual(db, {
    ...before,
    books: [{ ...before.books[0], availableCopies: 0 }],
    loans: [...before.loans, {
      id: loan.id, ...request, status: "active", loanDate: loan.loanDate, returnDate: null,
    }],
  });
});

test("rejeita IDs ausentes ou inválidos na criação", async () => {
  const message = "Informe IDs válidos para o livro e o usuário.";
  await assertUnchanged(() => post("/loans"), 400, message);
  for (const body of [{}, { bookId: 1 }, { userId: 1 }]) {
    await assertUnchanged(() => borrow(body), 400, message);
  }
  for (const id of ["1", 0, -1, 1.5, null, Number.MAX_SAFE_INTEGER + 1]) {
    await assertUnchanged(() => borrow({ ...request, bookId: id }), 400, message);
    await assertUnchanged(() => borrow({ ...request, userId: id }), 400, message);
  }
});

test("rejeita a criação para livro inexistente", async () => {
  await assertUnchanged(() => borrow({ ...request, bookId: 50 }), 404, "Livro não encontrado.");
});

test("rejeita a criação para usuário inexistente", async () => {
  await assertUnchanged(() => borrow({ ...request, userId: 50 }), 404, "Usuário não encontrado.");
});

test("rejeita a criação sem estoque", async () => {
  db.books[0].availableCopies = 0;
  await assertUnchanged(borrow, 409, "Não há cópias disponíveis para empréstimo.");
});

test("rejeita a criação para usuário com três empréstimos ativos", async () => {
  db.loans.push(existingLoan(100), existingLoan(101), existingLoan(102));
  await assertUnchanged(borrow, 409, "O usuário já possui três empréstimos ativos.");
});

test("restaura o estoque se o registro do empréstimo falhar", async () => {
  Object.freeze(db.loans);
  await assertUnchanged(borrow, 500, "Não foi possível registrar o empréstimo.");
});

test("apenas uma requisição concorrente recebe a última cópia", async () => {
  const before = structuredClone(db);
  const results = await Promise.all([borrow(), borrow({ ...request, userId: 2 })]);
  const winner = results.find(({ status }) => status === 201);
  assert.ok(winner);
  assert.deepEqual(results.find(({ status }) => status !== 201), {
    status: 409, body: { errors: ["Não há cópias disponíveis para empréstimo."] },
  });
  assert.equal(winner.body.userId, results[0] === winner ? 1 : 2);
  assert.deepEqual(db, {
    ...before, books: [{ ...before.books[0], availableCopies: 0 }], loans: [winner.body],
  });
});

test("requisições concorrentes para livros diferentes respeitam o limite de três ativos", async () => {
  db.loans.push(existingLoan(100), existingLoan(101));
  db.books.push({ ...db.books[0], id: 2 });
  const before = structuredClone(db);
  const results = await Promise.all([borrow(), borrow({ ...request, bookId: 2 })]);
  const winner = results.find(({ status }) => status === 201);
  assert.ok(winner);
  assert.deepEqual(results.find(({ status }) => status !== 201), {
    status: 409, body: { errors: ["O usuário já possui três empréstimos ativos."] },
  });
  assert.equal(winner.body.bookId, results[0] === winner ? 1 : 2);
  assert.deepEqual(db, {
    ...before,
    books: before.books.map((book) => ({
      ...book, availableCopies: book.availableCopies - Number(book.id === winner.body.bookId),
    })),
    loans: [...before.loans, winner.body],
  });
});

test("devolve um empréstimo e altera apenas o registro e o estoque associados", async () => {
  db.loans.push(existingLoan(targetId), existingLoan(101, "active", 2));
  db.books.push({ ...db.books[0], id: 2 });
  const before = structuredClone(db);
  const started = Date.now();

  const result = await post(returnPath);

  assert.equal(result.status, 200);
  assertCurrentDate(result.body.returnDate, started);
  const returned = { ...before.loans[0], status: "returned", returnDate: result.body.returnDate };
  assert.deepEqual(result.body, returned);
  assert.deepEqual(db, {
    ...before,
    books: [{ ...before.books[0], availableCopies: 2 }, before.books[1]],
    loans: [returned, before.loans[1]],
  });
});

test("rejeita IDs inválidos na devolução", async () => {
  for (const id of ["0", "-1", "1.5", "1e2", "0x64", "abc", "9007199254740992"]) {
    await assertUnchanged(
      () => post(`/loans/${id}/return`), 400, "Informe um ID válido para o empréstimo.",
    );
  }
});

test("rejeita devolução de empréstimo inexistente", async () => {
  await assertUnchanged(() => post(returnPath), 404, "Empréstimo não encontrado.");
});

test("rejeita nova devolução e preserva a data original", async () => {
  db.loans.push(existingLoan(targetId, "returned"));
  await assertUnchanged(() => post(returnPath), 409, "Este empréstimo já foi devolvido.");
});

test("rejeita a devolução quando o livro associado está ausente", async () => {
  db.loans.push({ ...existingLoan(targetId), bookId: 50 });
  await assertUnchanged(
    () => post(returnPath), 409, "O livro associado ao empréstimo não foi encontrado.",
  );
});

test("rejeita a devolução quando o estoque atingiu o total de cópias", async () => {
  db.loans.push(existingLoan(targetId));
  db.books[0].availableCopies = db.books[0].totalCopies;
  await assertUnchanged(() => post(returnPath), 409, "O estoque já está no limite de cópias do livro.");
});

test("preserva o empréstimo se o incremento do estoque falhar", async () => {
  db.loans.push(existingLoan(targetId));
  Object.freeze(db.books[0]);
  await assertUnchanged(() => post(returnPath), 500, "Não foi possível registrar a devolução.");
});

test("restaura o estoque se a atualização do empréstimo falhar", async () => {
  db.loans.push(existingLoan(targetId));
  Object.freeze(db.loans);
  await assertUnchanged(() => post(returnPath), 500, "Não foi possível registrar a devolução.");
});

test("devoluções concorrentes incrementam o estoque uma vez e preservam a primeira data", async () => {
  db.loans.push(existingLoan(targetId));
  const before = structuredClone(db);
  const started = Date.now();

  const results = await Promise.all([post(returnPath), post(returnPath)]);
  const winner = results.find(({ status }) => status === 200);
  assert.ok(winner);
  assertCurrentDate(winner.body.returnDate, started);
  assert.deepEqual(results.find(({ status }) => status !== 200), {
    status: 409, body: { errors: ["Este empréstimo já foi devolvido."] },
  });
  const returned = { ...before.loans[0], status: "returned", returnDate: winner.body.returnDate };
  assert.deepEqual(winner.body, returned);
  assert.deepEqual(db, {
    ...before, books: [{ ...before.books[0], availableCopies: 2 }], loans: [returned],
  });
});
