import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../kernel/api";
import { useAuth, type AuthUser } from "../foundation/auth";

type ItemType = "shelf" | "book" | "chapter" | "page";

function Panel({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section aria-label={name} className="min-h-[80px] rounded bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-lg text-slate-800">{name}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p role="status" className="text-sm text-slate-500">{children}</p>;
}

function RecordButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded px-1 py-2 text-left text-[15px] text-slate-700 hover:bg-slate-50 hover:text-[#206ea7] focus:outline-none focus:ring-2 focus:ring-[#206ea7]/40">
      {name}
    </button>
  );
}

function PrimaryButton({ children, onClick, type = "button", disabled }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="rounded bg-[#206ea7] px-5 py-2.5 font-medium text-white hover:bg-[#175684] disabled:opacity-50">{children}</button>
  );
}

function SecondaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick}
      className="rounded border border-slate-300 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50">{children}</button>
  );
}

function TextField({ id, label, value, onChange, multiline = false }: { id: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {multiline ? (
        <textarea id={id} aria-label={label} placeholder={label} value={value} rows={5}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-[#206ea7] focus:outline-none" />
      ) : (
        <input id={id} aria-label={label} placeholder={label} value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 focus:border-[#206ea7] focus:outline-none" />
      )}
    </div>
  );
}

function itemPath(type: ItemType, id: number): string {
  if (type === "shelf") return `/shelves/${id}`;
  if (type === "book") return `/books/${id}`;
  if (type === "chapter") return `/chapters/${id}`;
  return `/pages/${id}`;
}

function useHome() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let active = true;
    void api("/api/home").then((result) => {
      if (active && result.ok) setData(result.data);
      else if (active) setData({ recentDrafts: [], recentlyViewed: [], favoriteTop: [], recentlyUpdated: [] });
    });
    return () => { active = false; };
  }, [user?.id]);
  return data;
}

