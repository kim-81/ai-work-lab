"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

// 실행한 폴더가 달라도 항상 프로젝트 내부의 같은 DB를 사용합니다.
const dataDirectory = path.join(__dirname, "data");
const databasePath = path.join(dataDirectory, "ai-work-lab.sqlite");
fs.mkdirSync(dataDirectory, { recursive: true });

let db;
try {
  // 파일이 없으면 생성하고, 이미 있으면 기존 데이터를 그대로 엽니다.
  db = new Database(databasePath);
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  // STRICT와 CHECK로 자료형·양의 사용자 번호·빈 문자열을 제한합니다.
  // created_at은 UTC 시각이며 화면 표시 시 한국 시간 등으로 변환할 수 있습니다.
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 CHECK (user_id > 0),
      title TEXT NOT NULL CHECK (length(trim(title, char(9) || char(10) || char(13) || ' ')) > 0),
      body TEXT NOT NULL CHECK (length(trim(body, char(9) || char(10) || char(13) || ' ')) > 0),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
  `);
} catch (error) {
  if (db && db.open) db.close();
  throw new Error(`SQLite 초기화에 실패했습니다. data 폴더의 권한과 DB 파일 상태를 확인해 주세요: ${error.message}`, { cause: error });
}

// 향후 저장·조회 API에서 이 연결을 재사용합니다.
module.exports = db;
