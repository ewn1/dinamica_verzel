import { type FormEvent } from "react";
import type { Book } from "../types";

type Props = {
  books?: Book[];
  busy: boolean;
  onCreate: (book: { title: string; author: string; year: number; copies: number }) => Promise<boolean>;
};

export default function BooksPage({ books, busy, onCreate }: Props) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (await onCreate({
      title: String(data.get("title")).trim(),
      author: String(data.get("author")).trim(),
      year: Number(data.get("year")),
      copies: Number(data.get("copies")),
    })) form.reset();
  }

  return (
    <>
      <section className="panel">
        <h2>Cadastrar livro</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>Título<input name="title" required /></label>
          <label>Autor<input name="author" required /></label>
          <label>Ano<input name="year" type="number" min="1" required /></label>
          <label>Quantidade de cópias<input name="copies" type="number" min="0" required /></label>
          <button className="primary" disabled={busy}>Cadastrar livro</button>
        </form>
      </section>
      {books && <section className="panel">
        <h2>Acervo</h2>
        {books.length === 0 ? <p className="muted">Nenhum livro cadastrado.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Título</th><th>Autor</th><th>Ano</th><th>Disponibilidade</th></tr></thead>
              <tbody>{books.map((book) => (
                <tr key={book.id}>
                  <td><strong>{book.title}</strong></td><td>{book.author}</td><td>{book.year}</td>
                  <td><span className={book.availableCopies === 0 ? "pill warning" : "pill"}>
                    {book.availableCopies === 0 ? "Sem cópias" : `${book.availableCopies} de ${book.totalCopies}`}
                  </span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>}
    </>
  );
}
