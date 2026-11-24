import type Database from "better-sqlite3";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const APP_NOW = process.env.APP_FIXED_TIME ?? "2026-07-21T12:02:00Z";
export const FALLBACK_TIME = "2026-07-15T12:00:00Z";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  fullName: string;
  location: string;
  title: string;
  about: string;
  website: string;
  x: string;
  github: string;
  reputation: number;
  verified: boolean;
  watchedTags: string[];
  filters: SavedFilter[];
  reputationHistory: ReputationEntry[];
  privateVotes: VoteEntry[];
  responses: ResponseEntry[];
  earnedBadges: string[];
  lastProfileUpdateAt?: string;
}

export interface SavedFilter {
  id: string;
  title: string;
  unanswered: boolean;
  sort: string;
  tags: string;
}

export interface ReputationEntry { reason: string; change: number; post: string; time: string; }
export interface VoteEntry { action: string; post: string; time: string; }
export interface ResponseEntry { body: string; question: string; }

export interface CommentReply {
  id: string;
  body: string;
  authorId: string;
  posted: string;
  mention?: string;
}
export interface Comment {
  id: string;
  body: string;
  authorId: string;
  posted: string;
  edited: boolean;
  upvotes: number;
  voters: string[];
  replies: CommentReply[];
  deleted?: boolean;
}
export interface Revision { id: string; summary: string; body: string; previousBody?: string; time: string; authorId: string; title?: string; previousTitle?: string; tags?: string[]; previousTags?: string[]; }
export interface Answer {
  id: string;
  body: string;
  authorId: string;
  score: number;
  accepted: boolean;
  created: string;
  modified: string;
  edited: boolean;
  votes: Record<string, number>;
  comments: Comment[];
  revisions: Revision[];
  deleted?: boolean;
}
export interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  score: number;
  views: number;
  asked: string;
  modified: string;
  edited: boolean;
  votes: Record<string, number>;
  answers: Answer[];
  comments: Comment[];
  revisions: Revision[];
  initialSort?: string;
  deleted?: boolean;
}
export interface TagDef { name: string; description: string; baseline: number; }
export interface BadgeDef { name: string; category: string; description: string; earn_count: number; }
export interface AppState {
  users: User[];
  questions: Question[];
  tags: TagDef[];
  badges: BadgeDef[];
  sessions: Record<string, string>;
}

