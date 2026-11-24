import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../kernel/api";
import { AuthProvider, useAuth } from "./auth";

function Header() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch("");
  }, [location.pathname]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/");
  };

  return (
    <header className="bg-[#206ea7] text-white shadow">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-5 px-5 py-2">
        <Link to="/" className="flex shrink-0 items-center gap-3 text-2xl font-semibold tracking-wide">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded bg-white/15 text-2xl">▤</span>
          BookStack Demo
        </Link>
        <div className="mx-auto w-full max-w-xl">
          <input
            aria-label="Search"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border border-white/20 bg-[#15537e] px-5 py-2.5 text-white placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/60"
          />
        </div>
        <nav className="flex shrink-0 items-center gap-5" aria-label="Primary">
          <Link to="/shelves" className="flex items-center gap-2 rounded px-1 py-2 hover:bg-white/10"><span aria-hidden="true">▥</span><span>Shelves</span></Link>
          <Link to="/books" className="flex items-center gap-2 rounded px-1 py-2 hover:bg-white/10"><span aria-hidden="true">▦</span><span>Books</span></Link>
          {!loading && !user && <Link to="/login" className="flex items-center gap-2 rounded px-1 py-2 hover:bg-white/10"><span aria-hidden="true">⇥</span><span>Login</span></Link>}
          {!loading && user && (
            <>
              <Link to="/favorites" className="rounded px-1 py-2 hover:bg-white/10">My Favourites</Link>
              <span className="rounded bg-white/10 px-3 py-1.5 font-medium">{user.nickname}</span>
              <button type="button" onClick={logout} className="rounded px-1 py-2 hover:bg-white/10">Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#f2f3f4] text-slate-800">
        <Header />
        <div className="mx-auto max-w-[1500px] px-5 py-7">{children}</div>
      </div>
    </AuthProvider>
  );
}
