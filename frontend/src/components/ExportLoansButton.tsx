type ExportLoansButtonProps = {
  userId?: string;
  from?: string;
  to?: string;
  status?: string;
};

export default function ExportLoansButton({
  userId,
  from,
  to,
  status,
}: ExportLoansButtonProps) {
  function handleExport() {
    const params = new URLSearchParams();

    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);

    const query = params.toString();

    const url = `http://localhost:3333/loans/export.csv${
      query ? `?${query}` : ""
    }`;

    window.location.href = url;
  }

  return (
    <button type="button" onClick={handleExport}>
      Exportar CSV
    </button>
  );
}