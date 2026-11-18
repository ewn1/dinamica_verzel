export const API_URL = "http://localhost:3333";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const messages: unknown[] = Array.isArray(body?.errors) ? body.errors : [];
    throw new ApiError(
      response.status,
      messages.filter((message) => typeof message === "string").join(" ") ||
        (response.status === 404 ? "Esta operação ainda não está disponível na API." : "A API não conseguiu concluir a solicitação."),
    );
  }
  return response;
}

export async function getList<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const response = await request(path, { signal });
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Formato de resposta inesperado.");
  return data;
}

export function postOptions(body?: object): RequestInit {
  return body === undefined ? { method: "POST" } : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function errorMessage(error: unknown) {
  if (error instanceof TypeError) return "Não foi possível conectar à API. Verifique se o backend está em execução.";
  return error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
}
