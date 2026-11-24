import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { createTestDatabase } from "./support/context.js";

async function withServer(t: test.TestContext) {
  const connection = createTestDatabase(t);
  const server = createApp(connection).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

test("seeded state, login session, and question creation persist through the API", async t => {
  const base = await withServer(t);
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "stack_user@example.com", password: "Password123!" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie?.includes("arc_session="));
  const loginState = await login.json() as { currentUser: { email: string } };
  assert.equal(loginState.currentUser.email, "stack_user@example.com");

  const title = "A sufficiently detailed API integration question";
  const created = await fetch(`${base}/api/questions`, {
    method: "POST", headers: { "content-type": "application/json", cookie: cookie! },
    body: JSON.stringify({ title, body: "x".repeat(240), tags: "node.js,http,retry" }),
  });
  assert.equal(created.status, 200);
  const createdState = await created.json() as { focusedQuestionId: string };
  assert.ok(createdState.focusedQuestionId);

  const state = await fetch(`${base}/api/state`, { headers: { cookie: cookie! } });
  const stateBody = await state.json() as { questions: Array<{ title: string }> };
  assert.ok(stateBody.questions.some(question => question.title === title));
});
