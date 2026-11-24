import React, { useEffect, useMemo, useState } from "react";
import type { AppData, Answer, Badge, Comment, Question, Revision, Tag, User } from "./types";

type CallApi = (path: string, method?: string, body?: unknown) => Promise<AppData>;
type Navigate = (path: string) => void;

interface Route { path: string; query: URLSearchParams; }

function parseRoute(): Route {
  return { path: window.location.pathname, query: new URLSearchParams(window.location.search) };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderInline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown: string): string {
  const pieces = markdown.split(/```/);
  return pieces.map((piece, index) => {
    if (index % 2 === 1) return `<pre><code>${escapeHtml(piece.replace(/^\w*\n/, ""))}</code></pre>`;
    return piece.split(/\n{2,}/).map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("### ")) return `<h3>${renderInline(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${renderInline(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith("# ")) return `<h1>${renderInline(trimmed.slice(2))}</h1>`;
      const lines = trimmed.split("\n").map(line => renderInline(line)).join("<br/>");
      return `<p>${lines}</p>`;
    }).join("");
  }).join("");
}

function Markdown({ text }: { text: string }) {
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const readable = date.toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return `${readable} UTC (${value})`;
}

function displayName(user?: User): string {
  return user?.displayName || user?.email || "Unknown user";
}

function Avatar({ user }: { user?: User }) {
  const name = displayName(user);
  const colors = ["#5b7c99", "#8a5a9e", "#b66a3c", "#4c8a6a", "#986c3f", "#685eaa"];
  let code = 0;
  for (const char of name) code += char.charCodeAt(0);
  return <span className="avatar" style={{ background: colors[code % colors.length] }} aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>;
}

