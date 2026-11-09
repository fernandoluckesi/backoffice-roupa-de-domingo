import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/", label: "Painel", end: true },
  { to: "/orders", label: "Pedidos", end: false },
  { to: "/production", label: "Produção", end: false },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell">
      <header className="sidebar">
        <div className="sidebar__top">
          <div className="brand">
            <span className="brand__mark">RD</span>
            <span className="brand__text">
              Roupa de Domingo
              <small>Backoffice</small>
            </span>
          </div>
          <button
            type="button"
            className="sidebar__toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Fechar" : "Menu"}
          </button>
        </div>
        <nav id="main-nav" className={`sidebar__nav ${menuOpen ? "is-open" : ""}`} aria-label="Principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar__user">
            <span className="sidebar__name">{user?.name}</span>
            <span className="sidebar__email">{user?.email}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void logout()}>
              Sair
            </button>
          </div>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
