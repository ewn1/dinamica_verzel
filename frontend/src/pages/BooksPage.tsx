import { useEffect, useState, type FormEvent } from "react";
import { API_URL } from "../api";
import type { Book } from "../types";

const EMPTY_FORM = { title: "", author: "", year: "", copies: "" };

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBooks() {
    const response = await fetch(`${API_URL}/books`);
    setBooks(await response.json());
  }

  useEffect(() => {
    fetch(`${API_URL}/books`)
      .then((response) => response.json())
      .then(setBooks)
      .catch(() =>
        setLoadError("Não foi possível carregar o acervo. A API está rodando?"),
      );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          year: Number(form.year),
          copies: Number(form.copies),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? ["Não foi possível cadastrar o livro."]);
        return;
      }

      setSuccess(`"${data.title}" cadastrado com sucesso!`);
      setForm(EMPTY_FORM);
      await loadBooks();
    } catch {
      setErrors(["Não foi possível conectar à API."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Cadastrar livro</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 8, maxWidth: 400 }}
      >
        <input
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          placeholder="Autor"
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
        />
        <input
          type="number"
          placeholder="Ano de publicação"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantidade de cópias"
          value={form.copies}
          onChange={(e) => setForm({ ...form, copies: e.target.value })}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      {errors.length > 0 && (
        <ul style={{ color: "crimson" }}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <h2>Acervo</h2>
      {loadError && <p style={{ color: "crimson" }}>{loadError}</p>}
      {books.length === 0 ? (
        <p>Nenhum livro cadastrado ainda.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>Ano</th>
              <th>Disponíveis</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.year}</td>
                <td>
                  {book.availableCopies} de {book.totalCopies}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