const retryBody = "I am building a Node.js service and need a safe retry pattern for idempotent HTTP requests. I have already tried a simple timeout wrapper, but I need guidance on exponential backoff, duplicate suppression, timeout handling, and observability across intermittent failures in production. What patterns should I use and how should I structure retries so the client remains correct, debuggable, and safe for repeated delivery attempts?";
const standardAnswer = "Use exponential backoff together with an idempotency key so duplicate requests can be safely retried without creating duplicate side effects in downstream services.";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [kind, salt, digest] = encoded.split("$");
  if (kind !== "scrypt" || !salt || !digest) return false;
  try {
    const actual = scryptSync(password, Buffer.from(salt, "hex"), 64);
    const expected = Buffer.from(digest, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function makePasswordHash(password: string): string { return hashPassword(password); }

function user(id: string, email: string, displayName: string, extra: Partial<User> = {}): User {
  return {
    id, email, passwordHash: hashPassword("Password123!"), displayName,
    fullName: "", location: "", title: "", about: "", website: "", x: "", github: "",
    reputation: 100, verified: true, watchedTags: [], filters: [], reputationHistory: [],
    privateVotes: [], responses: [], earnedBadges: [], ...extra,
  };
}

function comment(id: string, body: string, authorId: string, posted: string, extra: Partial<Comment> = {}): Comment {
  return { id, body, authorId, posted, edited: false, upvotes: 0, voters: [], replies: [], ...extra };
}

function answer(id: string, body: string, authorId: string, score: number, modified: string, accepted = false, extra: Partial<Answer> = {}): Answer {
  return { id, body, authorId, score, accepted, created: modified, modified, edited: false, votes: {}, comments: [], revisions: [], ...extra };
}

export function seedState(): AppState {
  const users: User[] = [
    user("helpful_user", "helpful_user@example.com", "Helpful User", { earnedBadges: ["Teacher"], reputation: 100 }),
    user("stack_user", "stack_user@example.com", "Stack User"),
    user("activity_user", "activity_user@example.com", "Stack User", {
      reputationHistory: [
        { reason: "answer upvoted", change: 10, post: "How does React state update?", time: "2026-07-20T12:00:00Z" },
        { reason: "question upvoted", change: 5, post: "SO Activity Owned Question", time: "2026-07-19T12:00:00Z" },
      ],
      privateVotes: [{ action: "upvote", post: "How can I safely retry an idempotent HTTP request in Node.js?", time: "2026-07-18T12:00:00Z" }],
      responses: [{ body: "Check the state updater callback.", question: "How does React state update?" }],
    }),
    user("profile_editor", "profile_editor@example.com", "Stack User", {
      fullName: "Existing User", location: "Beijing", title: "Developer", about: "Existing biography",
      website: "https://example.org", x: "https://x.com/example", github: "https://github.com/existing",
    }),
    user("badge_user", "badge_user@example.com", "Stack User", { earnedBadges: ["Teacher"] }),
    user("question_creator", "question_creator@example.com", "Stack User"),
    user("question_editor", "question_editor@example.com", "Stack User"),
    user("question_deleter", "question_deleter@example.com", "Stack User"),
    user("question_upvoter", "question_upvoter@example.com", "Stack User"),
    user("question_downvoter", "question_downvoter@example.com", "Stack User"),
    user("question_comment_user", "question_comment_user@example.com", "Stack User"),
    user("comment_edit_user", "comment_edit_user@example.com", "Stack User"),
    user("comment_vote_user", "comment_vote_user@example.com", "Stack User"),
    user("comment_delete_user", "comment_delete_user@example.com", "Stack User"),
    user("comment_reply_user", "comment_reply_user@example.com", "Stack User"),
    user("answer_submitter", "answer_submitter@example.com", "Stack User"),
    user("answer_voter", "answer_voter@example.com", "Stack User"),
    user("answer_accept_owner", "answer_accept_owner@example.com", "Stack User"),
    user("answer_edit_user", "answer_edit_user@example.com", "Stack User"),
    user("answer_validation_user", "answer_validation_user@example.com", "Stack User"),
    user("answer_delete_user", "answer_delete_user@example.com", "Stack User"),
    user("answer_comment_user", "answer_comment_user@example.com", "Stack User"),
    user("tag_watcher", "tag_watcher@example.com", "Stack User"),
    user("filter_user", "filter_user@example.com", "Stack User"),
  ];

  const historical = (id: string, title: string, tags: string[], extra: Partial<Question>): Question => ({
    id, title, body: retryBody, tags, authorId: "helpful_user", score: 0, views: 0,
    asked: FALLBACK_TIME, modified: FALLBACK_TIME, edited: false, votes: {}, answers: [], comments: [], revisions: [], ...extra,
  });

  const questions: Question[] = [
    historical("q_retry", "How can I safely retry an idempotent HTTP request in Node.js?", ["node.js", "http", "retry"], {
      score: 7, views: 42, asked: "2026-07-01T12:00:00Z", modified: "2026-07-10T12:00:00Z",
    }),
    historical("q_upvote", "SO Upvote Question", ["http"], { score: 7, views: 12 }),
    historical("q_downvote", "SO Downvote Question", ["http"], { score: 3, views: 8 }),
    historical("q_react", "How does React state update?", ["javascript"], {
      body: "React state updates and rendering examples.", score: 2, views: 18,
      asked: "2026-07-20T10:00:00Z", modified: "2026-07-20T11:00:00Z",
      answers: [answer("a_react_activity", "Batch state updates safely.", "activity_user", 5, "2026-07-20T11:00:00Z", true)],
    }),
    historical("q_py_recent", "SO Python Unanswered Recent", ["python"], {
      score: 0, views: 5, asked: "2026-07-20T12:00:00Z", modified: "2026-07-20T12:00:00Z",
    }),
    historical("q_py_active", "SO Python Answered Active", ["python"], {
      score: 4, views: 10, asked: "2026-07-19T12:00:00Z", modified: "2026-07-21T11:00:00Z",
      answers: [answer("a_py_helpful", standardAnswer, "helpful_user", 1, "2026-07-21T11:00:00Z")],
    }),
    historical("q_answer_sort", "SO Answer Sorting Question", ["http"], {
      score: 1, views: 10, initialSort: "Date modified",
      answers: [
        answer("a_high_score", "Highest score answer: use bounded retries.", "helpful_user", 9, "2026-07-18T12:00:00Z"),
        answer("a_recent", "Recent answer: log each retry attempt.", "stack_user", 2, "2026-07-20T12:00:00Z"),
      ],
    }),
    historical("q_expanded_comments", "SO Expanded Comment Question", ["http"], {
      score: 0, views: 7,
      comments: [1,2,3,4,5,6,7].map(n => comment(`c_expanded_${n}`, `Retry discussion comment ${n}`, "helpful_user", `2026-07-20T12:0${n}:00Z`)),
    }),
    historical("q_comment_edit", "SO Comment Edit Question", ["http"], {
      score: 0, views: 2,
      comments: [comment("c_comment_edit", "Can you share what you tried so far?", "comment_edit_user", "2026-07-21T12:00:00Z")],
    }),
    historical("q_comment_vote", "SO Comment Vote Question", ["http"], {
      score: 0, views: 2,
      comments: [comment("c_comment_vote", "Can you share what you tried so far?", "helpful_user", FALLBACK_TIME, { upvotes: 1, voters: ["stack_user"] })],
    }),
    historical("q_activity_owned", "SO Activity Owned Question", ["javascript"], {
      authorId: "activity_user", score: 3, views: 11, modified: "2026-07-19T12:00:00Z",
      answers: [answer("a_activity_owned", standardAnswer, "helpful_user", 1, "2026-07-19T13:00:00Z")],
    }),
  ];

  return {
    users,
    questions,
    tags: [
      { name: "python", description: "python programming questions", baseline: 20 },
      { name: "javascript", description: "javascript programming questions", baseline: 15 },
      { name: "node.js", description: "node.js programming questions", baseline: 10 },
      { name: "http", description: "http programming questions", baseline: 8 },
      { name: "retry", description: "retry programming questions", baseline: 5 },
    ],
    badges: [
      { name: "Great Answer", category: "Gold", description: "Recognizes a great answer", earn_count: 2 },
      { name: "Teacher", category: "Bronze", description: "Recognizes a helpful first answer", earn_count: 5 },
      { name: "Good Answer", category: "Silver", description: "Recognizes a good answer", earn_count: 3 },
    ],
    sessions: {},
  };
}

export function readState(connection: Database.Database): AppState {
  const row = connection.prepare("SELECT document FROM app_state WHERE id = 1").get() as { document: string } | undefined;
  if (!row) {
    const initial = seedState();
    connection.prepare("INSERT INTO app_state (id, document, updated_at) VALUES (1, ?, ?)").run(JSON.stringify(initial), APP_NOW);
    return initial;
  }
  return JSON.parse(row.document) as AppState;
}

export function writeState(connection: Database.Database, state: AppState): void {
  connection.prepare("UPDATE app_state SET document = ?, updated_at = ? WHERE id = 1").run(JSON.stringify(state), APP_NOW);
}

export function safeUser(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function getCurrentUser(state: AppState, headers: Record<string, string | undefined>): User | undefined {
  const cookie = headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)arc_session=([^;]+)/);
  if (!match) return undefined;
  const userId = state.sessions[decodeURIComponent(match[1])];
  return userId ? state.users.find(u => u.id === userId) : undefined;
}

export function publicTag(state: AppState, tag: TagDef) {
  const count = state.questions.filter(q => !q.deleted && q.tags.includes(tag.name)).length;
  return { name: tag.name, description: tag.description, question_count: tag.baseline + count };
}

export function publicState(state: AppState, currentUser?: User) {
  return {
    currentUser: currentUser ? safeUser(currentUser) : null,
    users: state.users.map(safeUser),
    questions: state.questions.filter(q => !q.deleted).map(q => ({
      ...q,
      answers: q.answers.filter(a => !a.deleted),
      comments: q.comments.filter(c => !c.deleted),
    })),
    tags: state.tags.map(t => publicTag(state, t)).sort((a, b) => b.question_count - a.question_count || a.name.localeCompare(b.name)),
    badges: state.badges,
    appNow: APP_NOW,
  };
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function nowIso(): string { return APP_NOW; }

export function findQuestion(state: AppState, id: string): Question | undefined {
  return state.questions.find(q => q.id === id && !q.deleted);
}

export function findAnswer(state: AppState, id: string): { question: Question; answer: Answer } | undefined {
  for (const question of state.questions) {
    if (question.deleted) continue;
    const answer = question.answers.find(a => a.id === id && !a.deleted);
    if (answer) return { question, answer };
  }
  return undefined;
}

export function findComment(state: AppState, id: string): { question: Question; answer?: Answer; comment: Comment } | undefined {
  for (const question of state.questions) {
    if (question.deleted) continue;
    const qc = question.comments.find(c => c.id === id && !c.deleted);
    if (qc) return { question, comment: qc };
    for (const answer of question.answers) {
      if (answer.deleted) continue;
      const ac = answer.comments.find(c => c.id === id && !c.deleted);
      if (ac) return { question, answer, comment: ac };
    }
  }
  return undefined;
}
