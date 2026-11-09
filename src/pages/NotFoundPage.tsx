import { Link } from "react-router-dom";
import { EmptyState } from "@/components/StateViews";

export function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState title="Página não encontrada.">
        <Link to="/">Voltar ao painel</Link>
      </EmptyState>
    </div>
  );
}
