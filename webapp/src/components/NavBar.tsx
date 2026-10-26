import { NavLink } from "react-router-dom";
import { ServiceStatusBar } from "./ServiceStatusBar";

const links = [
  { to: "/", label: "Audio Station", end: true },
  { to: "/calendar", label: "Service Book" },
  { to: "/images", label: "The Pass" },
  { to: "/master", label: "Head Chef" },
];

export function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar-top">
        <NavLink to="/" className="brand">
          <span className="brand-toque" aria-hidden="true">
            👨‍🍳
          </span>
          <span className="brand-words">
            <span className="brand-name">Master Kitchen</span>
            <span className="brand-tag">AI Agent Platform</span>
          </span>
        </NavLink>
        <ServiceStatusBar />
      </div>
      <nav className="nav-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
