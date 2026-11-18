import { useState, type FormEvent } from "react";
import type { Book, User } from "../types";
import LoanTable from "../LoanTable";
import type { LoanReportRow } from "../services/loanReport";

type Props = {
  books: Book[];
  users: User[];
  activeLoans?: LoanReportRow[];
  listMessage: string;
  busy: boolean;
  onBorrow: (bookId: number, userId: number) => Promise<boolean>;
  onReturn: (id: number) => void;
};

export default function LoansPage({ books, users, activeLoans, listMessage, busy, onBorrow, onReturn }: Props) {
  const [bookId, setBookId] = useState("");
  const book = books.find((item) => String(item.id) === bookId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!book) return;
    const data = new FormData(event.currentTarget);
    if (await onBorrow(book.id, Number(data.get("user")))) setBookId("");
  }

  return (
    <>
      <section className="panel">
        <h2>Novo empréstimo</h2>
        <form className="loan-form" onSubmit={submit}>
          <label>Usuário<select name="user" defaultValue="" required>
            <option value="">Selecione um usuário</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select></label>
          <label>Livro<select value={bookId} onChange={(event) => setBookId(event.target.value)} required>
            <option value="">Selecione um livro</option>
            {books.map((item) => (
              <option key={item.id} value={item.id}>{item.title} · {item.availableCopies} disponíveis</option>
            ))}
          </select></label>
          <button className="primary" disabled={busy || !book || book.availableCopies === 0 || users.length === 0}>Registrar empréstimo</button>
        </form>
        {book?.availableCopies === 0 && <p className="notice error" role="status">Livro sem cópias disponíveis.</p>}
      </section>
      <section className="panel">
        <h2>Empréstimos ativos</h2>
        {activeLoans ? <LoanTable loans={activeLoans} onReturn={onReturn} busy={busy} /> :
          <p className="muted">{listMessage}</p>}
      </section>
    </>
  );
}