function HomePage() {
  const data = useHome();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!data) return <main className="min-h-[300px]" aria-busy="true" />;

  return (
    <main>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          {user && (
            <Panel name="My Recent Drafts">
              {data.recentDrafts.length === 0 ? <Empty>Your recent drafts are empty</Empty> : (
                <ul className="space-y-1">
                  {data.recentDrafts.map((draft: any) => (
                    <li key={draft.id}><RecordButton name={draft.title} onClick={() => navigate(`/pages/${draft.id}`)} /></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {user && (
            <Panel name="My Recently Viewed">
              {data.recentlyViewed.length === 0 ? <Empty>You have not viewed any content yet</Empty> : (
                <ul className="space-y-1">
                  {data.recentlyViewed.map((item: any) => (
                    <li key={`${item.type}-${item.id}`}>
                      <RecordButton name={item.name} onClick={() => navigate(itemPath(item.type, item.id))} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {user && (
            <Panel name="My Most Viewed Favorites">
              {data.favoriteTop.length === 0 ? <Empty>You have no favorites yet</Empty> : (
                <ul className="space-y-1">
                  {data.favoriteTop.map((item: any) => (
                    <li key={`${item.type}-${item.id}`}><RecordButton name={item.name} onClick={() => navigate(itemPath(item.type, item.id))} /></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          <Panel name="Recently Updated Pages">
            {data.recentlyUpdated.length === 0 ? <Empty>No pages have been updated yet</Empty> : (
              <ul className="space-y-1">
                {data.recentlyUpdated.map((page: any) => (
                  <li key={page.id}><RecordButton name={page.title} onClick={() => navigate(`/pages/${page.id}`)} /></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const result = await api("/api/auth/login", { method: "POST", body: { email, password, remember } });
    if (!result.ok) {
      setError(result.data?.error ?? "Login failed");
      return;
    }
    await refresh();
    navigate("/");
  };

  return (
    <main className="mx-auto max-w-xl rounded bg-white p-9 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-6 text-3xl text-slate-800">Login</h1>
      {error && <div role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-4">
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input id="login-email" type="text" role="textbox" placeholder="Email" value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2.5 focus:border-[#206ea7] focus:outline-none" />
        </div>
        <div className="mb-4">
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input id="login-password" type="password" role="textbox" placeholder="Password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2.5 focus:border-[#206ea7] focus:outline-none" />
        </div>
        <div className="mb-6 flex items-center gap-2">
          <input id="remember-me" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}
            className="h-5 w-5 rounded border-slate-400" />
          <label htmlFor="remember-me">Remember Me</label>
        </div>
        <div className="flex justify-end"><PrimaryButton type="submit">Login</PrimaryButton></div>
      </form>
    </main>
  );
}

function ShelvesPage() {
  const [shelves, setShelves] = useState<any[] | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void api("/api/shelves").then((result) => setShelves(result.ok ? result.data.shelves : []));
  }, []);
  return (
    <main>
      <h1 className="mb-5 text-3xl text-slate-800">Shelves</h1>
      {shelves && (
        <Panel name="Shelf list">
          {shelves.length === 0 ? <Empty>No shelves yet</Empty> : (
            <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
              {shelves.map((shelf) => (
                <li key={shelf.id}><RecordButton name={shelf.name} onClick={() => navigate(`/shelves/${shelf.id}`)} /></li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </main>
  );
}

function ShelfDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shelf, setShelf] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api(`/api/shelves/${id}`).then((result) => {
      if (result.ok) setShelf(result.data);
      else setError(result.data?.error ?? "Shelf not found");
    });
  }, [id]);

  if (error) return <main><h1 className="text-2xl">Shelf not found</h1></main>;
  if (!shelf) return <main aria-busy="true" className="min-h-[300px]" />;

  const toggleFavorite = async () => {
    const method = shelf.favorite ? "DELETE" : "POST";
    const result = await api(`/api/favorites/shelf/${shelf.id}`, { method });
    if (result.ok) setShelf({ ...shelf, favorite: !shelf.favorite });
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Shelves</span>
          <span aria-hidden="true">›</span>
          <span>{shelf.name}</span>
        </div>
        <div className="rounded bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-4 text-4xl text-slate-800">{shelf.name}</h1>
          <p className="mb-6 whitespace-pre-wrap text-slate-600">{shelf.description}</p>
          {shelf.tags && <p className="mb-6 text-sm text-slate-500">Tags: {shelf.tags}</p>}
          <Panel name="Book list">
            {shelf.books.length === 0 ? <Empty>No books on this shelf yet</Empty> : (
              <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                {shelf.books.map((book: any) => (
                  <li key={book.id}><RecordButton name={book.name} onClick={() => navigate(`/books/${book.id}`)} /></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <aside className="space-y-2">
        <h2 className="mb-2 text-xl text-slate-700">Actions</h2>
        <ActionButton onClick={() => navigate("/shelves/new")}>New Shelf</ActionButton>
        <ActionButton onClick={() => navigate(`/shelves/${shelf.id}/books/new`)}>Create New Book</ActionButton>
        {!shelf.isBootstrap && <ActionButton onClick={() => navigate(`/shelves/${shelf.id}/edit`)}>Edit</ActionButton>}
        {!shelf.isBootstrap && <ActionButton onClick={() => navigate(`/shelves/${shelf.id}/delete`)}>Delete</ActionButton>}
        {user && <ActionButton pressed={Boolean(shelf.favorite)} onClick={toggleFavorite}>{shelf.favorite ? "Unfavorite" : "Favorite"}</ActionButton>}
      </aside>
    </main>
  );
}

function ActionButton({ children, onClick, pressed }: { children: ReactNode; onClick: () => void; pressed?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed}
      className="mb-2 block w-full rounded border border-slate-200 bg-white px-4 py-2.5 text-left text-[#206ea7] shadow-sm hover:bg-slate-50">{children}</button>
  );
}

function ShelfFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loaded, setLoaded] = useState(mode === "create");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "create") return;
    void api(`/api/shelves/${id}`).then((result) => {
      if (result.ok) {
        setName(result.data.name);
        setDescription(result.data.description);
        setTags(result.data.tags ?? "");
        setLoaded(true);
      } else setError(result.data?.error ?? "Shelf not found");
    });
  }, [id, mode]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const body = { name, description, tags };
    const result = mode === "create"
      ? await api("/api/shelves", { method: "POST", body })
      : await api(`/api/shelves/${id}`, { method: "PUT", body });
    if (!result.ok) { setError(result.data?.error ?? "Unable to save shelf"); return; }
    navigate(mode === "create" ? "/shelves" : `/shelves/${id}`);
  };

  if (!loaded) return <main aria-busy="true" className="min-h-[300px]" />;

  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-6 text-3xl text-slate-800">{mode === "create" ? "Create New Shelf" : "Edit Shelf"}</h1>
      {error && <div role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      <form onSubmit={save}>
        <TextField id="shelf-name" label="Name" value={name} onChange={setName} />
        <TextField id="shelf-description" label="Description" value={description} onChange={setDescription} multiline />
        <TextField id="shelf-tags" label="Tags" value={tags} onChange={setTags} />
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={() => navigate(mode === "create" ? "/shelves" : `/shelves/${id}`)}>Cancel</SecondaryButton>
          <PrimaryButton type="submit">Save Shelf</PrimaryButton>
        </div>
      </form>
    </main>
  );
}

function DeleteShelfPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shelf, setShelf] = useState<any>(null);
  useEffect(() => {
    void api(`/api/shelves/${id}`).then((result) => { if (result.ok) setShelf(result.data); });
  }, [id]);
  const confirm = async () => {
    await api(`/api/shelves/${id}`, { method: "DELETE" });
    navigate("/shelves");
  };
  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-4 text-3xl text-slate-800">Delete Shelf</h1>
      {shelf && <p className="mb-6 text-slate-600">This will delete the shelf with the name '{shelf.name}'. Contained books will not be deleted.</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={() => navigate(`/shelves/${id}`)}>Cancel</SecondaryButton>
        <PrimaryButton onClick={confirm}>Confirm Delete</PrimaryButton>
      </div>
    </main>
  );
}

function BooksPage() {
  const [books, setBooks] = useState<any[] | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void api("/api/books").then((result) => setBooks(result.ok ? result.data.books : []));
  }, []);
  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl text-slate-800">Books</h1>
        <PrimaryButton onClick={() => navigate("/books/new")}>Create New Book</PrimaryButton>
      </div>
      {books && (
        <Panel name="Book list">
          {books.length === 0 ? <Empty>No books yet</Empty> : (
            <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
              {books.map((book) => (
                <li key={book.id}><RecordButton name={book.name} onClick={() => navigate(`/books/${book.id}`)} /></li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </main>
  );
}

function BookFormPage({ mode, shelfId }: { mode: "create" | "edit"; shelfId?: number }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loaded, setLoaded] = useState(mode === "create");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "create") return;
    void api(`/api/books/${id}`).then((result) => {
      if (result.ok) {
        setName(result.data.name);
        setDescription(result.data.description);
        setTags(result.data.tags ?? "");
        setLoaded(true);
      } else setError(result.data?.error ?? "Book not found");
    });
  }, [id, mode]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const body = { name, description, tags };
    let result;
    if (mode === "edit") result = await api(`/api/books/${id}`, { method: "PUT", body });
    else if (shelfId != null) result = await api(`/api/shelves/${shelfId}/books`, { method: "POST", body });
    else result = await api("/api/books", { method: "POST", body });
    if (!result.ok) { setError(result.data?.error ?? "Unable to save book"); return; }
    navigate(`/books/${result.data.id}`);
  };

  const cancelPath = mode === "edit" ? `/books/${id}` : shelfId != null ? `/shelves/${shelfId}` : "/books";

  if (!loaded) return <main aria-busy="true" className="min-h-[300px]" />;

  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-6 text-3xl text-slate-800">{mode === "create" ? "Create New Book" : "Edit Book"}</h1>
      {error && <div role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      <form onSubmit={save}>
        <TextField id="book-name" label="Name" value={name} onChange={setName} />
        <TextField id="book-description" label="Description" value={description} onChange={setDescription} multiline />
        <TextField id="book-tags" label="Tags" value={tags} onChange={setTags} />
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={() => navigate(cancelPath)}>Cancel</SecondaryButton>
          <PrimaryButton type="submit">Save Book</PrimaryButton>
        </div>
      </form>
    </main>
  );
}

function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api(`/api/books/${id}`).then((result) => {
      if (result.ok) setBook(result.data);
      else setError(result.data?.error ?? "Book not found");
    });
  }, [id]);

  if (error) return <main><h1 className="text-2xl">Book not found</h1></main>;
  if (!book) return <main aria-busy="true" className="min-h-[300px]" />;

  const toggleFavorite = async () => {
    const result = await api(`/api/favorites/book/${book.id}`, { method: book.favorite ? "DELETE" : "POST" });
    if (result.ok) setBook({ ...book, favorite: !book.favorite });
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {book.shelf && <><button type="button" onClick={() => navigate(`/shelves/${book.shelf.id}`)} className="text-[#206ea7] hover:underline">{book.shelf.name}</button><span aria-hidden="true">›</span></>}
          <span>Books</span>
          <span aria-hidden="true">›</span>
          <span>{book.name}</span>
        </div>
        <div className="rounded bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-4 text-4xl text-slate-800">{book.name}</h1>
          <p className="mb-6 whitespace-pre-wrap text-slate-600">{book.description}</p>
          {book.tags && <p className="mb-6 text-sm text-slate-500">Tags: {book.tags}</p>}
          <div className="space-y-6">
            <Panel name="Chapter list">
              {book.chapters.length === 0 ? <Empty>No chapters yet</Empty> : (
                <ul className="space-y-1">
                  {book.chapters.map((chapter: any) => (
                    <li key={chapter.id}><RecordButton name={chapter.name} onClick={() => navigate(`/chapters/${chapter.id}`)} /></li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel name="Page list">
              {book.pages.length === 0 ? <Empty>No pages yet</Empty> : (
                <ul className="space-y-1">
                  {book.pages.map((page: any) => (
                    <li key={page.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1"><RecordButton name={page.title} onClick={() => navigate(`/pages/${page.id}`)} /></div>
                      {page.draft ? <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Draft</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
      <aside className="space-y-2">
        <h2 className="mb-2 text-xl text-slate-700">Actions</h2>
        <ActionButton onClick={() => navigate(`/books/${book.id}/pages/new`)}>New Page</ActionButton>
        <ActionButton onClick={() => navigate(`/books/${book.id}/chapters/new`)}>New Chapter</ActionButton>
        <ActionButton onClick={() => navigate(`/books/${book.id}/edit`)}>Edit</ActionButton>
        <ActionButton onClick={() => navigate(`/books/${book.id}/delete`)}>Delete</ActionButton>
        {user && <ActionButton pressed={Boolean(book.favorite)} onClick={toggleFavorite}>{book.favorite ? "Unfavorite" : "Favorite"}</ActionButton>}
      </aside>
    </main>
  );
}

function DeleteBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  useEffect(() => {
    void api(`/api/books/${id}`).then((result) => { if (result.ok) setBook(result.data); });
  }, [id]);
  const confirm = async () => {
    await api(`/api/books/${id}`, { method: "DELETE" });
    navigate("/books");
  };
  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-4 text-3xl text-slate-800">Delete Book</h1>
      {book && <p className="mb-6 text-slate-600">This will delete the book with the name '{book.name}'. All pages and chapters will be removed.</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={() => navigate(`/books/${id}`)}>Cancel</SecondaryButton>
        <PrimaryButton onClick={confirm}>Confirm Delete</PrimaryButton>
      </div>
    </main>
  );
}

function ChapterFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const result = await api(`/api/books/${id}/chapters`, { method: "POST", body: { name, description } });
    if (!result.ok) { setError(result.data?.error ?? "Unable to save chapter"); return; }
    navigate(`/books/${id}`);
  };
  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-6 text-3xl text-slate-800">Create New Chapter</h1>
      {error && <div role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      <form onSubmit={save}>
        <TextField id="chapter-name" label="Name" value={name} onChange={setName} />
        <TextField id="chapter-description" label="Description" value={description} onChange={setDescription} multiline />
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={() => navigate(`/books/${id}`)}>Cancel</SecondaryButton>
          <PrimaryButton type="submit">Save Chapter</PrimaryButton>
        </div>
      </form>
    </main>
  );
}

function ChapterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<any>(null);

  useEffect(() => {
    void api(`/api/chapters/${id}`).then((result) => { if (result.ok) setChapter(result.data); });
  }, [id]);

  if (!chapter) return <main aria-busy="true" className="min-h-[300px]" />;

  const toggleFavorite = async () => {
    const result = await api(`/api/favorites/chapter/${chapter.id}`, { method: chapter.favorite ? "DELETE" : "POST" });
    if (result.ok) setChapter({ ...chapter, favorite: !chapter.favorite });
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Books</span>
          {chapter.book && <><span aria-hidden="true">›</span><button type="button" onClick={() => navigate(`/books/${chapter.book.id}`)} className="text-[#206ea7] hover:underline">{chapter.book.name}</button></>}
          <span aria-hidden="true">›</span>
          <span>{chapter.name}</span>
        </div>
        <div className="rounded bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-4 text-4xl text-slate-800">{chapter.name}</h1>
          <p className="mb-6 whitespace-pre-wrap text-slate-600">{chapter.description}</p>
          <Panel name="Page list">
            {chapter.pages.length === 0 ? <Empty>No pages in this chapter yet</Empty> : (
              <ul className="space-y-1">
                {chapter.pages.map((page: any) => (
                  <li key={page.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1"><RecordButton name={page.title} onClick={() => navigate(`/pages/${page.id}`)} /></div>
                    {page.draft ? <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Draft</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <aside className="space-y-2">
        <h2 className="mb-2 text-xl text-slate-700">Actions</h2>
        <ActionButton onClick={() => navigate(`/books/${chapter.book?.id}/pages/new?chapter=${chapter.id}`)}>New Page</ActionButton>
        {user && <ActionButton pressed={Boolean(chapter.favorite)} onClick={toggleFavorite}>{chapter.favorite ? "Unfavorite" : "Favorite"}</ActionButton>}
      </aside>
    </main>
  );
}

type EditorProps = { bookId?: number; pageId?: number; initial?: any; chapterId?: number };

function PageEditor({ bookId, pageId, initial, chapterId }: EditorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState<any>(initial ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [loaded, setLoaded] = useState(Boolean(initial) || pageId == null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial || pageId == null) return;
    void api(`/api/pages/${pageId}`).then((result) => {
      if (result.ok) {
        setPage(result.data);
        setTitle(result.data.title);
        setBody(result.data.body);
        setLoaded(true);
      } else setError(result.data?.error ?? "Page not found");
    });
  }, [initial, pageId]);

  const save = async (draft: boolean) => {
    setError("");
    const bodyData = { title, body, draft, chapterId };
    const result = pageId == null
      ? await api(`/api/books/${bookId}/pages`, { method: "POST", body: bodyData })
      : await api(`/api/pages/${pageId}`, { method: "PUT", body: bodyData });
    if (!result.ok) { setError(result.data?.error ?? "Unable to save page"); return; }
    if (pageId == null) navigate(`/books/${bookId}`);
    else if (result.data.draft) navigate(`/pages/${pageId}`);
    else navigate(`/pages/${pageId}`);
  };

  if (!loaded) return <main aria-busy="true" className="min-h-[300px]" />;

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl text-slate-700">{pageId == null ? "New Page" : "Edit Page"}</h1>
        <div className="flex flex-wrap gap-2">
          {page?.draft && <SecondaryButton onClick={() => navigate(`/pages/${page.id}/delete`)}>Delete Draft</SecondaryButton>}
          {user && <SecondaryButton onClick={() => save(true)}>Save Draft</SecondaryButton>}
          <PrimaryButton onClick={() => save(false)}>Save Page</PrimaryButton>
        </div>
      </div>
      <div className="rounded bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {error && <div role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}
        <TextField id="page-title" label="Page title" value={title} onChange={setTitle} />
        <TextField id="page-body" label="Write your page content here..." value={body} onChange={setBody} multiline />
        {pageId != null && <button type="button" onClick={() => navigate(`/books/${page?.book?.id}`)} className="text-sm text-[#206ea7] hover:underline">Back to book</button>}
      </div>
    </main>
  );
}

function PageViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    void api(`/api/pages/${id}`).then((result) => {
      if (result.ok) setPage(result.data);
      else setError(result.data?.error ?? "Page not found");
    });
  }, [id, location.key]);

  if (error) return <main><h1 className="text-2xl">Page not found</h1></main>;
  if (!page) return <main aria-busy="true" className="min-h-[300px]" />;
  if (page.draft) return <PageEditor pageId={page.id} initial={page} />;

  const toggleFavorite = async () => {
    const result = await api(`/api/favorites/page/${page.id}`, { method: page.favorite ? "DELETE" : "POST" });
    if (result.ok) setPage({ ...page, favorite: !page.favorite });
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Books</span>
          {page.book && <><span aria-hidden="true">›</span><button type="button" onClick={() => navigate(`/books/${page.book.id}`)} className="text-[#206ea7] hover:underline">{page.book.name}</button></>}
          {page.chapter && <><span aria-hidden="true">›</span><button type="button" onClick={() => navigate(`/chapters/${page.chapter.id}`)} className="text-[#206ea7] hover:underline">{page.chapter.name}</button></>}
        </div>
        <article className="rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-6 text-4xl text-slate-800">{page.title}</h1>
          <div className="whitespace-pre-wrap text-[16px] leading-7 text-slate-700">{page.body}</div>
        </article>
      </div>
      <aside className="space-y-2">
        <h2 className="mb-2 text-xl text-slate-700">Actions</h2>
        <ActionButton onClick={() => navigate(`/pages/${page.id}/edit`)}>Edit</ActionButton>
        {user && <ActionButton pressed={Boolean(page.favorite)} onClick={toggleFavorite}>{page.favorite ? "Unfavorite" : "Favorite"}</ActionButton>}
      </aside>
    </main>
  );
}

function DeleteDraftPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  useEffect(() => {
    void api(`/api/pages/${id}`).then((result) => { if (result.ok) setPage(result.data); });
  }, [id]);
  const confirm = async () => {
    const result = await api(`/api/pages/${id}`, { method: "DELETE" });
    const bookId = result.data?.bookId ?? page?.book?.id;
    navigate(bookId ? `/books/${bookId}` : "/books");
  };
  return (
    <main className="mx-auto max-w-3xl rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-4 text-3xl text-slate-800">Delete Draft Page</h1>
      <p className="mb-6 text-slate-600">Are you sure you want to delete this draft page?</p>
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={() => navigate(`/pages/${id}`)}>Cancel</SecondaryButton>
        <PrimaryButton onClick={confirm}>Confirm Delete</PrimaryButton>
      </div>
    </main>
  );
}

function NewPageRoute() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const chapterValue = search.get("chapter");
  const chapterId = chapterValue && /^\d+$/.test(chapterValue) ? Number(chapterValue) : undefined;
  return <PageEditor bookId={Number(id)} chapterId={chapterId} />;
}

function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[] | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void api("/api/favorites").then((result) => setFavorites(result.ok ? result.data.favorites : []));
  }, []);
  return (
    <main className="mx-auto max-w-4xl">
      <div className="rounded bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-5 text-3xl text-slate-800">My Favourites</h1>
        {favorites && (favorites.length === 0 ? <Empty>You have no favorites yet</Empty> : (
          <ul className="space-y-2">
            {favorites.map((item: any) => (
              <li key={`${item.type}-${item.id}`}><RecordButton name={item.name} onClick={() => navigate(itemPath(item.type, item.id))} /></li>
            ))}
          </ul>
        ))}
      </div>
    </main>
  );
}

export const bookstackRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/shelves", element: <ShelvesPage /> },
  { path: "/shelves/new", element: <ShelfFormPage mode="create" /> },
  { path: "/shelves/:id", element: <ShelfDetailPage /> },
  { path: "/shelves/:id/edit", element: <ShelfFormPage mode="edit" /> },
  { path: "/shelves/:id/delete", element: <DeleteShelfPage /> },
  { path: "/shelves/:id/books/new", element: <ShelfBookForm /> },
  { path: "/books", element: <BooksPage /> },
  { path: "/books/new", element: <BookFormPage mode="create" /> },
  { path: "/books/:id", element: <BookDetailPage /> },
  { path: "/books/:id/edit", element: <BookFormPage mode="edit" /> },
  { path: "/books/:id/delete", element: <DeleteBookPage /> },
  { path: "/books/:id/chapters/new", element: <ChapterFormPage /> },
  { path: "/books/:id/pages/new", element: <NewPageRoute /> },
  { path: "/chapters/:id", element: <ChapterDetailPage /> },
  { path: "/pages/:id", element: <PageViewPage /> },
  { path: "/pages/:id/edit", element: <PageEditRoute /> },
  { path: "/pages/:id/delete", element: <DeleteDraftPage /> },
  { path: "/favorites", element: <FavoritesPage /> },
];

function ShelfBookForm() {
  const { id } = useParams();
  return <BookFormPage mode="create" shelfId={Number(id)} />;
}

function PageEditRoute() {
  const { id } = useParams();
  return <PageEditor pageId={Number(id)} />;
}
