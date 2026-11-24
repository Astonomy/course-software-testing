import type Database from "better-sqlite3";
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import {
  APP_NOW, findAnswer, findComment, findQuestion, makeId, makePasswordHash, nowIso,
  publicState, readState, safeUser, verifyPassword, writeState, getCurrentUser,
  type AppState, type Answer, type Comment, type Question, type User,
} from "./state.js";

const COOKIE = "arc_session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionUser(state: AppState, req: Request): User | undefined {
  return getCurrentUser(state, req.headers as Record<string, string | undefined>);
}

function sendState(res: Response, state: AppState, user?: User, extra: Record<string, unknown> = {}) {
  res.json({ ...publicState(state, user), ...extra });
}

function setSession(res: Response, state: AppState, user: User): string {
  const token = randomBytes(24).toString("hex");
  state.sessions[token] = user.id;
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  return token;
}

function clearSession(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function fail(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

function cleanTags(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(String).map(v => v.trim().toLowerCase()).filter(Boolean))];
  return [...new Set(String(value ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean))];
}

function isCommentEditable(comment: Comment): boolean {
  const posted = Date.parse(comment.posted);
  const current = Date.parse(APP_NOW);
  return Number.isFinite(posted) && current - posted <= 5 * 60 * 1000 && current >= posted;
}

