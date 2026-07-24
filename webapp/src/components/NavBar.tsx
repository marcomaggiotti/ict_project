import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Audio", end: true },
  { to: "/calendar", label: "Calendar" },
  { to: "/images", label: "Images" },
  { to: "/master", label: "Master Control" },
];

export function NavBar() {
  return (
    <nav className="navbar">
      <span className="brand">AI Agent Platform</span>
      <div className="nav-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
