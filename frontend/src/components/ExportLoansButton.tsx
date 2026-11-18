import { API_URL } from "../api";
import {
  buildLoanQuery,
  type LoanFilterValues,
} from "../services/loanReport";

interface Props {
  filters: LoanFilterValues;
  disabled?: boolean;
}

export default function ExportLoansButton({
  filters,
  disabled = false,
}: Props) {
  function handleExport() {
    const query = buildLoanQuery(filters);
    const url = `${API_URL}/loans/export.csv${
      query ? `?${query}` : ""
    }`;

    window.location.assign(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
    >
      Exportar CSV
    </button>
  );
}