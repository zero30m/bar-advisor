import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const dir = mkdtempSync(path.join(tmpdir(), "bar-advisor-test-"));
const port = 14317;
const start = () =>
  spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: path.join(dir, "test.sqlite"),
      DISABLE_JOBS: "1",
      CHATANYWHERE_API_KEY: "",
    },
    stdio: "pipe",
  });
async function ready(p) {
  await new Promise((resolve, reject) => {
    p.stdout.on("data", (d) => {
      if (String(d).includes("http://")) resolve();
    });
    p.on("error", reject);
    p.on("exit", (c) => {
      if (c) reject(Error("server exit " + c));
    });
  });
}
const req = async (p, method = "GET", data) => {
  const r = await fetch(`http://127.0.0.1:${port}${p}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: r.status, body: await r.json() };
};
const stop = (p) =>
  p.exitCode !== null || p.signalCode !== null ? Promise.resolve() : new Promise((r) => {
    p.once("exit", r);
    p.kill();
  });
test("账单增改、持久化、删除；输入校验与私有文件隔离", async () => {
  let p = start();
  try {
    await ready(p);
    const date = "2026-01-02";
    let b = { date, income: 123450, expense: 23450, note: "必要测试" };
    assert.equal((await req("/api/bills", "PUT", b)).status, 200);
    assert.equal((await req("/api/state")).body.bills[0].income, 123450);
    b.expense = 34500;
    await req("/api/bills", "PUT", b);
    await stop(p);
    p = start();
    await ready(p);
    assert.equal((await req("/api/state")).body.bills[0].expense, 34500);
    assert.equal(
      (await req("/api/bills", "PUT", { ...b, date: "2026-02-30" })).status,
      400,
    );
    assert.equal(
      (await req("/api/bills", "PUT", { ...b, income: -1 })).status,
      400,
    );
    assert.equal((await req("/private/knowledge.txt")).status, 404);
    assert.equal((await req("/.env")).status, 404);
    const r = await fetch(`http://127.0.0.1:${port}/api/bills`, {
      method: "DELETE",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date }),
    });
    assert.equal(r.status, 403);
    await req("/api/bills", "DELETE", { date });
    assert.equal((await req("/api/state")).body.bills.length, 0);
  } finally {
    await stop(p);
    rmSync(dir, { recursive: true, force: true });
  }
});
