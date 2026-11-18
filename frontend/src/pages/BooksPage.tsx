import { useEffect, useState } from "react";
import { API_URL } from "../api";
import type { Book } from "../types";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/books`)
      .then((response) => response.json())
      .then(setBooks)
      .catch(() =>
        setLoadError("Não foi possível carregar o acervo. A API está rodando?"),
      );
  }, []);

  return (
    <section>
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
