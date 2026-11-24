import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Select } from "../kernel/Select";
import { api } from "../kernel/api";
import { useStore } from "./StoreContext";

function ClothesMenu() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const onParentCategory = location.pathname === "/category/clothes";
  useEffect(() => { setOpen(false); }, [location.pathname]);
  return (
    <div
      ref={container}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!container.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Link
        to="/category/clothes"
        className="px-3 py-2 text-sm font-medium tracking-wide hover:text-teal-600"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        CLOTHES
      </Link>
      {open && !onParentCategory && (
        <div className="absolute left-0 top-full z-40 min-w-40 border border-slate-200 bg-white py-1 shadow-lg" role="menu" aria-label="CLOTHES">
          <Link to="/category/men" className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>Men</Link>
          <Link to="/category/women" className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>Women</Link>
        </div>
      )}
    </div>
  );
}

function SearchBox() {
  const { products, catalogLoaded } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = catalogLoaded && query.trim()
    ? products.filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="relative w-full md:w-72">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setFocused(false);
          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <input
          type="search"
          aria-label="Search"
          placeholder="Search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setFocused(true); }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </form>
      {focused && suggestions.length > 0 && (
        <section aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-40 mt-1 border border-slate-200 bg-white py-1 shadow-lg">
          <ul>
            {suggestions.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setFocused(false); navigate(`/product/${product.id}`); }}
                >
                  {product.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, userLoaded, cart, language, setLanguage, refreshUser, refreshCart } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const authPage = ["/login", "/register", "/password-recovery"].includes(location.pathname);
  const onAccountOverview = location.pathname === "/account";

  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" });
    await refreshUser();
    await refreshCart();
    navigate("/");
  };

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white shadow-sm">
        <nav aria-label="Global navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="Logo" className="mr-2 text-xl font-bold text-teal-600">my store</Link>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1 text-sm md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
          >
            Menu
          </button>
            <div className={menuOpen ? "flex w-full flex-col md:flex-row md:items-center" : "hidden w-full md:flex md:w-auto md:flex-row md:items-center"}>
              <ClothesMenu />
              <Link to="/category/accessories" className="px-3 py-2 text-sm font-medium tracking-wide hover:text-teal-600">ACCESSORIES</Link>
              <Link to="/category/art" className="px-3 py-2 text-sm font-medium tracking-wide hover:text-teal-600">ART</Link>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <SearchBox />
              <Select
                aria-label="Language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option>English</option>
                <option>Français</option>
              </Select>
              {userLoaded && !authPage && (
                <button type="button" className="text-sm font-medium hover:text-teal-600" onClick={() => navigate("/login")}>Sign in</button>
              )}
              {userLoaded && user && (
                <>
                  {!onAccountOverview && <span className="text-sm font-medium">{user.name}</span>}
                  <Link to="/account" aria-label="My account" className="text-sm font-medium hover:text-teal-600">Account</Link>
                  <button type="button" className="text-sm font-medium hover:text-teal-600" onClick={signOut}>Sign out</button>
                </>
              )}
              <Link to="/cart" aria-label="Cart" className="rounded bg-teal-500 px-3 py-2 text-sm font-semibold text-white">
                Cart <span>(</span><span>{cart.count}</span><span>)</span>
              </Link>
            </div>
        </nav>
      </header>
      <main>{children}</main>
      {location.pathname !== "/register" && <section aria-label="Newsletter" className="mt-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-medium">Get our latest news and special sales</h2>
          <form className="flex gap-2" onSubmit={(event) => event.preventDefault()}>
            <input type="email" aria-label="Your email address" placeholder="Your email address" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded bg-teal-500 px-4 py-2 text-sm font-semibold text-white">Subscribe</button>
          </form>
        </div>
      </section>}
      <footer className="border-t border-slate-200 bg-slate-100 py-6 text-sm text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-8 px-4">
          <div>
            <h2 className="font-semibold text-slate-800">Products</h2>
            <p>Prices drop</p>
            <p>New products</p>
            <p>Best sellers</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Our company</h2>
            <p>Delivery</p>
            <p>Legal Notice</p>
            <p>Terms and conditions of use</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Your account</h2>
            <p>Order tracking</p>
            <p>Create account</p>
            <p>My alerts</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Store information</h2>
            <p>PrestaShop</p>
            <p>France</p>
            <p>Email us: demo@prestashop.com</p>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-6xl px-4 text-xs">© 2026 - Ecommerce software by PrestaShop™</p>
      </footer>
    </div>
  );
}
