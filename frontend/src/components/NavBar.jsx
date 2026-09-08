import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NavBar({ active }) {
  const { logout } = useAuth();

  return (
    <header className="nav-bar">
      <div className="nav-brand">
        <span className="nav-logo">🐍</span>
        <span>Snake</span>
      </div>
      <nav className="nav-links">
        <Link to="/" className={active === "game" ? "nav-link active" : "nav-link"}>
          Play
        </Link>
        <Link
          to="/leaderboard"
          className={active === "leaderboard" ? "nav-link active" : "nav-link"}
        >
          Leaderboard
        </Link>
        <button className="nav-logout" onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