function Status({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <span role="status" aria-label={label} className={`status ${className}`}>{children}</span>;
}

function Region({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <section role="region" aria-label={label} className={className}>{children}</section>;
}

function Header({ data, navigate, route }: { data: AppData; navigate: Navigate; route: Route }) {
  const [search, setSearch] = useState(route.query.get("q") ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return data.questions.filter(q => (q.title + " " + q.body + " " + q.tags.join(" ")).toLowerCase().includes(term)).slice(0, 7);
  }, [data.questions, search]);
  const submitSearch = () => {
    if (search.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };
  return (
    <>
      <header className="topbar" role="banner">
        <div className="topbar-inner">
          <button className="hamburger" type="button" aria-label="Navigation menu">☰</button>
          <button className="brand" type="button" onClick={() => navigate("/")} aria-label="Stack Overflow home">
            <span className="brand-mark">▰</span><span>stack<strong>overflow</strong></span>
          </button>
          <button className="products-button" type="button">Products</button>
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              role="searchbox"
              aria-label="Search"
              placeholder="Search..."
              value={search}
              onChange={event => { setSearch(event.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={event => { if (event.key === "Enter") submitSearch(); }}
            />
            {showSuggestions && search.trim() && (
              <Region label="Search suggestions" className="search-suggestions">
                {suggestions.length === 0 ? <p>No matching questions</p> : suggestions.map(q => (
                  <button type="button" key={q.id} onClick={() => navigate(`/search?q=${encodeURIComponent(q.title)}`)}>{q.title}</button>
                ))}
              </Region>
            )}
          </div>
          {data.currentUser ? (
            <button className="profile-action" type="button" onClick={() => navigate(`/users/${data.currentUser!.id}`)}>
              {data.currentUser.displayName || data.currentUser.email}
            </button>
          ) : (
            <div className="auth-actions">
              <button type="button" onClick={() => navigate("/login")}>Log in</button>
              <button className="primary-button" type="button" onClick={() => navigate("/signup")}>Sign up</button>
            </div>
          )}
          <button className="icon-button" type="button" aria-label="Inbox">✉</button>
          <button className="icon-button" type="button" aria-label="Achievements">🏆</button>
          <button className="icon-button" type="button" aria-label="Help">ⓘ</button>
        </div>
      </header>
    </>
  );
}

function MainNav({ route, navigate }: { route: Route; navigate: Navigate }) {
  const active = route.path === "/" ? "Home" : route.path.startsWith("/questions") || route.path === "/ask" ? "Questions" : route.path.startsWith("/tags") ? "Tags" : route.path.startsWith("/users") ? "Users" : "";
  const entries = [["Home", "/"], ["Questions", "/questions"], ["Tags", "/tags"], ["Users", "/users"]] as const;
  return (
    <nav className="left-nav" aria-label="Main navigation">
      {entries.map(([label, path]) => (
        <button type="button" key={label} aria-current={active === label ? "page" : undefined} className={active === label ? "current" : ""} onClick={() => navigate(path)}>
          <span className="nav-icon" aria-hidden="true">{label === "Home" ? "⌂" : label === "Questions" ? "▤" : label === "Tags" ? "◈" : "♟"}</span>{label}
        </button>
      ))}
      <div className="nav-rule" />
      <span className="nav-muted">COLLECTIVES</span>
      <span className="nav-muted">STACK INTERNAL</span>
    </nav>
  );
}

function RightRail({ data, navigate, showPersonal = true }: { data: AppData; navigate: Navigate; showPersonal?: boolean }) {
  return (
    <aside className="right-rail">
      <Region label="The Overflow Blog" className="widget yellow-widget">
        <h2>The Overflow Blog</h2>
        <a href="#overflow-blog">Search engine bots crawled so AI bots could run</a>
        <a href="#overflow-blog-2">You need quality engineers to turn AI into ROI</a>
      </Region>
      <Region label="Meta" className="widget">
        <h2>Featured on Meta</h2>
        <a href="#meta-1">A proposal for bringing back Community Promotion &amp; Open Source Ads</a>
        <a href="#meta-2">Community Asks Sprint Announcement – January 2026</a>
        <a href="#meta-3">Policy: Generative AI is banned</a>
      </Region>
      <Region label="Hot Network Questions" className="widget">
        <h2>Hot Network Questions</h2>
        {["Is there anything the US Congress could do to prevent citizens from accessing encrypted communication?", "How to import a DAG from another project?", "Does the Alternating Convenience Store theorem hold if there are multiple checkout lanes?", "Why is the sky blue?"].map((entry, index) => <a href={`#hot-${index}`} key={entry}>{entry}</a>)}
      </Region>
      {showPersonal && (
        <Region label="Custom Filters" className="widget">
          <h2>Custom Filters</h2>
          <button type="button" onClick={() => navigate("/questions")}>Create a custom filter</button>
        </Region>
      )}
      {showPersonal && (
        <Region label="Watched tags" className="widget">
          <h2>Watched tags</h2>
          {!data.currentUser ? <p className="muted">Log in to watch tags.</p> : data.currentUser.watchedTags.length === 0 ? <p className="muted">Watch tags to see their questions here.</p> : data.currentUser.watchedTags.map(tag => (
            <button type="button" className="tag" key={tag} onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}>{tag}</button>
          ))}
        </Region>
      )}
    </aside>
  );
}

function QuestionSummary({ question, data, navigate }: { question: Question; data: AppData; navigate: Navigate }) {
  const author = data.users.find(user => user.id === question.authorId);
  return (
    <Region label={`Question ${question.title}`} className="question-summary">
      <div className="summary-stats">
        <div><Status label="Score">{question.score}</Status><span>votes</span></div>
        <div className={question.answers.length ? "answered" : ""}><Status label="Answer count">{question.answers.length}</Status><span>answers</span></div>
        <div><Status label="View count">{question.views}</Status><span>views</span></div>
      </div>
      <div className="summary-main">
        <button className="question-title" type="button" onClick={() => navigate(`/questions/${question.id}`)}>{question.title}</button>
        <p className="summary-excerpt">{(question.body || "").replace(/[#*`]/g, "").slice(0, 180)}{question.body.length > 180 ? "…" : ""}</p>
        <div className="tag-row">
          {question.tags.map(tag => <button type="button" className="tag" key={tag} onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}>{tag}</button>)}
        </div>
        <div className="summary-meta">
          <span>{formatDate(question.asked)}</span>
          <span className="author-inline"><Avatar user={author} /> {displayName(author)}</span>
        </div>
      </div>
    </Region>
  );
}

function QuestionFeed({ questions, data, navigate, title, showFilter }: { questions: Question[]; data: AppData; navigate: Navigate; title?: string; showFilter?: React.ReactNode }) {
  return (
    <Region label="Question feed" className="question-feed">
      <div className="feed-heading-row">
        <div>
          {title && <h1>{title}</h1>}
          <div className="feed-controls">
            <button className="primary-button" type="button" onClick={() => navigate("/ask")}>Ask Question</button>
            {showFilter}
          </div>
        </div>
      </div>
      {questions.length === 0 ? <div className="empty-panel">No questions found.</div> : questions.map(question => (
        <QuestionSummary key={question.id} question={question} data={data} navigate={navigate} />
      ))}
    </Region>
  );
}

function HomePage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  const [sort, setSort] = useState<"Newest" | "Active">("Newest");
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    const list = [...data.questions].sort((a, b) => sort === "Newest" ? Date.parse(b.asked) - Date.parse(a.asked) : Date.parse(b.modified) - Date.parse(a.modified));
    return list;
  }, [data.questions, sort]);
  const pageSize = 100;
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/", query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column">
        <div className="home-intro">
          <div className="ai-banner"><strong>Hey there, what do you want to learn today?</strong><p>Get instant answers to your technical questions from the community.</p></div>
        </div>
        <Region label="Question feed" className="question-feed">
          <div className="feed-controls">
            <button className="primary-button" type="button" onClick={() => navigate("/ask")}>Ask Question</button>
            <button type="button" aria-pressed={sort === "Newest"} className={sort === "Newest" ? "selected-control" : ""} onClick={() => setSort("Newest")}>Newest</button>
            <button type="button" aria-pressed={sort === "Active"} className={sort === "Active" ? "selected-control" : ""} onClick={() => setSort("Active")}>Active</button>
          </div>
          {pageItems.map(question => <QuestionSummary key={question.id} question={question} data={data} navigate={navigate} />)}
          <div className="pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
            <button type="button" className="next-page" disabled={page * pageSize >= sorted.length} onClick={() => setPage(value => value + 1)}>Next page</button>
          </div>
        </Region>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

interface FilterCriteria { unanswered: boolean; sort: string; tags: string; appliedTitle?: string; }
function QuestionsPage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  const [sort, setSort] = useState<"Newest" | "Active">("Newest");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [criteria, setCriteria] = useState<FilterCriteria>({ unanswered: false, sort: "Newest", tags: "" });
  const [filterTitle, setFilterTitle] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [filterError, setFilterError] = useState("");
  const activeCriteria = filterOpen || criteria.appliedTitle ? criteria : null;
  const questions = useMemo(() => {
    let list = [...data.questions];
    if (activeCriteria) {
      if (activeCriteria.unanswered) list = list.filter(q => q.answers.length === 0);
      const tags = activeCriteria.tags.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (tags.length) list = list.filter(q => tags.every(tag => q.tags.includes(tag)));
    }
    const chosenSort = activeCriteria?.appliedTitle ? activeCriteria.sort : sort;
    list.sort((a, b) => chosenSort === "Newest" ? Date.parse(b.asked) - Date.parse(a.asked) : chosenSort === "Active" ? Date.parse(b.modified) - Date.parse(a.modified) : b.score - a.score);
    return list;
  }, [activeCriteria, data.questions, sort]);
  const pageSize = 100;
  const pageItems = questions.slice((page - 1) * pageSize, page * pageSize);
  const saveFilter = async () => {
    try {
      await callApi(`/api/filters`, "POST", { title: filterTitle, unanswered: criteria.unanswered, sort: criteria.sort, tags: criteria.tags });
      setSaveOpen(false);
      setSavedMessage(`Saved filter ${filterTitle}`);
      setCriteria({ ...criteria, appliedTitle: filterTitle });
    } catch (error) { setFilterError((error as Error).message); }
  };
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/questions", query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column">
        <Region label="Question feed" className="question-feed">
          <div className="feed-top">
            <h1>All Questions</h1>
            <button className="primary-button" type="button" onClick={() => navigate("/ask")}>Ask Question</button>
          </div>
          <div className="feed-controls filter-controls">
            <button type="button" aria-pressed={sort === "Newest"} className={sort === "Newest" ? "selected-control" : ""} onClick={() => { setSort("Newest"); setCriteria(current => ({ ...current, appliedTitle: undefined })); }}>Newest</button>
            <button type="button" aria-pressed={sort === "Active"} className={sort === "Active" ? "selected-control" : ""} onClick={() => { setSort("Active"); setCriteria(current => ({ ...current, appliedTitle: undefined })); }}>Active</button>
            <button type="button" className="filter-button" onClick={() => setFilterOpen(value => !value)}>Filter</button>
          </div>
          {filterOpen && (
            <Region label="Filter panel" className="filter-panel">
              <label className="checkbox-label"><input type="checkbox" checked={criteria.unanswered} onChange={event => setCriteria(current => ({ ...current, unanswered: event.target.checked }))} /> Unanswered</label>
              <label>Sort
                <select aria-label="Sort" value={criteria.sort} onChange={event => setCriteria(current => ({ ...current, sort: event.target.value }))}>
                  <option>Newest</option><option>Active</option><option>Highest score</option>
                </select>
              </label>
              <label>Tags
                <input aria-label="Tags" type="text" value={criteria.tags} onChange={event => setCriteria(current => ({ ...current, tags: event.target.value }))} placeholder="e.g. python" />
              </label>
              <button className="primary-button" type="button" onClick={() => setSaveOpen(true)}>Save custom filter</button>
            </Region>
          )}
          {savedMessage && <p role="status" className="success">{savedMessage}</p>}
          {filterError && <p role="alert" className="error">{filterError}</p>}
          {pageItems.map(question => <QuestionSummary key={question.id} question={question} data={data} navigate={navigate} />)}
          <div className="pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
            <button type="button" className="next-page" disabled={page * pageSize >= questions.length} onClick={() => setPage(value => value + 1)}>Next page</button>
          </div>
        </Region>
      </main>
      <aside className="right-rail">
        <Region label="Saved filters" className="widget">
          <h2>Saved filters</h2>
          {data.currentUser?.filters.length ? data.currentUser.filters.map(filter => (
            <button type="button" className="saved-filter" key={filter.id} onClick={() => { setCriteria({ unanswered: filter.unanswered, sort: filter.sort, tags: filter.tags, appliedTitle: filter.title }); setFilterOpen(true); }}>{filter.title}</button>
          )) : <p className="muted">Save a filter to reuse it here.</p>}
        </Region>
        <Region label="Watched tags" className="widget">
          <h2>Watched tags</h2>
          {data.currentUser?.watchedTags.length ? data.currentUser.watchedTags.map(tag => <button type="button" className="tag" key={tag} onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}>{tag}</button>) : <p className="muted">No watched tags yet.</p>}
        </Region>
        <RightRail data={data} navigate={navigate} showPersonal={false} />
      </aside>
      {saveOpen && (
        <div role="dialog" aria-label="Save custom filter" className="modal-backdrop">
          <div className="modal">
            <h2>Save custom filter</h2>
            <label>Filter title<input role="textbox" aria-label="Filter title" value={filterTitle} onChange={event => setFilterTitle(event.target.value)} /></label>
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={saveFilter}>Save filter</button>
              <button type="button" onClick={() => setSaveOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Provided by the App component through a small module-level binding so feature components stay concise.
let callApi: CallApi = async () => { throw new Error("Application is still loading"); };

function TagsPage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const shown = data.tags.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/tags", query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column">
        <Region label="Tags" className="tags-page">
          <h1>Tags</h1>
          <p>A tag is a keyword or label that categorizes your question with other, similar questions.</p>
          <label className="tag-filter">Filter by tag name<input type="text" aria-label="Filter by tag name" placeholder="Filter by tag name" /></label>
          <div className="tag-grid">
            {shown.map(tag => (
              <Region label={`Tag ${tag.name}`} key={tag.name} className="tag-card">
                <button type="button" className="tag" onClick={() => navigate(`/tags/${encodeURIComponent(tag.name)}`)}>{tag.name}</button>
                <p>{tag.description}</p>
                <Status label="Question count">{tag.question_count}</Status> questions
              </Region>
            ))}
          </div>
          <div className="pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
            <button type="button" disabled={page * pageSize >= data.tags.length} onClick={() => setPage(value => value + 1)}>Next page</button>
          </div>
        </Region>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function TagDetailPage({ data, navigate, tagName }: { data: AppData; navigate: Navigate; tagName: string }) {
  const tag = data.tags.find(item => item.name === tagName);
  const questions = data.questions.filter(question => question.tags.includes(tagName));
  const [sort, setSort] = useState<"Newest" | "Active">("Newest");
  const [page, setPage] = useState(1);
  const sorted = [...questions].sort((a, b) => sort === "Newest" ? Date.parse(b.asked) - Date.parse(a.asked) : Date.parse(b.modified) - Date.parse(a.modified));
  const pageSize = 100;
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);
  const watched = data.currentUser?.watchedTags.includes(tagName);
  const toggleWatch = async () => {
    if (!data.currentUser) { navigate("/login"); return; }
    try { await callApi(`/api/tags/${encodeURIComponent(tagName)}/watch`, "POST"); } catch (error) { alert((error as Error).message); }
  };
  return (
    <div className="content-grid">
      <MainNav route={{ path: `/tags/${tagName}`, query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column">
        <Region label={`${tagName.charAt(0).toUpperCase()}${tagName.slice(1)} tag`} className="tag-detail">
          <div className="tag-detail-heading">
            <h1>{tagName}</h1>
            <button type="button" className="primary-button" onClick={toggleWatch}>{watched ? "Unwatch tag" : "Watch tag"}</button>
          </div>
          <p>{tag?.description ?? "Questions about this topic."}</p>
          <p className="muted">Questions tagged with <span className="tag">{tagName}</span></p>
        </Region>
        <Region label="Related tags" className="widget related-tags">
          <h2>Related tags</h2>
          {data.tags.filter(item => item.name !== tagName).map(item => <button type="button" className="tag" key={item.name} onClick={() => navigate(`/tags/${encodeURIComponent(item.name)}`)}>{item.name}</button>)}
        </Region>
        <Region label="Question feed" className="question-feed">
          <div className="feed-controls">
            <button type="button" aria-pressed={sort === "Newest"} className={sort === "Newest" ? "selected-control" : ""} onClick={() => setSort("Newest")}>Newest</button>
            <button type="button" aria-pressed={sort === "Active"} className={sort === "Active" ? "selected-control" : ""} onClick={() => setSort("Active")}>Active</button>
            <button type="button" disabled={page * pageSize >= sorted.length} onClick={() => setPage(value => value + 1)}>Next page</button>
          </div>
          {pageItems.length ? pageItems.map(question => <QuestionSummary key={question.id} question={question} data={data} navigate={navigate} />) : <div className="empty-panel">No questions with this tag yet.</div>}
        </Region>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function UsersPage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/users", query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column">
        <Region label="Users" className="users-page">
          <h1>Users</h1>
          <label>Filter by user<input type="text" aria-label="Filter by user" /></label>
          <div className="users-grid">
            {data.users.map(user => (
              <article className="user-card" key={user.id}>
                <Avatar user={user} />
                <div>
                  <button type="button" className="user-profile-action" aria-label={`${displayName(user)} ${user.email}`} onClick={() => navigate(`/users/${user.id}`)}>{displayName(user)}</button>
                  <p>{user.location || "Somewhere"}</p>
                  <Status label="Reputation">{user.reputation}</Status>
                </div>
              </article>
            ))}
          </div>
        </Region>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function BadgeCatalog({ badges }: { badges: Badge[] }) {
  const groups = ["Gold", "Silver", "Bronze"];
  return (
    <Region label="Badge catalog" className="badge-catalog">
      <h2>Badge catalog</h2>
      {groups.map(group => (
        <Region label={group} key={group} className="badge-group">
          <h3>{group}</h3>
          {badges.filter(badge => badge.category === group).map(badge => (
            <div className="badge-row" key={badge.name}>
              <div><strong>{badge.name}</strong><p>{badge.description}</p></div>
              <Status label={`Earn count ${badge.name}`}>{badge.earn_count}</Status>
            </div>
          ))}
        </Region>
      ))}
    </Region>
  );
}

function ReputationHistory({ user, data, navigate }: { user: User; data: AppData; navigate: Navigate }) {
  return (
    <Region label="Reputation history" className="activity-panel">
      <h2>Reputation history</h2>
      {user.reputationHistory.length === 0 ? <div className="empty-panel">No reputation changes yet.</div> : user.reputationHistory.map((entry, index) => {
        const parent = data.questions.find(question => question.title === entry.post);
        return (
          <div className="reputation-entry" key={`${entry.time}-${index}`}>
            <span>{entry.reason}</span>
            <strong className={entry.change >= 0 ? "positive" : "negative"}>{entry.change >= 0 ? `+${entry.change}` : entry.change}</strong>
            {parent ? <button type="button" className="link-button" onClick={() => navigate(`/questions/${parent.id}`)}>{entry.post}</button> : <span>{entry.post}</span>}
            <span className="muted">{formatDate(entry.time)}</span>
          </div>
        );
      })}
    </Region>
  );
}

function ActivityContent({ view, user, data, navigate }: { view: string; user: User; data: AppData; navigate: Navigate }) {
  const own = data.currentUser?.id === user.id;
  const authoredAnswers = data.questions.flatMap(question => question.answers.filter(answer => answer.authorId === user.id).map(answer => ({ question, answer })));
  const authoredQuestions = data.questions.filter(question => question.authorId === user.id);
  if (view === "Summary") {
    return (
      <Region label="Activity content" className="activity-content">
        <h2>Summary</h2>
        <div className="summary-card-row">
          <div className="summary-card"><h3>Reputation</h3><Status label="Reputation">{user.reputation}</Status><p>Reputation is how the community thanks you.</p></div>
          <div className="summary-card"><h3>Questions</h3><Status label="Question count">{authoredQuestions.length}</Status><p>Questions you have asked.</p></div>
          <div className="summary-card"><h3>Badge progress</h3><p>Earn badges for helpful actions.</p></div>
        </div>
        {user.earnedBadges.length > 0 && (
          <div role="status" aria-label="badge notification" className="badge-notification">You earned the {user.earnedBadges.join(", ")} badge.</div>
        )}
        <Region label="Badges" className="activity-panel">
          <h2>Badges</h2>
          {user.earnedBadges.length === 0 ? <p className="muted">You have not earned any badges yet.</p> : user.earnedBadges.map(name => {
            const badge = data.badges.find(item => item.name === name);
            return <div className="badge-row" key={name}><strong>{name}</strong><span>{badge?.category}</span><p>{badge?.description}</p></div>;
          })}
        </Region>
        <Region label="Recent activity" className="activity-panel">
          <h2>Recent activity</h2>
          {authoredAnswers.length === 0 && authoredQuestions.length === 0 && user.responses.length === 0 ? <p className="muted">No recent activity.</p> : (
            <>
              {authoredAnswers.slice(0, 3).map(({ question, answer }) => <div className="activity-line" key={answer.id}>answered <button type="button" className="link-button" onClick={() => navigate(`/questions/${question.id}`)}>{question.title}</button></div>)}
              {authoredQuestions.slice(0, 3).map(question => <div className="activity-line" key={question.id}>asked <button type="button" className="link-button" onClick={() => navigate(`/questions/${question.id}`)}>{question.title}</button></div>)}
              {user.responses.slice(0, 3).map((response, index) => <div className="activity-line" key={index}>responded: {response.body}</div>)}
            </>
          )}
        </Region>
      </Region>
    );
  }
  if (view === "Answers") {
    return (
      <Region label="Activity content" className="activity-content">
        <div className="activity-list-heading"><h2>{authoredAnswers.length} Answers</h2><div className="mini-controls"><button type="button" aria-pressed="true">Score</button><button type="button">Activity</button><button type="button">Newest</button><button type="button" disabled>Next page</button></div></div>
        {authoredAnswers.length === 0 ? <div className="empty-panel">You have not answered any questions</div> : authoredAnswers.map(({ question, answer }) => (
          <article className="activity-answer" key={answer.id}>
            <button type="button" className="link-button" onClick={() => navigate(`/questions/${question.id}`)}>{question.title}</button>
            <p>{answer.body}</p>
            <div><Status label="Score">{answer.score}</Status> {answer.accepted && <span className="accepted-marker">Accepted answer</span>}</div>
          </article>
        ))}
      </Region>
    );
  }
  if (view === "Questions") {
    return (
      <Region label="Activity content" className="activity-content">
        <div className="activity-list-heading"><h2><Status label="Question count">{authoredQuestions.length}</Status> Questions</h2></div>
        {authoredQuestions.length === 0 ? <div className="empty-panel">You have not asked any questions</div> : authoredQuestions.map(question => (
          <article className="activity-question" key={question.id}>
            <button type="button" className="link-button" onClick={() => navigate(`/questions/${question.id}`)}>{question.title}</button>
            <div className="mini-stats">
              <span><Status label="Score">{question.score}</Status> votes</span>
              <span><Status label="Answer count">{question.answers.length}</Status> answers</span>
              <span><Status label="View count">{question.views}</Status> views</span>
            </div>
          </article>
        ))}
      </Region>
    );
  }
  if (view === "Reputation") return <ReputationHistory user={user} data={data} navigate={navigate} />;
  if (view === "Responses") {
    return (
      <Region label="Activity content" className="activity-content">
        <h2>Responses</h2>
        {user.responses.length === 0 ? <div className="empty-panel">No responses yet.</div> : user.responses.map((response, index) => {
          const parent = data.questions.find(question => question.title === response.question);
          return <div className="response-row" key={index}><p>{response.body}</p>{parent ? <button type="button" className="link-button" onClick={() => navigate(`/questions/${parent.id}`)}>{parent.title}</button> : <span>{response.question}</span>}</div>;
        })}
      </Region>
    );
  }
  if (view === "Votes") {
    return (
      <Region label="Activity content" className="activity-content">
        <h2>Votes</h2>
        {!own ? <div className="empty-panel">Private votes are visible only to the owner.</div> : user.privateVotes.length === 0 ? <div className="empty-panel">You have not cast any votes</div> : user.privateVotes.map((vote, index) => {
          const parent = data.questions.find(question => question.title === vote.post);
          return <div className="vote-row" key={index}><span>{vote.action}</span>{parent ? <button type="button" className="link-button" onClick={() => navigate(`/questions/${parent.id}`)}>{vote.post}</button> : <span>{vote.post}</span>}<span className="muted">{formatDate(vote.time)}</span></div>;
        })}
      </Region>
    );
  }
  if (view === "Badges") return <BadgeCatalog badges={data.badges} />;
  return (
    <Region label="Activity content" className="activity-content">
      <h2>{view}</h2>
      <div className="empty-panel">No {view.toLowerCase()} to show.</div>
    </Region>
  );
}

function ProfilePage({ data, navigate, userId }: { data: AppData; navigate: Navigate; userId: string }) {
  const user = data.users.find(candidate => candidate.id === userId);
  const [profileTab, setProfileTab] = useState<"Activity" | "Reputation">("Activity");
  const [activityView, setActivityView] = useState("Summary");
  const own = data.currentUser?.id === userId;
  if (!user) return <div className="empty-panel">User not found.</div>;
  const views = ["Summary", "Answers", "Questions", "Tags", "Articles", "Badges", "Following", "Bounties", "Reputation", "All actions", "Responses", "Votes"];
  return (
    <div className="content-grid">
      <MainNav route={{ path: `/users/${userId}`, query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column profile-column">
        <div className="profile-header">
          <Avatar user={user} />
          <div className="profile-identity">
            <h1>{displayName(user)}</h1>
            <p>{user.location || "Somewhere"}</p>
          </div>
          {own && <button type="button" className="outline-button" onClick={() => navigate(`/users/${user.id}/edit`)}>Edit profile</button>}
        </div>
        <nav className="profile-tabs" aria-label="Profile navigation">
          <button type="button" aria-current={profileTab === "Activity" ? "page" : undefined} className={profileTab === "Activity" ? "current" : ""} onClick={() => setProfileTab("Activity")}>Activity</button>
          <button type="button" aria-current={profileTab === "Reputation" ? "page" : undefined} className={profileTab === "Reputation" ? "current" : ""} onClick={() => setProfileTab("Reputation")}>Reputation</button>
        </nav>
        {user.lastProfileUpdateAt && <p role="status" className="success">Profile updated successfully.</p>}
        <Region label="Public profile" className="public-profile">
          <div className="public-name">{displayName(user)}</div>
          <p className="profile-title">{user.title || "No title has been set"}</p>
          <p>{user.about || "No biography has been set"}</p>
          <p><strong>Location:</strong> {user.location || "Not set"}</p>
          {user.website && <p><strong>Website:</strong> <a href={user.website}>{user.website}</a></p>}
          {user.x && <p><strong>X:</strong> {user.x}</p>}
          {user.github && <p><strong>GitHub:</strong> <a href={user.github}>{user.github}</a></p>}
        </Region>
        {profileTab === "Reputation" ? <ReputationHistory user={user} data={data} navigate={navigate} /> : (
          <div className="profile-activity-layout">
            <nav className="activity-nav" aria-label="Activity navigation">
              {views.map(view => {
                const disabled = view === "Votes" && !own;
                return <button type="button" key={view} disabled={disabled} aria-current={activityView === view ? "page" : undefined} className={activityView === view ? "current" : ""} onClick={() => setActivityView(view)}>{view}</button>;
              })}
            </nav>
            <div className="profile-activity-main">
              <ActivityContent view={activityView} user={user} data={data} navigate={navigate} />
            </div>
          </div>
        )}
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function EditProfilePage({ data, navigate, userId }: { data: AppData; navigate: Navigate; userId: string }) {
  const user = data.users.find(candidate => candidate.id === userId);
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "", fullName: user?.fullName ?? "", location: user?.location ?? "",
    title: user?.title ?? "", about: user?.about ?? "", website: user?.website ?? "", x: user?.x ?? "", github: user?.github ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!user || data.currentUser?.id !== user.id) return <div className="empty-panel">You can only edit your own profile.</div>;
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async () => {
    setSaving(true); setError("");
    try {
      await callApi(`/api/profile`, "PATCH", form);
      navigate(`/users/${user.id}`);
    } catch (err) { setError((err as Error).message); setSaving(false); }
  };
  return (
    <div className="content-grid">
      <MainNav route={{ path: `/users/${userId}/edit`, query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column edit-profile-page">
        <h1>Edit your profile</h1>
        <h2>Public information</h2>
        <div className="form-panel">
          <label>Display name<input role="textbox" aria-label="Display name" value={form.displayName} onChange={event => update("displayName", event.target.value)} /></label>
          <label>Location<input role="textbox" aria-label="Location" value={form.location} onChange={event => update("location", event.target.value)} /></label>
          <label>Title<input role="textbox" aria-label="Title" value={form.title} onChange={event => update("title", event.target.value)} /></label>
          <label>About me<textarea role="textbox" aria-label="About me" value={form.about} onChange={event => update("about", event.target.value)} /></label>
          <h2>Links</h2>
          <label>Website<input role="textbox" aria-label="Website" value={form.website} onChange={event => update("website", event.target.value)} /></label>
          <label>X<input role="textbox" aria-label="X" value={form.x} onChange={event => update("x", event.target.value)} /></label>
          <label>GitHub<input role="textbox" aria-label="GitHub" value={form.github} onChange={event => update("github", event.target.value)} /></label>
          <h2>Private information</h2>
          <label>Full name<input role="textbox" aria-label="Full name" value={form.fullName} onChange={event => update("fullName", event.target.value)} /></label>
        </div>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="primary-button" disabled={saving} onClick={submit}>Save and copy changes to all public communities</button>
          <button type="button" onClick={() => navigate(`/users/${user.id}`)}>Cancel</button>
        </div>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function CommentsThread({ comments, data, submitPath }: { comments: Comment[]; data: AppData; submitPath: string }) {
  const [showInput, setShowInput] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const currentUser = data.currentUser;
  const visible = expanded ? comments : comments.slice(0, 5);
  const hidden = Math.max(0, comments.length - 5);
  const canEdit = (comment: Comment) => Boolean(currentUser && currentUser.id === comment.authorId && Date.parse(data.appNow) - Date.parse(comment.posted) <= 5 * 60 * 1000);
  const submitComment = async () => {
    if (!body.trim()) return;
    try {
      await callApi(submitPath, "POST", { body });
      setBody(""); setShowInput(false); setError("");
    } catch (err) { setError((err as Error).message); }
  };
  const saveEdit = async (comment: Comment) => {
    try {
      await callApi(`/api/comments/${comment.id}`, "PATCH", { body: editingBody });
      setEditingId(null); setError("");
    } catch (err) { setError((err as Error).message); }
  };
  const remove = async (comment: Comment) => {
    try { await callApi(`/api/comments/${comment.id}`, "DELETE"); } catch (err) { setError((err as Error).message); }
  };
  const submitReply = async (comment: Comment) => {
    if (!replyBody.trim()) return;
    try {
      await callApi(`/api/comments/${comment.id}/reply`, "POST", { body: replyBody });
      setReplyBody(""); setReplyId(null); setError("");
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <Region label="Comments" className="comments-region">
      <h3>Comments</h3>
      {visible.map(comment => {
        const author = data.users.find(user => user.id === comment.authorId);
        return (
          <Region label={`Comment ${comment.body}`} key={comment.id} className="comment">
            {editingId === comment.id ? (
              <div className="inline-editor">
                <input role="textbox" aria-label="Comment" value={editingBody} onChange={event => setEditingBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveEdit(comment); }} />
                <button type="button" className="primary-button" onClick={() => saveEdit(comment)}>Save</button>
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <p className="comment-body">{comment.body}{comment.edited && <span className="edited-label"> (edited)</span>}</p>
            )}
            <div className="comment-meta">
              <Avatar user={author} />
              <span>{displayName(author)}</span>
              <span className="muted">{formatDate(comment.posted)}</span>
              <Status label="Comment votes">{comment.upvotes}</Status>
              <button type="button" aria-pressed={Boolean(currentUser && comment.voters.includes(currentUser.id))} className={currentUser && comment.voters.includes(currentUser.id) ? "active-vote" : ""} onClick={async () => {
                if (!currentUser) return;
                try { await callApi(`/api/comments/${comment.id}/vote`, "POST"); } catch (err) { setError((err as Error).message); }
              }}>Up vote</button>
              {currentUser && currentUser.id === comment.authorId && canEdit(comment) && <button type="button" onClick={() => { setEditingId(comment.id); setEditingBody(comment.body); }}>Edit</button>}
              {currentUser && currentUser.id === comment.authorId && <button type="button" onClick={() => remove(comment)}>Delete</button>}
              {currentUser && <button type="button" onClick={() => { setReplyId(comment.id); setReplyBody(""); }}>Reply</button>}
            </div>
            {comment.replies.length > 0 && (
              <Region label="Replies" className="replies">
                {comment.replies.map(reply => {
                  const replyAuthor = data.users.find(user => user.id === reply.authorId);
                  return <div className="reply" key={reply.id}><span className="mention">@{reply.mention || "user"}</span> {reply.body} <span className="muted">— {displayName(replyAuthor)}</span></div>;
                })}
              </Region>
            )}
            {replyId === comment.id && (
              <div className="inline-editor reply-editor">
                <input role="textbox" aria-label="Reply" value={replyBody} onChange={event => setReplyBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter") submitReply(comment); }} />
                <button type="button" className="primary-button" onClick={() => submitReply(comment)}>Add Reply</button>
                <button type="button" onClick={() => setReplyId(null)}>Cancel</button>
              </div>
            )}
          </Region>
        );
      })}
      {hidden > 0 && !expanded && <button type="button" onClick={() => setExpanded(true)}>Show {hidden} more comments</button>}
      <button type="button" className="add-comment" onClick={() => { if (!data.currentUser) { window.location.assign("/login"); return; } setShowInput(value => !value); }}>Add a comment</button>
      {showInput && (
        <div className="inline-editor">
          <input role="textbox" aria-label="Comment" placeholder="Use comments to ask for clarification or add more information." value={body} onChange={event => setBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter") submitComment(); }} />
          <button type="button" className="primary-button" onClick={submitComment}>Add comment</button>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </Region>
  );
}

function RevisionHistory({ revisions }: { revisions: Revision[] }) {
  return (
    <Region label="Revision history" className="revision-history">
      <h3>Revision history</h3>
      {revisions.length === 0 ? <p className="muted">No revisions yet.</p> : revisions.map(revision => (
        <div className="revision" key={revision.id}>
          <p><strong>{revision.summary || "No summary provided"}</strong> <span className="muted">{formatDate(revision.time)}</span></p>
          {revision.previousBody !== undefined && <div className="revision-bodies"><div><h4>Previous</h4><p>{revision.previousBody}</p></div><div><h4>Updated</h4><p>{revision.body}</p></div></div>}
        </div>
      ))}
    </Region>
  );
}

function AnswerCard({ question, answer, data, navigate }: { question: Question; answer: Answer; data: AppData; navigate: Navigate }) {
  const author = data.users.find(user => user.id === answer.authorId);
  const currentUser = data.currentUser;
  const ownAnswer = currentUser?.id === answer.authorId;
  const ownQuestion = currentUser?.id === question.authorId;
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(answer.body);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const save = async () => {
    try {
      await callApi(`/api/answers/${answer.id}`, "PATCH", { body, editSummary: summary });
      setEditing(false); setError("");
    } catch (err) { setError((err as Error).message); }
  };
  const vote = async (direction: number) => {
    if (!currentUser) { navigate("/login"); return; }
    try { await callApi(`/api/answers/${answer.id}/vote`, "POST", { direction }); } catch (err) { setError((err as Error).message); }
  };
  const confirmDelete = async () => {
    try { await callApi(`/api/answers/${answer.id}`, "DELETE"); setDeleteOpen(false); } catch (err) { setError((err as Error).message); }
  };
  const accept = async () => {
    try { await callApi(`/api/answers/${answer.id}/accept`, "POST"); } catch (err) { setError((err as Error).message); }
  };
  return (
    <Region label={`Answer by ${displayName(author)}`} className={`answer ${answer.accepted ? "accepted-answer" : ""}`}>
      <div className="vote-column">
        <button type="button" aria-label="Up vote" aria-pressed={Boolean(currentUser && answer.votes[currentUser.id] === 1)} className={currentUser && answer.votes[currentUser.id] === 1 ? "active-vote" : ""} onClick={() => vote(1)}>▲</button>
        <Status label="Score">{answer.score}</Status>
        <button type="button" aria-label="Down vote" aria-pressed={Boolean(currentUser && answer.votes[currentUser.id] === -1)} className={currentUser && answer.votes[currentUser.id] === -1 ? "active-vote" : ""} onClick={() => vote(-1)}>▼</button>
        {answer.accepted && <button type="button" className="accepted-check" aria-label="Accepted answer" aria-pressed="true">✓</button>}
        {ownQuestion && !answer.accepted && <button type="button" className="accept-button" onClick={accept}>Accept answer</button>}
      </div>
      <div className="answer-main">
        {answer.accepted && <p className="accepted-marker">Accepted answer</p>}
        {editing ? (
          <div className="answer-editor">
            <label>Body<textarea role="textbox" aria-label="Body" value={body} onChange={event => setBody(event.target.value)} /></label>
            <label>Edit Summary<input role="textbox" aria-label="Edit Summary" value={summary} onChange={event => setSummary(event.target.value)} /></label>
            {error && <p role="alert" className="error">{error}</p>}
            <div className="form-actions"><button type="button" className="primary-button" onClick={save}>Save edits</button><button type="button" onClick={() => { setEditing(false); setBody(answer.body); setError(""); }}>Cancel</button></div>
          </div>
        ) : <Markdown text={answer.body} />}
        <div className="tag-row">{answer.edited && <span className="edited-label">edited {formatDate(answer.modified)}</span>}</div>
        <div className="post-actions">
          <button type="button">Share</button>
          {ownAnswer && <button type="button" onClick={() => { setEditing(true); setBody(answer.body); }}>Edit</button>}
          <button type="button">Follow</button>
          <button type="button" onClick={() => setShowTimeline(value => !value)}>Timeline</button>
          {ownAnswer && !answer.accepted && <button type="button" onClick={() => setDeleteOpen(true)}>Delete</button>}
        </div>
        {showTimeline && <RevisionHistory revisions={answer.revisions} />}
        <div className="answer-author-row">
          <div className="answer-meta"><span className="muted">answered {formatDate(answer.created)}</span></div>
          <Region label="Author" className="author-card">
            <Avatar user={author} />
            <div><span>{displayName(author)}</span><div><Status label="Reputation">{author?.reputation ?? 0}</Status> reputation</div><div className="muted">{formatDate(answer.created)}</div></div>
          </Region>
        </div>
        <CommentsThread comments={answer.comments} data={data} submitPath={`/api/answers/${answer.id}/comments`} />
      </div>
      {deleteOpen && (
        <div role="dialog" aria-label="Confirm deletion" className="modal-backdrop">
          <div className="modal">
            <h2>Confirm deletion</h2>
            <p>Deleting this answer permanently removes it from the question and reverses reputation earned from votes.</p>
            <div className="modal-actions"><button type="button" className="danger-button" onClick={confirmDelete}>Confirm deletion</button><button type="button" onClick={() => setDeleteOpen(false)}>Cancel</button></div>
          </div>
        </div>
      )}
      {error && !editing && <p role="alert" className="error">{error}</p>}
    </Region>
  );
}

function QuestionDetailPage({ data, navigate, questionId }: { data: AppData; navigate: Navigate; questionId: string }) {
  const question = data.questions.find(item => item.id === questionId);
  const currentUser = data.currentUser;
  const [sort, setSort] = useState("Date modified");
  const [answerBody, setAnswerBody] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!question) return <div className="content-grid"><MainNav route={{ path: `/questions/${questionId}`, query: new URLSearchParams() }} navigate={navigate} /><main className="main-column"><div className="empty-panel">Question not found or has been deleted.</div></main><RightRail data={data} navigate={navigate} /></div>;
  const author = data.users.find(user => user.id === question.authorId);
  const ownQuestion = currentUser?.id === question.authorId;
  const orderedAnswers = [...question.answers].sort((a, b) => {
    if (sort === "Highest score") return b.score - a.score;
    if (sort === "Trending") return (b.score * 2 + Date.parse(b.modified) / 1e14) - (a.score * 2 + Date.parse(a.modified) / 1e14);
    return Date.parse(b.modified) - Date.parse(a.modified);
  });
  const voteQuestion = async (direction: number) => {
    if (!currentUser) { navigate("/login"); return; }
    try { await callApi(`/api/questions/${question.id}/vote`, "POST", { direction }); } catch (error) { alert((error as Error).message); }
  };
  const postAnswer = async () => {
    if (!currentUser) { navigate("/login"); return; }
    try {
      await callApi(`/api/questions/${question.id}/answers`, "POST", { body: answerBody });
      setAnswerBody(""); setAnswerError("");
    } catch (error) { setAnswerError((error as Error).message); }
  };
  const confirmDelete = async () => {
    try { await callApi(`/api/questions/${question.id}`, "DELETE"); navigate("/"); } catch (error) { alert((error as Error).message); }
  };
  return (
    <div className="content-grid">
      <MainNav route={{ path: `/questions/${question.id}`, query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column question-detail">
        <div className="detail-heading"><h1>{question.title}</h1><button className="primary-button" type="button" onClick={() => navigate("/ask")}>Ask Question</button></div>
        <Region label="Question post" className="question-post">
          <div className="post-layout">
            <div className="vote-column">
              <button type="button" aria-label="Up vote" aria-pressed={Boolean(currentUser && question.votes[currentUser.id] === 1)} className={currentUser && question.votes[currentUser.id] === 1 ? "active-vote" : ""} onClick={() => voteQuestion(1)}>▲</button>
              <Status label="Score">{question.score}</Status>
              <button type="button" aria-label="Down vote" aria-pressed={Boolean(currentUser && question.votes[currentUser.id] === -1)} className={currentUser && question.votes[currentUser.id] === -1 ? "active-vote" : ""} onClick={() => voteQuestion(-1)}>▼</button>
              <button type="button" aria-label="Save">☆</button>
            </div>
            <div className="post-main">
              <Markdown text={question.body} />
              <div className="tag-row">{question.tags.map(tag => <button type="button" className="tag" key={tag} onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}>{tag}</button>)}</div>
              <div className="post-actions">
                <button type="button">Share</button>
                <button type="button" disabled={!ownQuestion} onClick={() => { if (ownQuestion) navigate(`/questions/${question.id}/edit`); }}>Edit</button>
                <button type="button">Follow</button>
                <button type="button" onClick={() => setShowTimeline(value => !value)}>Timeline</button>
                {ownQuestion && <button type="button" onClick={() => setDeleteOpen(true)}>Delete</button>}
              </div>
              <div className="post-author-row">
                <div className="question-times">
                  <Status label="Asked">Asked {formatDate(question.asked)}</Status>
                  <Status label="Modified">Modified {formatDate(question.modified)}</Status>
                  <Status label="View count">{question.views}</Status> views
                  {question.edited && <span className="edited-label">edited</span>}
                </div>
                <Region label="Author" className="author-card">
                  <Avatar user={author} />
                  <div>
                    <span>{displayName(author)}</span>
                    <div><Status label="Reputation">{author?.reputation ?? 0}</Status> reputation</div>
                    <div className="muted">{(author?.earnedBadges ?? []).join(", ") || "No badges"}</div>
                    <div className="muted">{formatDate(question.asked)}</div>
                  </div>
                </Region>
              </div>
              <CommentsThread comments={question.comments} data={data} submitPath={`/api/questions/${question.id}/comments`} />
            </div>
          </div>
        </Region>
        {showTimeline && <RevisionHistory revisions={question.revisions} />}
        <Region label="Answers" className="answers-region">
          <div className="answers-heading">
            <Status label="Answer count">{question.answers.length}</Status>
            <h2>Answers</h2>
            <label>Sorted by
              <select aria-label="Sorted by" value={sort} onChange={event => setSort(event.target.value)}>
                <option>Highest score</option><option>Trending</option><option>Date modified</option>
              </select>
            </label>
          </div>
          {orderedAnswers.length === 0 ? <div className="empty-panel">No answers yet.</div> : orderedAnswers.map(answer => <AnswerCard key={answer.id} question={question} answer={answer} data={data} navigate={navigate} />)}
        </Region>
        {currentUser && (
          <section className="your-answer">
            <h2>Your Answer</h2>
            <textarea role="textbox" aria-label="Your Answer" value={answerBody} onChange={event => setAnswerBody(event.target.value)} />
            {answerError && <p role="alert" className="error">{answerError}</p>}
            <button type="button" className="primary-button" onClick={postAnswer}>Post Your Answer</button>
          </section>
        )}
      </main>
      <RightRail data={data} navigate={navigate} />
      {deleteOpen && (
        <div role="dialog" aria-label="Confirm deletion" className="modal-backdrop">
          <div className="modal">
            <h2>Confirm deletion</h2>
            <p>Deleting this question removes it from the public Question feed and search results. This cannot be undone from the public view.</p>
            <div className="modal-actions"><button type="button" className="danger-button" onClick={confirmDelete}>Confirm deletion</button><button type="button" onClick={() => setDeleteOpen(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AskQuestionPage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [posting, setPosting] = useState(false);
  if (!data.currentUser) return <div className="content-grid"><MainNav route={{ path: "/ask", query: new URLSearchParams() }} navigate={navigate} /><main className="main-column"><div className="empty-panel">Log in to ask a question.</div></main><RightRail data={data} navigate={navigate} /></div>;
  const post = async () => {
    const nextErrors: string[] = [];
    if (title.trim().length < 15) nextErrors.push("Title is required (minimum 15 characters)");
    if (body.length < 220) nextErrors.push("Question body is required (minimum 220 characters)");
    if (!tagsInput.trim()) nextErrors.push("Please add at least one tag");
    setErrors(nextErrors);
    if (nextErrors.length) return;
    setPosting(true);
    try {
      const next = await callApi(`/api/questions`, "POST", { title, body, tags: tagsInput });
      navigate(`/questions/${next.focusedQuestionId}`);
    } catch (error) { setErrors([(error as Error).message]); setPosting(false); }
  };
  const suggestions = data.tags;
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/ask", query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column ask-page">
        <div className="editor-heading"><h1>Ask question</h1><span>Required fields *</span></div>
        <label>Title
          <span className="field-help">Be specific and imagine you are asking a question to another person. Min 15 characters.</span>
          <input role="textbox" aria-label="Title" value={title} onChange={event => setTitle(event.target.value)} />
        </label>
        <div className="field-status"><Status label="Title character count">{title.length}</Status> characters</div>
        <label>Body
          <span className="field-help">Include all the information someone would need to answer your question. Min 220 characters.</span>
          <div className="editor-toolbar"><button type="button" onClick={() => setBody(value => value + "**bold**")}>Bold</button><button type="button" onClick={() => setBody(value => value + "*italic*")}>Italic</button><button type="button" onClick={() => setBody(value => value + "`code`")}>Code</button></div>
          <textarea role="textbox" aria-label="Body" value={body} onChange={event => setBody(event.target.value)} />
        </label>
        <Region label="Preview" className="preview-panel"><h2>Preview</h2>{body ? <Markdown text={body} /> : <p className="muted">Your rendered question will appear here.</p>}</Region>
        <label>Tags
          <span className="field-help">Add tags to describe what your question is about. Start typing to see suggestions.</span>
          <input role="textbox" aria-label="Tags" value={tagsInput} onChange={event => { setTagsInput(event.target.value); setSuggestionsVisible(true); }} />
        </label>
        {suggestionsVisible && tagsInput.trim() && (
          <Region label="Suggestions" className="suggestions-panel">
            <h3>Suggestions</h3>
            {suggestions.map(tag => <button type="button" className="tag" key={tag.name} onClick={() => setTagsInput(current => current.trim() ? `${current.replace(/,\s*$/, "")},${tag.name}` : tag.name)}>{tag.name}</button>)}
          </Region>
        )}
        {errors.length > 0 && <div role="alert" className="error">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <button type="button" className="primary-button" disabled={posting} onClick={post}>Post Your Question</button>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function EditQuestionPage({ data, navigate, questionId }: { data: AppData; navigate: Navigate; questionId: string }) {
  const question = data.questions.find(item => item.id === questionId);
  const [title, setTitle] = useState(question?.title ?? "");
  const [body, setBody] = useState(question?.body ?? "");
  const [tags, setTags] = useState(question?.tags.join(",") ?? "");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!question) return <div className="empty-panel">Question not found.</div>;
  if (data.currentUser?.id !== question.authorId) return <div className="empty-panel">Only the question owner can edit it.</div>;
  const save = async () => {
    setSaving(true); setError("");
    try { await callApi(`/api/questions/${question.id}`, "PATCH", { title, body, tags, editSummary: summary }); navigate(`/questions/${question.id}`); }
    catch (err) { setError((err as Error).message); setSaving(false); }
  };
  return (
    <div className="content-grid">
      <MainNav route={{ path: `/questions/${questionId}/edit`, query: new URLSearchParams() }} navigate={navigate} />
      <main className="main-column edit-question-page">
        <div className="editor-heading"><h1>Edit question</h1><span>Required fields *</span></div>
        <div className="edit-layout">
          <div>
            <label>Title<input role="textbox" aria-label="Title" value={title} onChange={event => setTitle(event.target.value)} /></label>
            <label>Body
              <div className="editor-toolbar"><button type="button" onClick={() => setBody(value => value + "**bold**")}>Bold</button><button type="button" onClick={() => setBody(value => value + "*italic*")}>Italic</button><button type="button" onClick={() => setBody(value => value + "`code`")}>Code</button></div>
              <textarea role="textbox" aria-label="Body" value={body} onChange={event => setBody(event.target.value)} />
            </label>
            <Region label="Preview" className="preview-panel"><h2>Preview</h2><Markdown text={body} /></Region>
            <label>Tags<input role="textbox" aria-label="Tags" value={tags} onChange={event => setTags(event.target.value)} /></label>
            <label>Edit Summary<input role="textbox" aria-label="Edit Summary" value={summary} onChange={event => setSummary(event.target.value)} placeholder="Briefly explain your changes" /></label>
            <label>Rev<select aria-label="Rev"><option>Current revision</option>{question.revisions.map((revision, index) => <option key={revision.id}>Revision {question.revisions.length - index}</option>)}</select></label>
            {error && <p role="alert" className="error">{error}</p>}
            <div className="form-actions"><button type="button" className="primary-button" disabled={saving} onClick={save}>Save edits</button><button type="button" onClick={() => navigate(`/questions/${question.id}`)}>Cancel</button></div>
          </div>
          <Region label="How to Edit" className="how-to-edit">
            <h2>How to Edit</h2>
            <ul><li>Correct minor typos or mistakes</li><li>Clarify meaning without changing it</li><li>Add related resources or links</li><li>Always respect the author's intent</li><li>Don't use edits to reply to the author</li></ul>
          </Region>
        </div>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

function LoginPage({ data, navigate }: { data: AppData; navigate: Navigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const next: string[] = [];
    if (!email.trim()) next.push("Email cannot be empty");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.push("The email is not a valid email address");
    if (!password) next.push("Password cannot be empty");
    setErrors(next);
    if (next.length) return;
    setSubmitting(true);
    try { await callApi(`/api/auth/login`, "POST", { email, password }); navigate("/"); }
    catch (err) { setErrors([(err as Error).message]); setSubmitting(false); }
  };
  return (
    <div className="auth-page">
      <Region label="Log in" className="auth-card">
        <h1 className="auth-logo">stack<span>overflow</span></h1>
        <h2>Log in</h2>
        <label>Email<input role="textbox" aria-label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password
          <span className="password-wrap">
            <input role="textbox" aria-label="Password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide password" : "Show password"}</button>
          </span>
        </label>
        <div className="auth-links"><button type="button">Forgot password?</button></div>
        {errors.length > 0 && <div role="alert" className="error">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <button type="button" className="primary-button wide" disabled={submitting} onClick={submit}>Log in</button>
        <p className="switch-form">Don't have an account? <button type="button" onClick={() => navigate("/signup")}>Sign up</button></p>
      </Region>
      {!data.currentUser && <p className="auth-note">Are you an employer? Sign up on Talent</p>}
    </div>
  );
}

function SignupPage({ navigate }: { navigate: Navigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const next: string[] = [];
    if (!email.trim()) next.push("Email cannot be empty");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.push("The email is not a valid email address");
    if (!password) next.push("Password cannot be empty");
    else if (password.length < 8) next.push("Password must be at least 8 characters");
    setErrors(next);
    if (next.length) return;
    setSubmitting(true);
    try { await callApi(`/api/auth/register`, "POST", { email, password }); navigate("/"); }
    catch (err) { setErrors([(err as Error).message]); setSubmitting(false); }
  };
  return (
    <div className="auth-page">
      <Region label="Sign up" className="auth-card signup-card">
        <h1 className="auth-logo">stack<span>overflow</span></h1>
        <h2>Join Stack Overflow</h2>
        <p className="consent">By clicking "Sign up", you agree to our <a href="#terms">terms of service</a> and acknowledge you have read our <a href="#privacy">privacy policy</a>.</p>
        <label>Email<input role="textbox" aria-label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password<input role="textbox" aria-label="Password" type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <p className="field-help">Passwords must contain at least eight characters.</p>
        {errors.length > 0 && <div role="alert" className="error">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <button type="button" className="primary-button wide" disabled={submitting} onClick={submit}>Sign up</button>
        <p className="switch-form">Already have an account? <button type="button" onClick={() => navigate("/login")}>Log in</button></p>
      </Region>
    </div>
  );
}

function SearchPage({ data, navigate, query }: { data: AppData; navigate: Navigate; query: string }) {
  const term = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    return data.questions.filter(question => (question.title + " " + question.body + " " + question.tags.join(" ")).toLowerCase().includes(term))
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === term ? 2 : a.title.toLowerCase().includes(term) ? 1 : 0;
        const bExact = b.title.toLowerCase() === term ? 2 : b.title.toLowerCase().includes(term) ? 1 : 0;
        return bExact - aExact || b.score - a.score;
      });
  }, [data.questions, term]);
  return (
    <div className="content-grid">
      <MainNav route={{ path: "/search", query: new URLSearchParams({ q: query }) }} navigate={navigate} />
      <main className="main-column">
        <Region label="Search results" className="search-results">
          <h1>Search results</h1>
          <p>{results.length} results for <strong>{query}</strong></p>
          {results.length === 0 ? <div className="empty-panel">No questions matched your search.</div> : results.map(question => <QuestionSummary key={question.id} question={question} data={data} navigate={navigate} />)}
        </Region>
      </main>
      <RightRail data={data} navigate={navigate} />
    </div>
  );
}

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [route, setRoute] = useState<Route>(parseRoute());
  const [loadError, setLoadError] = useState("");
  const navigate: Navigate = (path) => {
    window.history.pushState({}, "", path);
    setRoute(parseRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const call: CallApi = async (path, method = "GET", body) => {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Request failed");
    setData(payload as AppData);
    return payload as AppData;
  };
  callApi = call;
  useEffect(() => {
    call("/api/state").catch(error => setLoadError((error as Error).message));
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    const match = route.path.match(/^\/questions\/([^/]+)$/);
    if (match && data) call(`/api/questions/${match[1]}`).catch(() => undefined);
  }, [route.path]);
  if (!data) return <div className="loading-screen">{loadError ? <p role="alert">{loadError}</p> : "Loading Stack Overflow…"}</div>;
  const userId = route.path.match(/^\/users\/([^/]+)(?:\/edit)?$/)?.[1];
  const questionId = route.path.match(/^\/questions\/([^/]+)(?:\/edit)?$/)?.[1];
  let page: React.ReactNode;
  if (route.path === "/") page = <HomePage data={data} navigate={navigate} />;
  else if (route.path === "/questions") page = <QuestionsPage data={data} navigate={navigate} />;
  else if (route.path === "/tags") page = <TagsPage data={data} navigate={navigate} />;
  else if (route.path.startsWith("/tags/")) page = <TagDetailPage data={data} navigate={navigate} tagName={decodeURIComponent(route.path.slice("/tags/".length))} />;
  else if (route.path === "/users") page = <UsersPage data={data} navigate={navigate} />;
  else if (route.path.endsWith("/edit") && userId) page = <EditProfilePage data={data} navigate={navigate} userId={userId} />;
  else if (userId) page = <ProfilePage key={userId} data={data} navigate={navigate} userId={userId} />;
  else if (route.path === "/ask") page = <AskQuestionPage data={data} navigate={navigate} />;
  else if (route.path.endsWith("/edit") && questionId) page = <EditQuestionPage key={questionId} data={data} navigate={navigate} questionId={questionId} />;
  else if (questionId) page = <QuestionDetailPage key={questionId} data={data} navigate={navigate} questionId={questionId} />;
  else if (route.path === "/login") page = <LoginPage data={data} navigate={navigate} />;
  else if (route.path === "/signup") page = <SignupPage navigate={navigate} />;
  else if (route.path === "/search") page = <SearchPage data={data} navigate={navigate} query={route.query.get("q") ?? ""} />;
  else page = <HomePage data={data} navigate={navigate} />;
  return (
    <div className="app">
      <Header data={data} navigate={navigate} route={route} />
      {page}
      <footer className="footer">
        <div className="footer-inner">
          <div><h3>STACK OVERFLOW</h3><a href="#questions">Questions</a><a href="#help">Help</a><a href="#chat">Chat</a></div>
          <div><h3>BUSINESS</h3><a href="#internal">Stack Internal</a><a href="#ads">Stack Ads</a></div>
          <div><h3>COMPANY</h3><a href="#about">About</a><a href="#press">Press</a><a href="#work">Work Here</a><a href="#legal">Legal</a><a href="#privacy-policy">Privacy Policy</a></div>
          <div><h3>STACK EXCHANGE NETWORK</h3><a href="#technology">Technology</a><a href="#culture">Culture &amp; recreation</a><a href="#science">Science</a><a href="#api">API</a></div>
        </div>
        <p>Site design / logo © 2026 Stack Exchange Inc; user contributions licensed under CC BY-SA.</p>
      </footer>
    </div>
  );
}
