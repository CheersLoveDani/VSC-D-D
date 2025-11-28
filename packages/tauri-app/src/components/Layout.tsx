import { Outlet, NavLink } from "react-router-dom";
import "./Layout.css";

const navItems = [
  { path: "/", label: "Files", icon: "📁" },
  { path: "/character", label: "Character", icon: "⚔️" },
  { path: "/compendium", label: "Compendium", icon: "📚" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
