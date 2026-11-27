"use strict";

// package.json의 CommonJS 설정에 맞춰 Express와 경로 도구를 불러옵니다.
const express = require("express");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT 환경변수는 1~65535 사이의 정수여야 합니다.");
}

app.disable("x-powered-by");

// JSON 요청 본문을 JavaScript 값으로 변환합니다. 라우트보다 먼저 설정합니다.
app.use(express.json({ limit: "100kb" }));

// 서버 상태 확인용 API입니다. AI API나 데이터베이스는 연결하지 않습니다.
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

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`포트 ${port}이 이미 사용 중입니다. 다른 PORT 값을 지정해 주세요.`);
  } else {
    console.error("서버를 시작하지 못했습니다:", error.message);
  }
  process.exitCode = 1;
});
