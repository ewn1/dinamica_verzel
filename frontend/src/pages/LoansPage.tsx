import { useEffect, useRef, useState, type FormEvent } from "react";
import { API_URL } from "../api";
import type { Book, Loan, User } from "../types";

type Collection<T> = { items: T[]; error?: string };

async function request(path: string, fallback: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, options).catch(() => {
    throw new Error(fallback);
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errors: string[] = Array.isArray(body?.errors)
      ? body.errors.filter((error: unknown): error is string =>
          typeof error === "string" && error.trim() !== "",
        )
      : [];
    throw new Error(errors.join(" ") || fallback);
  }

  return response;
}

async function loadCollection<T>(
  path: string,
  fallback: string,
  update: (collection: Collection<T>) => void,
  signal: AbortSignal,
) {
  try {
    const response = await request(path, fallback, { signal });
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error(fallback);
    if (!signal.aborted) update({ items });
  } catch (error) {
    if (!signal.aborted) {
      update({ items: [], error: error instanceof Error ? error.message : fallback });
    }
  }
}

export default function LoansPage() {
  const [users, setUsers] = useState<Collection<User>>();
  const [books, setBooks] = useState<Collection<Book>>();
  const [loans, setLoans] = useState<Collection<Loan>>();
  const [userId, setUserId] = useState("");
  const [bookId, setBookId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const initialLoad = useRef<AbortController | null>(null);
  const operation = useRef<AbortController | null>(null);

  const selectedUser = users?.items.find((user) => String(user.id) === userId);
  const selectedBook = books?.items.find((book) => String(book.id) === bookId);
  const activeLoans = loans?.items.filter((loan) => loan.status === "active");

  function refresh(signal: AbortSignal) {
    return Promise.all([
      loadCollection("/users", "Não foi possível carregar os usuários.", setUsers, signal),
      loadCollection("/books", "Não foi possível carregar os livros.", setBooks, signal),
      loadCollection(
        "/loans?status=active",
        "Não foi possível carregar os empréstimos ativos.",
        setLoans,
        signal,
      ),
    ]);
  }

  useEffect(() => {
    const controller = new AbortController();
    initialLoad.current = controller;
    void refresh(controller.signal);
    return () => {
      controller.abort();
      operation.current?.abort();
    };
  }, []);

  async function runOperation(action: (signal: AbortSignal) => Promise<void>) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice(undefined);

    try {
      await action(controller.signal);
      if (!controller.signal.aborted) {
        initialLoad.current?.abort();
        await refresh(controller.signal);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setNotice({ text: (error as Error).message, error: true });
      }
    } finally {
      if (!controller.signal.aborted) {
        operation.current = null;
        setBusy(false);
      }
    }
  }

  function borrow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    if (!selectedBook || selectedBook.availableCopies <= 0) return;

    void runOperation(async (signal) => {
      await request("/loans", "Não foi possível realizar o empréstimo.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: selectedBook.id, userId: selectedUser.id }),
        signal,
      });
      if (!signal.aborted) {
        setBookId("");
        setNotice({ text: "Empréstimo realizado com sucesso." });
      }
    });
  }

  function returnBook(id: number) {
    void runOperation(async (signal) => {
      await request(`/loans/${id}/return`, "Não foi possível devolver o livro.", {
        method: "POST",
        signal,
      });
      if (!signal.aborted) setNotice({ text: "Livro devolvido com sucesso." });
    });
  }

  return (
    <section>
      <h2>Novo empréstimo</h2>
      {(!users || !books) && <p role="status">Carregando usuários e livros…</p>}
      {users?.error && <p role="alert">{users.error}</p>}
      {books?.error && <p role="alert">{books.error}</p>}
      {users && !users.error && users.items.length === 0 && <p>Nenhum usuário cadastrado.</p>}
      {books && !books.error && books.items.length === 0 && <p>Nenhum livro no acervo.</p>}
      <form onSubmit={borrow} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <label>
          Usuário{" "}
          <select
            value={selectedUser ? userId : ""}
            onChange={(event) => setUserId(event.target.value)}
            disabled={busy || !users?.items.length}
            required
          >
            <option value="">Selecione um usuário</option>
            {users?.items.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <label>
          Livro{" "}
          <select
            value={selectedBook ? bookId : ""}
            onChange={(event) => setBookId(event.target.value)}
            disabled={busy || !books?.items.length}
            required
          >
            <option value="">Selecione um livro</option>
            {books?.items.map((book) => (
              <option key={book.id} value={book.id} disabled={book.availableCopies <= 0}>
                {book.title} ({book.availableCopies} disponíveis)
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={
            busy ||
            !selectedUser ||
            !selectedBook ||
            selectedBook.availableCopies <= 0
          }
        >
          Emprestar
        </button>
      </form>

      {busy && <p role="status">Processando operação…</p>}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}

      <h2>Empréstimos ativos</h2>
      {!loans && <p role="status">Carregando empréstimos ativos…</p>}
      {loans?.error && <p role="alert">{loans.error}</p>}
      {loans && !loans.error && activeLoans?.length === 0 && <p>Nenhum empréstimo ativo.</p>}
      {!!activeLoans?.length && (
        <ul>
          {activeLoans.map((loan) => {
            const user = users?.items.find((item) => item.id === loan.userId);
            const book = books?.items.find((item) => item.id === loan.bookId);
            const title = book?.title ?? `Livro #${loan.bookId}`;
            const name = user?.name ?? `Usuário #${loan.userId}`;

            return (
              <li key={loan.id}>
                {title} — {name}{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => returnBook(loan.id)}
                  aria-label={`Devolver ${title}, emprestado a ${name}`}
                >
                  Devolver
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
