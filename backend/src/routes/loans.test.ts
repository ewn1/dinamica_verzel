import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import type { Book, Loan, User } from "../types";
import router, { createLoansRouter, type LoansPrisma } from "./loans";

type StoredLoan = Omit<Loan, "loanDate" | "returnDate"> & {
  loanDate: Date;
  returnDate: Date | null;
};

function fixture() {
  const books: Book[] = [
    { id: 1, title: "Livro de teste", author: "Autor", year: 2000, totalCopies: 2, availableCopies: 2 },
  ];
  const users: User[] = [{ id: 1, name: "Usuário de teste" }];
  const loans: StoredLoan[] = [];
  return { books, users, loans };
}

function simulatePrisma(
  data: ReturnType<typeof fixture>,
  options: {
    beforeCreate?: (draft: ReturnType<typeof fixture>) => void | Promise<void>;
    onTransactionRequested?: (count: number) => void;
    onTransactionStarted?: (number: number, draft: ReturnType<typeof fixture>) => void;
    missStockUpdate?: boolean;
  } = {},
) {
  let transactions = 0;
  let queue = Promise.resolve();
  const prisma: LoansPrisma = {
    $transaction(operation) {
      const number = ++transactions;
      options.onTransactionRequested?.(number);
      // Snapshot only after the preceding transaction has committed or rolled back.
      const transaction = queue.then(async () => {
        const draft = structuredClone(data);
        options.onTransactionStarted?.(number, draft);
        const result = await operation({
          book: {
            async findUnique({ where }) {
              return draft.books.find((book) => book.id === where.id) ?? null;
            },
            async updateMany({ where, data: changes }) {
              const book = draft.books.find(
                (item) => item.id === where.id && item.availableCopies > where.availableCopies.gt,
              );
              if (!book || options.missStockUpdate) return { count: 0 };
              book.availableCopies -= changes.availableCopies.decrement;
              return { count: 1 };
            },
          },
          user: {
            async findUnique({ where }) {
              return draft.users.find((user) => user.id === where.id) ?? null;
            },
          },
          loan: {
            async count({ where }) {
              return draft.loans.filter(
                (loan) => loan.userId === where.userId && loan.status === where.status,
              ).length;
            },
            async create({ data: loan }) {
              await options.beforeCreate?.(draft);
              const id = Math.max(0, ...draft.loans.map((item) => item.id)) + 1;
              const created = { id, ...loan };
              draft.loans.push(created);
              return created;
            },
          },
        });
        Object.assign(data, draft);
        return result;
      });
      queue = transaction.then(() => {}, () => {});
      return transaction;
    },
  };

  return { prisma, transactions: () => transactions };
}

