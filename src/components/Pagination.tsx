interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return <p className="pagination__info">{total === 1 ? "1 pedido" : `${total} pedidos`}</p>;
  }
  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="pagination__info">
        Página {page} de {totalPages} · {total} pedidos
      </span>
      <div className="pagination__buttons">
        <button type="button" className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => onChange(1)}>
          « Primeira
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹ Anterior
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Próxima ›
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
        >
          Última »
        </button>
      </div>
    </nav>
  );
}
