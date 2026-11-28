"use strict";

// package.json의 CommonJS 설정에 맞춰 Express와 경로 도구를 불러옵니다.
const express = require("express");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT 환경변수는 1~65535 사이의 정수여야 합니다.");
}

// 요청을 받기 전에 DB 파일과 기본 테이블을 준비합니다. 기존 API는 유지합니다.
const db = require("./database");

app.disable("x-powered-by");

// JSON 요청 본문을 JavaScript 값으로 변환합니다. 라우트보다 먼저 설정합니다.
app.use(express.json({ limit: "100kb" }));

// 서버 응답 상태만 확인합니다. DB 상태를 검사하는 API는 아닙니다.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "AI WORK LAB API" });
});

app.post("/api/test", (req, res) => {
  // 본문이 없거나 배열·null인 경우에도 안전하게 오류를 반환합니다.
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "userId, title, body를 포함한 JSON 객체를 보내 주세요." });
  }

  const { userId, title, body } = req.body;
  const errors = [];

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    errors.push("userId는 양의 정수여야 합니다.");
  }
  if (typeof title !== "string" || !title.trim()) {
    errors.push("title은 비어 있지 않은 문자열이어야 합니다.");
  }
  if (typeof body !== "string" || !body.trim()) {
    errors.push("body는 비어 있지 않은 문자열이어야 합니다.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "입력값을 확인해 주세요.", details: errors });
  }

  // 데이터베이스에 저장하지 않고 검증한 세 필드만 반환합니다.
  return res.status(201).json({
    message: "POST API 테스트가 성공했습니다.",
    data: { userId, title, body }
  });
});

// SQL의 ? 자리에 값을 바인딩하여 입력을 SQL 명령으로 실행하지 않습니다.
const insertPrompt = db.prepare("INSERT INTO prompts (user_id, title, body) VALUES (?, ?, ?)");
const findPrompt = db.prepare("SELECT id, user_id, title, body, created_at FROM prompts WHERE id = ?");
const listPrompts = db.prepare("SELECT id, user_id, title, body, created_at FROM prompts ORDER BY created_at DESC, id DESC");
const savePrompt = db.transaction((title, body) => {
  const inserted = insertPrompt.run(1, title, body);
  return findPrompt.get(inserted.lastInsertRowid);
});

app.post("/api/prompts", (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "userId, title, body를 포함한 JSON 객체를 보내 주세요." });
  }
  const { userId, title, body } = req.body;
  const errors = [];
  // 인증 기능이 없는 교육 단계에서는 숫자 1만 허용합니다.
  if (!Number.isSafeInteger(userId) || userId !== 1) errors.push("userId는 실습용 숫자 1이어야 합니다.");
  if (typeof title !== "string" || !title.trim()) errors.push("title은 비어 있지 않은 문자열이어야 합니다.");
  if (typeof body !== "string" || !body.trim()) errors.push("body는 비어 있지 않은 문자열이어야 합니다.");
  if (errors.length) return res.status(400).json({ error: "입력값을 확인해 주세요.", details: errors });

  try {
    const prompt = savePrompt(title, body);
    return res.status(201).json({ message: "프롬프트를 저장했습니다.", data: prompt });
  } catch (error) {
    console.error("프롬프트 저장 실패:", error.code || error.name);
    return res.status(500).json({ error: "프롬프트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
});

app.get("/api/prompts", (req, res) => {
  try {
    // 생성 시각이 같으면 더 큰 ID를 먼저 표시합니다. 빈 테이블은 data: []입니다.
    return res.status(200).json({ data: listPrompts.all() });
  } catch (error) {
    console.error("프롬프트 조회 실패:", error.code || error.name);
    return res.status(500).json({ error: "프롬프트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
});

// JSON 파싱 오류도 HTML 오류 페이지 대신 이해하기 쉬운 JSON으로 안내합니다.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON 형식이 올바르지 않습니다." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "요청 본문은 100KB 이하여야 합니다." });
  }
  return next(error);
});

// 필요한 파일만 제공해 .git, node_modules, 서버 설정 파일의 노출을 방지합니다.
// 파일을 이동하지 않으므로 기존 GitHub Pages 구조도 그대로 유지됩니다.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "script.js"));
});

// 실습용 서버는 현재 컴퓨터에서만 접속할 수 있도록 제한합니다.
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`AI WORK LAB: http://localhost:${port}`);
  console.log(`상태 확인: http://localhost:${port}/api/health`);
});

// 서버를 종료한 뒤 DB 연결도 정리합니다.
server.on("close", () => { if (db.open) db.close(); });
function shutdown() { server.close(); }
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

server.on("error", (error) => {
  if (db.open) db.close();
  if (error.code === "EADDRINUSE") {
    console.error(`포트 ${port}이 이미 사용 중입니다. 다른 PORT 값을 지정해 주세요.`);
  } else {
    console.error("서버를 시작하지 못했습니다:", error.message);
  }
  process.exitCode = 1;
});