async function postLoan(body?: unknown, prisma?: LoansPrisma) {
  const app = express();
  app.use(express.json());
  app.use("/loans", prisma ? createLoansRouter(prisma) : router);
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/loans`, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
}

const request = { bookId: 1, userId: 1 };

function existingLoan(id: number, status: Loan["status"], userId = 1): StoredLoan {
  return {
    id,
    bookId: 1,
    userId,
    status,
    loanDate: new Date("2025-01-01T00:00:00Z"),
    returnDate: status === "returned" ? new Date("2025-01-02T00:00:00Z") : null,
  };
}

test("cria o empréstimo, registra as datas e debita uma cópia", async () => {
  const data = fixture();
  data.loans.push(
    existingLoan(1, "active"),
    existingLoan(2, "active"),
    existingLoan(3, "returned"),
    existingLoan(4, "active", 2),
  );
  data.users.push({ id: 2, name: "Outro usuário" });
  const before = structuredClone(data);
  const mock = simulatePrisma(data);
  const started = Date.now();

  const result = await postLoan(request, mock.prisma);

  assert.equal(result.status, 201);
  const loan = data.loans.at(-1)!;
  assert.deepEqual(loan, {
    id: 5,
    ...request,
    status: "active",
    loanDate: loan.loanDate,
    returnDate: null,
  });
  assert.ok(loan.loanDate.getTime() >= started && loan.loanDate.getTime() <= Date.now());
  assert.deepEqual(result.body, { ...loan, loanDate: loan.loanDate.toISOString() });
  assert.deepEqual(data.loans.slice(0, -1), before.loans);
  assert.deepEqual(data.users, before.users);
  assert.deepEqual(data.books, [{ ...before.books[0], availableCopies: 1 }]);
  assert.equal(mock.transactions(), 1);
});

test("rejeita dados ausentes ou inválidos antes da transação", async () => {
  const data = fixture();
  const before = structuredClone(data);
  const mock = simulatePrisma(data);
  const invalidIds = ["1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, null];
  const invalidBodies = [
    undefined,
    {},
    { bookId: 1 },
    { userId: 1 },
    ...invalidIds.flatMap((id) => [{ ...request, bookId: id }, { ...request, userId: id }]),
  ];
  for (const invalid of invalidBodies) {
    assert.deepEqual(await postLoan(invalid, mock.prisma), {
      status: 400,
      body: { errors: ["Informe IDs válidos para o livro e o usuário."] },
    });
    assert.deepEqual(data, before);
  }
  assert.equal(mock.transactions(), 0);
});

const rejectedLoans = [
  { name: "livro inexistente", payload: { ...request, bookId: 2 }, status: 404, message: "Livro não encontrado." },
  { name: "usuário inexistente", payload: { ...request, userId: 2 }, status: 404, message: "Usuário não encontrado." },
  {
    name: "estoque indisponível", payload: request, status: 409,
    message: "Não há cópias disponíveis para empréstimo.",
    arrange(data: ReturnType<typeof fixture>) { data.books[0].availableCopies = 0; },
  },
  {
    name: "limite de três ativos", payload: request, status: 409,
    message: "O usuário já possui três empréstimos ativos.",
    arrange(data: ReturnType<typeof fixture>) {
      data.loans.push(...[1, 2, 3].map((id) => existingLoan(id, "active")));
    },
  },
];

for (const scenario of rejectedLoans) {
  test(`rejeita empréstimo com ${scenario.name} e preserva os dados`, async () => {
    const data = fixture();
    scenario.arrange?.(data);
    const before = structuredClone(data);
    const { prisma } = simulatePrisma(data);

    assert.deepEqual(await postLoan(scenario.payload, prisma), {
      status: scenario.status,
      body: { errors: [scenario.message] },
    });
    assert.deepEqual(data, before);
  });
}

test("rejeita a operação se a atualização condicional do estoque não afetar uma linha", async () => {
  const data = fixture();
  const before = structuredClone(data);
  const { prisma } = simulatePrisma(data, { missStockUpdate: true });

  assert.deepEqual(await postLoan(request, prisma), {
    status: 409,
    body: { errors: ["Não há cópias disponíveis para empréstimo."] },
  });
  assert.deepEqual(data, before);
});

test("reverte o débito de estoque quando a gravação do empréstimo falha", async () => {
  const data = fixture();
  const before = structuredClone(data);
  let stockAtFailure: number | undefined;
  const { prisma } = simulatePrisma(data, {
    beforeCreate(draft) {
      stockAtFailure = draft.books[0].availableCopies;
      throw new Error("Falha simulada ao gravar empréstimo");
    },
  });

  assert.deepEqual(await postLoan(request, prisma), {
    status: 500,
    body: { errors: ["Não foi possível registrar o empréstimo."] },
  });
  assert.equal(stockAtFailure, before.books[0].availableCopies - 1);
  assert.deepEqual(data, before);
});

test("o router padrão responde 503 enquanto não há Prisma conectado", async () => {
  assert.deepEqual(await postLoan(request), {
    status: 503,
    body: { errors: ["O serviço de empréstimos está indisponível."] },
  });
});

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function postOverlappingLoans(
  data: ReturnType<typeof fixture>,
  first: typeof request,
  second: typeof request,
  failFirst = false,
) {
  const before = structuredClone(data);
  const firstAtCreate = signal();
  const secondQueued = signal();
  const releaseFirst = signal();
  let secondInitialState: ReturnType<typeof fixture> | undefined;
  let writes = 0;

  const { prisma } = simulatePrisma(data, {
    onTransactionRequested(count) {
      if (count === 2) secondQueued.resolve();
    },
    onTransactionStarted(number, draft) {
      if (number === 2) secondInitialState = structuredClone(draft);
    },
    async beforeCreate() {
      if (++writes !== 1) return;
      firstAtCreate.resolve();
      await releaseFirst.promise;
      if (failFirst) throw new Error("Falha simulada na primeira transação");
    },
  });

  const firstResult = postLoan(first, prisma);
  let secondResult: ReturnType<typeof postLoan> | undefined;
  try {
    const firstReachedCreate = await Promise.race([
      firstAtCreate.promise.then(() => true),
      firstResult.then(() => false),
    ]);
    assert.ok(firstReachedCreate, "A primeira transação deve chegar à criação");

    secondResult = postLoan(second, prisma);
    const secondReachedQueue = await Promise.race([
      secondQueued.promise.then(() => true),
      secondResult.then(() => false),
    ]);
    assert.ok(secondReachedQueue, "A segunda transação deve entrar na fila");
    assert.equal(secondInitialState, undefined, "A segunda transação deve aguardar a primeira");
    assert.deepEqual(data, before, "O débito da primeira transação ainda não foi confirmado");
  } finally {
    releaseFirst.resolve();
    firstAtCreate.resolve();
    secondQueued.resolve();
    await Promise.allSettled([firstResult, secondResult]);
  }

  assert.ok(secondResult);
  return [await firstResult, await secondResult, secondInitialState] as const;
}

test("uma única solicitação concorrente fica com a última cópia", async () => {
  const data = fixture();
  data.books[0].availableCopies = 1;
  data.users.push({ id: 2, name: "Outro usuário" });
  const before = structuredClone(data);

  const [first, second] = await postOverlappingLoans(data, request, { ...request, userId: 2 });

  assert.equal(first.status, 201);
  assert.deepEqual(second, {
    status: 409,
    body: { errors: ["Não há cópias disponíveis para empréstimo."] },
  });
  assert.deepEqual(data.books, [{ ...before.books[0], availableCopies: 0 }]);
  assert.deepEqual(data.users, before.users);
  assert.deepEqual(data.loans.map(({ bookId, userId, status }) => ({ bookId, userId, status })), [
    { ...request, status: "active" },
  ]);
});

test("solicitações concorrentes em livros diferentes respeitam o limite de ativos", async () => {
  const data = fixture();
  const secondBook = { ...data.books[0], id: 2 };
  data.books.push(secondBook);
  data.loans.push(existingLoan(1, "active"), existingLoan(2, "active"));
  const before = structuredClone(data);

  const [first, second] = await postOverlappingLoans(data, request, { ...request, bookId: 2 });

  assert.equal(first.status, 201);
  assert.deepEqual(second, {
    status: 409,
    body: { errors: ["O usuário já possui três empréstimos ativos."] },
  });
  assert.deepEqual(data.books, [{ ...before.books[0], availableCopies: 1 }, before.books[1]]);
  assert.deepEqual(data.users, before.users);
  assert.equal(data.loans.length, 3);
  assert.deepEqual(data.loans.slice(0, 2), before.loans);
  assert.equal(data.loans[2].status, "active");
  assert.equal(data.loans[2].userId, request.userId);
  assert.equal(data.loans[2].bookId, request.bookId);
});

test("uma falha descarta o débito e libera a transação concorrente", async () => {
  const data = fixture();
  data.books[0].availableCopies = 1;
  data.users.push({ id: 2, name: "Outro usuário" });
  const before = structuredClone(data);
  const secondRequest = { ...request, userId: 2 };

  const [first, second, secondInitialState] = await postOverlappingLoans(
    data, request, secondRequest, true,
  );

  assert.deepEqual(first, {
    status: 500,
    body: { errors: ["Não foi possível registrar o empréstimo."] },
  });
  assert.equal(second.status, 201);
  assert.deepEqual(
    secondInitialState,
    before,
    "A segunda transação deve começar com o estoque original e sem alterações da primeira",
  );
  assert.deepEqual(data.books, [{ ...before.books[0], availableCopies: 0 }]);
  assert.deepEqual(data.users, before.users);
  assert.deepEqual(data.loans.map(({ id, bookId, userId, status }) => ({ id, bookId, userId, status })), [
    { id: 1, ...secondRequest, status: "active" },
  ]);
});