export function registerApis(app: Express, connection: Database.Database): void {
  app.get("/api/state", (req, res) => {
    const state = readState(connection);
    sendState(res, state, sessionUser(state, req));
  });

  app.post("/api/auth/login", (req, res) => {
    const state = readState(connection);
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email) return fail(res, 400, "Email cannot be empty");
    if (!password) return fail(res, 400, "Password cannot be empty");
    if (!EMAIL_RE.test(email)) return fail(res, 400, "The email is not a valid email address");
    const user = state.users.find(u => u.email.toLowerCase() === email);
    if (!user) return fail(res, 400, "No account found with this email");
    if (!verifyPassword(password, user.passwordHash)) return fail(res, 400, "The email or password does not match any account");
    setSession(res, state, user);
    writeState(connection, state);
    sendState(res, state, user);
  });

  app.post("/api/auth/register", (req, res) => {
    const state = readState(connection);
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email) return fail(res, 400, "Email cannot be empty");
    if (!EMAIL_RE.test(email)) return fail(res, 400, "The email is not a valid email address");
    if (password.length < 8) return fail(res, 400, "Password must be at least 8 characters");
    if (state.users.some(u => u.email.toLowerCase() === email)) return fail(res, 400, "Email is already in use");
    const newUser: User = {
      id: makeId("user"), email, passwordHash: makePasswordHash(password), displayName: "", fullName: "",
      location: "", title: "", about: "", website: "", x: "", github: "", reputation: 1, verified: true,
      watchedTags: [], filters: [], reputationHistory: [], privateVotes: [], responses: [], earnedBadges: [],
    };
    state.users.push(newUser);
    setSession(res, state, newUser);
    writeState(connection, state);
    sendState(res, state, newUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    const state = readState(connection);
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|;\s*)arc_session=([^;]+)/);
    if (match) delete state.sessions[decodeURIComponent(match[1])];
    writeState(connection, state);
    clearSession(res);
    sendState(res, state);
  });

  app.patch("/api/profile", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    for (const field of ["displayName", "fullName", "location", "title", "about", "website", "x", "github"] as const) {
      if (req.body?.[field] !== undefined) user[field] = String(req.body[field]);
    }
    const normalizeUrl = (value: string) => {
      if (!value.trim()) return "";
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    };
    user.website = normalizeUrl(user.website);
    user.github = normalizeUrl(user.github);
    user.lastProfileUpdateAt = APP_NOW;
    writeState(connection, state);
    sendState(res, state, user, { message: "Profile updated successfully" });
  });

  app.get("/api/questions/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    const question = findQuestion(state, String(req.params.id));
    if (!question) return fail(res, 404, "Question not found");
    question.views += 1;
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.post("/api/questions", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "");
    const tags = cleanTags(req.body?.tags);
    if (title.length < 15) return fail(res, 400, "Title is required (minimum 15 characters)");
    if (body.length < 220) return fail(res, 400, "Question body is required (minimum 220 characters)");
    if (!tags.length) return fail(res, 400, "Please add at least one tag");
    const question: Question = {
      id: makeId("q"), title, body, tags, authorId: user.id, score: 0, views: 1,
      asked: nowIso(), modified: nowIso(), edited: false, votes: {}, answers: [], comments: [], revisions: [],
    };
    state.questions.unshift(question);
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.patch("/api/questions/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const question = findQuestion(state, String(req.params.id));
    if (!question) return fail(res, 404, "Question not found");
    if (question.authorId !== user.id) return fail(res, 403, "Only the owner can edit this question");
    const title = String(req.body?.title ?? question.title).trim();
    const body = String(req.body?.body ?? question.body);
    const tags = req.body?.tags !== undefined ? cleanTags(req.body.tags) : question.tags;
    if (title.length < 15) return fail(res, 400, "Title is required (minimum 15 characters)");
    if (body.length < 220) return fail(res, 400, "Question body is required (minimum 220 characters)");
    const summary = String(req.body?.editSummary ?? "");
    question.revisions.unshift({
      id: makeId("rev"), summary, body, previousBody: question.body, time: nowIso(), authorId: user.id,
      title, previousTitle: question.title, tags, previousTags: question.tags,
    });
    question.title = title;
    question.body = body;
    question.tags = tags;
    question.modified = nowIso();
    question.edited = true;
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.delete("/api/questions/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const question = findQuestion(state, String(req.params.id));
    if (!question) return fail(res, 404, "Question not found");
    if (question.authorId !== user.id) return fail(res, 403, "Only the owner can delete this question");
    question.deleted = true;
    writeState(connection, state);
    sendState(res, state, user);
  });

  app.post("/api/questions/:id/vote", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const question = findQuestion(state, String(req.params.id));
    if (!question) return fail(res, 404, "Question not found");
    const direction = Number(req.body?.direction) === -1 ? -1 : 1;
    const author = state.users.find(u => u.id === question.authorId);
    const existing = question.votes[user.id];
    const undo = (value: number) => {
      question.score -= value;
      if (author) author.reputation -= value > 0 ? 10 : -2;
      delete question.votes[user.id];
    };
    if (existing === direction) undo(existing);
    else {
      if (existing !== undefined) undo(existing);
      question.votes[user.id] = direction;
      question.score += direction;
      if (author) author.reputation += direction > 0 ? 10 : -2;
    }
    writeState(connection, state);
    sendState(res, state, user);
  });

  app.post("/api/questions/:id/answers", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const question = findQuestion(state, String(req.params.id));
    if (!question) return fail(res, 404, "Question not found");
    const body = String(req.body?.body ?? "");
    if (!body.trim()) return fail(res, 400, "Answer cannot be empty");
    const answer: Answer = {
      id: makeId("a"), body, authorId: user.id, score: 0, accepted: false, created: nowIso(), modified: nowIso(),
      edited: false, votes: {}, comments: [], revisions: [],
    };
    question.answers.push(answer);
    question.modified = nowIso();
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.patch("/api/answers/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findAnswer(state, req.params.id);
    if (!found) return fail(res, 404, "Answer not found");
    const { answer, question } = found;
    if (answer.authorId !== user.id) return fail(res, 403, "Only the owner can edit this answer");
    const body = String(req.body?.body ?? "");
    if (!body.trim()) return fail(res, 400, "Body cannot be empty");
    const summary = String(req.body?.editSummary ?? "");
    answer.revisions.unshift({ id: makeId("rev"), summary, body, previousBody: answer.body, time: nowIso(), authorId: user.id });
    answer.body = body;
    answer.edited = true;
    answer.modified = nowIso();
    question.modified = nowIso();
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.delete("/api/answers/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findAnswer(state, req.params.id);
    if (!found) return fail(res, 404, "Answer not found");
    const { answer, question } = found;
    if (answer.authorId !== user.id) return fail(res, 403, "Only the owner can delete this answer");
    if (answer.accepted) return fail(res, 400, "Accepted answers cannot be deleted");
    const author = state.users.find(u => u.id === answer.authorId);
    if (author) {
      for (const direction of Object.values(answer.votes)) author.reputation -= direction > 0 ? 10 : -2;
    }
    answer.deleted = true;
    question.modified = nowIso();
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.post("/api/answers/:id/vote", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findAnswer(state, req.params.id);
    if (!found) return fail(res, 404, "Answer not found");
    const { answer } = found;
    const direction = Number(req.body?.direction) === -1 ? -1 : 1;
    const author = state.users.find(u => u.id === answer.authorId);
    const existing = answer.votes[user.id];
    const undo = (value: number) => {
      answer.score -= value;
      if (author) author.reputation -= value > 0 ? 10 : -2;
      delete answer.votes[user.id];
    };
    if (existing === direction) undo(existing);
    else {
      if (existing !== undefined) undo(existing);
      answer.votes[user.id] = direction;
      answer.score += direction;
      if (author) author.reputation += direction > 0 ? 10 : -2;
    }
    writeState(connection, state);
    sendState(res, state, user);
  });

  app.post("/api/answers/:id/accept", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findAnswer(state, req.params.id);
    if (!found) return fail(res, 404, "Answer not found");
    const { question, answer } = found;
    if (question.authorId !== user.id) return fail(res, 403, "Only the question owner can accept an answer");
    for (const candidate of question.answers) candidate.accepted = false;
    answer.accepted = true;
    question.modified = nowIso();
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  function createComment(req: Request, res: Response, ownerType: "question" | "answer") {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const body = String(req.body?.body ?? "").trim();
    if (!body) return fail(res, 400, "Comment cannot be empty");
    let question: Question | undefined;
    let targetComments: Comment[] | undefined;
    if (ownerType === "question") {
      question = findQuestion(state, String(req.params.id));
      targetComments = question?.comments;
    } else {
      const found = findAnswer(state, String(req.params.id));
      question = found?.question;
      targetComments = found?.answer.comments;
    }
    if (!question || !targetComments) return fail(res, 404, "Post not found");
    targetComments.push({ id: makeId("c"), body, authorId: user.id, posted: nowIso(), edited: false, upvotes: 0, voters: [], replies: [] });
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  }

  app.post("/api/questions/:id/comments", (req, res) => createComment(req, res, "question"));
  app.post("/api/answers/:id/comments", (req, res) => createComment(req, res, "answer"));

  app.patch("/api/comments/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findComment(state, req.params.id);
    if (!found) return fail(res, 404, "Comment not found");
    const { comment, question } = found;
    if (comment.authorId !== user.id) return fail(res, 403, "Only the comment owner can edit this comment");
    if (!isCommentEditable(comment)) return fail(res, 403, "The comment edit window has expired");
    const body = String(req.body?.body ?? "").trim();
    if (!body) return fail(res, 400, "Comment cannot be empty");
    comment.body = body;
    comment.edited = true;
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.delete("/api/comments/:id", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findComment(state, req.params.id);
    if (!found) return fail(res, 404, "Comment not found");
    const { comment, question } = found;
    if (comment.authorId !== user.id) return fail(res, 403, "Only the comment owner can delete this comment");
    comment.deleted = true;
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: question.id });
  });

  app.post("/api/comments/:id/reply", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findComment(state, req.params.id);
    if (!found) return fail(res, 404, "Comment not found");
    const body = String(req.body?.body ?? "").trim();
    if (!body) return fail(res, 400, "Reply cannot be empty");
    const parentAuthor = state.users.find(u => u.id === found.comment.authorId);
    found.comment.replies.push({
      id: makeId("r"), body, authorId: user.id, posted: nowIso(),
      mention: parentAuthor?.displayName || parentAuthor?.email || "",
    });
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: found.question.id });
  });

  app.post("/api/comments/:id/vote", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const found = findComment(state, req.params.id);
    if (!found) return fail(res, 404, "Comment not found");
    const comment = found.comment;
    if (comment.voters.includes(user.id)) {
      comment.voters = comment.voters.filter(id => id !== user.id);
      comment.upvotes = Math.max(0, comment.upvotes - 1);
    } else {
      comment.voters.push(user.id);
      comment.upvotes += 1;
    }
    writeState(connection, state);
    sendState(res, state, user, { focusedQuestionId: found.question.id });
  });

  app.post("/api/tags/:name/watch", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const name = req.params.name;
    if (!state.tags.some(t => t.name === name)) return fail(res, 404, "Tag not found");
    if (user.watchedTags.includes(name)) user.watchedTags = user.watchedTags.filter(t => t !== name);
    else user.watchedTags.push(name);
    writeState(connection, state);
    sendState(res, state, user);
  });

  app.post("/api/filters", (req, res) => {
    const state = readState(connection);
    const user = sessionUser(state, req);
    if (!user) return fail(res, 401, "Authentication required");
    const title = String(req.body?.title ?? "").trim();
    if (!title) return fail(res, 400, "Filter title is required");
    const filter = {
      id: makeId("filter"), title,
      unanswered: Boolean(req.body?.unanswered),
      sort: String(req.body?.sort ?? "Newest"),
      tags: String(req.body?.tags ?? ""),
    };
    user.filters.push(filter);
    writeState(connection, state);
    sendState(res, state, user, { message: "Filter saved" });
  });
}
