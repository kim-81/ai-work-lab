"use strict";

const form = document.querySelector("#document-form");
const purposeInput = document.querySelector("#purpose");
const contentInput = document.querySelector("#content");
const typeInputs = Array.from(form.querySelectorAll('[name="documentType"]'));
const styleInputs = Array.from(form.querySelectorAll('[name="writingStyle"]'));
const result = document.querySelector("#result");
const statusMessage = document.querySelector("#form-status");
const promptResult = document.querySelector("#prompt-result");
const promptOutput = document.querySelector("#prompt-output");
const copyStatus = document.querySelector("#copy-status");
const copyButton = document.querySelector("#copy-prompt");
let promptRevision = 0;
let generatedSnapshot = null;
const saveButton = document.querySelector("#save-prompt");
const saveStatus = document.querySelector("#save-status");
// 브라우저가 라디오 선택을 바꾼 뒤에도 취소 시 복원할 수 있도록 기억합니다.
let activeDocumentType = form.querySelector('[name="documentType"]:checked');

// 문서 유형마다 필요한 구성과 표현을 다르게 안내합니다.
const promptGuides = {
  "업무보고서 작성": "핵심 실적, 문제점, 대응방향 순서로 업무보고서를 작성해 주세요. 핵심 실적은 간결하게 정리하고 문제점과 대응방향을 구분해 주세요.",
  "비즈니스 이메일 작성": "수신 목적과 핵심 메시지가 분명한 비즈니스 이메일을 작성해 주세요. 제목, 인사말, 본문, 맺음말을 포함하고 정중한 표현을 사용해 주세요.",
  "광고 및 홍보 문구 작성": "고객 관심을 끄는 광고 및 홍보 문구를 작성해 주세요. 상품 특징과 고객에게 주는 이점을 설명하고 명확한 행동 유도 문구를 포함해 주세요.",
  "회의록 요약": "회의 내용을 주요 논의사항, 결정사항, 후속 조치로 구분해 요약해 주세요. 담당자와 일정은 입력에 있는 경우에만 기재해 주세요.",
  "고객 상담 답변 작성": "고객의 상황에 대한 공감, 문제 설명, 해결방안 순서로 고객 상담 답변을 작성해 주세요. 친절하고 이해하기 쉬운 표현을 사용하고 확인되지 않은 보상이나 처리 일정은 약속하지 마세요."
};

// 스타일은 표현과 구성에만 적용하고, 문서별 필수 지침은 그대로 유지합니다.
const styleGuides = {
  "정중한": "공손한 존댓말과 상대방을 배려하는 표현을 사용해 주세요.",
  "간결한": "핵심 정보를 먼저 전달하고 불필요한 표현과 반복을 최소화해 주세요.",
  "전문적인": "객관적인 표현과 정확한 업무 용어를 사용하고 논리적으로 구성해 주세요."
};

function updateStyleSelection() {
  styleInputs.forEach((input) => {
    input.closest(".style-option").classList.toggle("is-selected", input.checked);
  });
}
updateStyleSelection();

function showError(id, message, inputs) {
  const error = document.getElementById(id);
  error.textContent = message;
  error.hidden = !message;
  inputs.forEach((input) => {
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  });
}

// 두 기능이 같은 필수값 검증을 사용합니다. 공백만 입력해도 빈 값입니다.
function readValidInput() {
  const selectedType = form.querySelector('[name="documentType"]:checked');
  const selectedStyle = form.querySelector('[name="writingStyle"]:checked');
  const purpose = purposeInput.value.trim();
  const content = contentInput.value.trim();
  showError("type-error", selectedType ? "" : "문서 유형을 선택해 주세요.", typeInputs);
  showError("style-error", selectedStyle ? "" : "작성 스타일을 선택해 주세요.", styleInputs);
  showError("purpose-error", purpose ? "" : "문서 작성 목적을 입력해 주세요.", [purposeInput]);
  showError("content-error", content ? "" : "핵심 내용을 입력해 주세요.", [contentInput]);
  if (!selectedType || !selectedStyle || !purpose || !content) {
    result.hidden = true;
    promptResult.hidden = true;
    promptOutput.value = "";
    generatedSnapshot = null;
    saveButton.disabled = true;
    saveStatus.textContent = "";
    promptRevision++;
    statusMessage.textContent = "필수 입력 항목을 확인해 주세요.";
    const firstInvalid = !selectedType ? typeInputs[0] : !selectedStyle ? styleInputs[0] : !purpose ? purposeInput : contentInput;
    firstInvalid.focus();
    return null;
  }
  return { type: selectedType.value, style: selectedStyle.value, purpose, content };
}

// 입력 변경을 확정한 경우에만 결과와 복사 안내를 초기화합니다.
function clearResults() {
  generatedSnapshot = null;
  saveButton.disabled = true;
  saveStatus.textContent = "";
  result.hidden = true;
  ["#result-type", "#result-style", "#result-purpose", "#result-content"].forEach((selector) => {
    document.querySelector(selector).textContent = "";
  });
  promptResult.hidden = true;
  promptOutput.value = "";
  promptRevision++;
  copyStatus.textContent = "";
  statusMessage.textContent = "";
}

form.addEventListener("input", (event) => {
  if (event.target.name === "documentType") {
    const nextType = event.target;
    if (nextType === activeDocumentType) return;
    const hasInput = purposeInput.value.trim() || contentInput.value.trim();
    if (hasInput && !window.confirm("문서 유형을 변경하면 기존 작성 목적과 핵심 내용이 초기화됩니다. 계속하시겠습니까?")) {
      // 선택만 복원하고 입력, 결과, 스타일, 진행 중인 복사 상태는 건드리지 않습니다.
      typeInputs.forEach((input) => { input.checked = input === activeDocumentType; });
      if (activeDocumentType) activeDocumentType.focus();
      return;
    }
    activeDocumentType = nextType;
    purposeInput.value = "";
    contentInput.value = "";
    clearResults();
    showError("type-error", "", typeInputs);
    showError("purpose-error", "", [purposeInput]);
    showError("content-error", "", [contentInput]);
    return;
  }
  clearResults();
  if (event.target.name === "writingStyle") {
    updateStyleSelection();
    showError("style-error", "", styleInputs);
  }
  if (event.target === purposeInput) showError("purpose-error", "", [purposeInput]);
  if (event.target === contentInput) showError("content-error", "", [contentInput]);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = readValidInput();
  if (!data) return;
  // 사용자 입력을 HTML로 해석하지 않도록 textContent를 사용합니다.
  document.querySelector("#result-type").textContent = data.type;
  document.querySelector("#result-style").textContent = data.style;
  document.querySelector("#result-purpose").textContent = data.purpose;
  document.querySelector("#result-content").textContent = data.content;
  result.hidden = false;
  statusMessage.textContent = "입력 내용 확인이 완료되었습니다.";
  document.querySelector("#result-heading").focus();
});

document.querySelector("#generate-prompt").addEventListener("click", () => {
  const data = readValidInput();
  if (!data) return;
  // textarea.value는 입력에 포함된 태그를 실행하지 않고 그대로 보여줍니다.
  promptOutput.value = `당신은 업무 문서 작성 전문가입니다. 다음 자료를 바탕으로 한국어 문서를 작성해 주세요.

[문서 유형]
${data.type}

[작성 목적]
${data.purpose}

[핵심 내용]
${data.content}

[작성 지침]
${promptGuides[data.type]}

[작성 스타일]
${data.style}
${styleGuides[data.style]}

[공통 작성 원칙]
입력된 사실과 수치, 날짜, 금액, 이름을 임의로 변경하거나 추가하지 마세요. 스타일은 표현과 구성에만 적용하고, 부족한 정보는 확인 필요로 표시해 주세요.
문서 유형별 필수 작성 지침은 유지하면서 선택한 스타일을 적용해 주세요.`;
  // 생성 당시 데이터와 원문을 함께 저장해 편집 중인 값과 섞이지 않게 합니다.
  generatedSnapshot = { documentType: data.type, writingStyle: data.style, purpose: data.purpose, content: data.content, prompt: promptOutput.value };
  saveButton.disabled = false;
  saveStatus.textContent = "";
  promptRevision++;
  copyStatus.textContent = "";
  promptResult.hidden = false;
  statusMessage.textContent = "AI 프롬프트가 생성되었습니다.";
  document.querySelector("#prompt-heading").focus();
});

copyButton.addEventListener("click", async () => {
  if (promptResult.hidden || !promptOutput.value || copyButton.disabled) return;
  const revision = promptRevision;
  await copyText(copyButton, promptOutput, copyStatus, () => revision === promptRevision);
});

// 생성 결과와 저장 상세에서 같은 복사 성공/실패 처리를 사용합니다.
async function copyText(button, output, status, isCurrent) {
  const text = output.value;
  button.disabled = true;
  status.textContent = "";
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      throw new Error("Clipboard unavailable");
    }
    await navigator.clipboard.writeText(text);
    if (isCurrent()) status.textContent = "프롬프트가 복사되었습니다. ChatGPT에 붙여넣어 주세요.";
  } catch {
    // 파일로 열었거나 브라우저가 권한을 거부한 경우 직접 복사를 안내합니다.
    if (isCurrent()) {
      output.focus();
      output.select();
      status.textContent = "자동 복사를 사용할 수 없습니다. 선택된 내용을 Ctrl+C(맥: Command+C)로 복사하거나, 모바일에서는 내용을 길게 눌러 복사해 주세요.";
    }
  } finally {
    button.disabled = false;
  }
}

const STORAGE_KEY = "ai-work-lab.prompts.v1";
const storageStatus = document.querySelector("#storage-status");
const savedList = document.querySelector("#saved-list");
const savedDetail = document.querySelector("#saved-detail");
const savedOutput = document.querySelector("#saved-output");
const savedCopyStatus = document.querySelector("#saved-copy-status");
const savedCopyButton = document.querySelector("#copy-saved");
const savedSearch = document.querySelector("#saved-search");
const savedTypeFilter = document.querySelector("#saved-type-filter");
const savedSort = document.querySelector("#saved-sort");
let savedReadFailed = false;
// 기존 문서 유형의 실제 값을 사용해 필터와 저장 데이터를 정확히 연결합니다.
Object.keys(promptGuides).forEach((type) => {
  const option = document.createElement("option");
  option.value = type;
  option.textContent = type;
  savedTypeFilter.append(option);
});
let savedItems = [];
let selectedSavedId = null;
let savedRevision = 0;

function storageError(error) {
  if (error.name === "QuotaExceededError") return "저장 공간이 부족합니다. 필요 없는 저장 항목을 삭제한 후 다시 시도해 주세요.";
  if (error.name === "InvalidStorageData" || error instanceof SyntaxError) return "저장 데이터가 손상되었거나 지원하지 않는 형식입니다. 기존 데이터 보호를 위해 저장·삭제를 중단했습니다.";
  return "브라우저 저장소에 접근할 수 없습니다. 브라우저의 사이트 데이터 설정을 확인해 주세요. 프롬프트 생성과 복사는 계속 사용할 수 있습니다.";
}

function readSavedItems() {
  // localStorage 속성 접근 자체도 실패할 수 있으므로 호출하는 쪽에서 예외 처리합니다.
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  const ids = new Set();
  const valid = data && data.version === 1 && Array.isArray(data.items) && data.items.every((item) => {
    if (!item || !["id", "documentType", "writingStyle", "purpose", "content", "prompt"].every((key) => typeof item[key] === "string" && item[key].trim())) return false;
    if (!Object.hasOwn(promptGuides, item.documentType) || !Object.hasOwn(styleGuides, item.writingStyle) || ids.has(item.id)) return false;
    // 날짜만 누락되거나 잘못된 항목도 원문을 보존해 표시합니다.
    if (item.savedAt != null && typeof item.savedAt !== "string") return false;
    ids.add(item.id);
    return true;
  });
  if (!valid) { const error = new Error("Invalid data"); error.name = "InvalidStorageData"; throw error; }
  return data.items;
}

function savedTime(item) {
  return typeof item.savedAt === "string" ? Date.parse(item.savedAt) : NaN;
}

function savedDateLabel(item) {
  const time = savedTime(item);
  return Number.isFinite(time) ? new Date(time).toLocaleString("ko-KR") : "저장 시각 확인 불가";
}

function visibleSavedItems() {
  const query = savedSearch.value.trim().toLowerCase();
  // filter가 새 배열을 반환하므로 sort해도 원본과 저장 데이터의 순서는 유지됩니다.
  return savedItems.filter((item) => (!savedTypeFilter.value || item.documentType === savedTypeFilter.value)
    && (!query || [item.purpose, item.content, item.prompt].some((text) => text.toLowerCase().includes(query))))
    .sort((a, b) => {
      const left = savedTime(a), right = savedTime(b);
      if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
      if (!Number.isFinite(right)) return -1;
      return savedSort.value === "oldest" ? left - right : right - left;
    });
}

function clearSavedDetail() {
  selectedSavedId = null;
  savedRevision++;
  savedDetail.hidden = true;
  savedOutput.value = "";
  savedCopyStatus.textContent = "";
  ["#saved-meta", "#saved-purpose", "#saved-content"].forEach((selector) => { document.querySelector(selector).textContent = ""; });
}

function showSavedItem(item, focus = true) {
  selectedSavedId = item.id;
  savedRevision++;
  document.querySelector("#saved-meta").textContent = `${item.documentType} · ${item.writingStyle} · ${savedDateLabel(item)}`;
  document.querySelector("#saved-purpose").textContent = item.purpose;
  document.querySelector("#saved-content").textContent = item.content;
  savedOutput.value = item.prompt;
  savedCopyStatus.textContent = "";
  savedDetail.hidden = false;
  savedList.querySelectorAll("button").forEach((button) => { button.setAttribute("aria-pressed", String(button.dataset.id === item.id)); });
  if (focus) document.querySelector("#saved-detail-heading").focus();
}

function renderSavedList() {
  const visible = visibleSavedItems();
  savedList.replaceChildren();
  document.querySelector("#saved-empty").hidden = savedReadFailed || savedItems.length > 0;
  document.querySelector("#saved-no-results").hidden = savedReadFailed || !savedItems.length || visible.length > 0;
  document.querySelector("#saved-count").textContent = savedReadFailed ? "" : `전체 ${savedItems.length}개 중 ${visible.length}개 표시`;
  visible.forEach((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-item";
    button.dataset.id = item.id;
    button.setAttribute("aria-pressed", String(item.id === selectedSavedId));
    button.textContent = `${item.documentType} · ${item.writingStyle} · ${savedDateLabel(item)}`;
    button.addEventListener("click", () => showSavedItem(item));
    li.append(button);
    savedList.append(li);
  });
  const selected = visible.find((item) => item.id === selectedSavedId);
  if (selected) {
    const meta = `${selected.documentType} · ${selected.writingStyle} · ${savedDateLabel(selected)}`;
    if (savedOutput.value !== selected.prompt || document.querySelector("#saved-meta").textContent !== meta
      || document.querySelector("#saved-purpose").textContent !== selected.purpose
      || document.querySelector("#saved-content").textContent !== selected.content) showSavedItem(selected, false);
  }
  else clearSavedDetail();
}

function refreshSavedItems() {
  try {
    const items = readSavedItems();
    savedItems = items;
    savedReadFailed = false;
    renderSavedList();
    storageStatus.textContent = "";
  } catch (error) {
    savedItems = [];
    savedReadFailed = true;
    renderSavedList();
    document.querySelector("#saved-empty").hidden = true;
    storageStatus.textContent = storageError(error);
  }
}

saveButton.addEventListener("click", () => {
  if (!generatedSnapshot || promptResult.hidden || !promptOutput.value || saveButton.disabled) return;
  try {
    const items = readSavedItems();
    // 시각만으로 ID를 만들지 않고 현재 목록과의 중복도 방지합니다.
    let id;
    do { id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; } while (items.some((item) => item.id === id));
    const item = { id, ...generatedSnapshot, savedAt: new Date().toISOString() };
    const next = [item, ...items];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: next }));
    savedItems = next;
    savedReadFailed = false;
    renderSavedList();
    storageStatus.textContent = "";
    saveStatus.textContent = "현재 브라우저에 저장했습니다.";
  } catch (error) { saveStatus.textContent = storageError(error); }
});

savedCopyButton.addEventListener("click", async () => {
  if (savedDetail.hidden || !savedOutput.value || savedCopyButton.disabled) return;
  const revision = savedRevision;
  await copyText(savedCopyButton, savedOutput, savedCopyStatus, () => revision === savedRevision);
});

document.querySelector("#delete-saved").addEventListener("click", () => {
  if (!selectedSavedId || !window.confirm("선택한 저장 프롬프트를 삭제하시겠습니까? 삭제한 내용은 복구할 수 없습니다.")) return;
  try {
    const items = readSavedItems();
    const next = items.filter((item) => item.id !== selectedSavedId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: next }));
    savedItems = next;
    savedReadFailed = false;
    clearSavedDetail();
    renderSavedList();
    storageStatus.textContent = "선택한 저장 항목을 삭제했습니다.";
    document.querySelector("#saved-heading").focus();
  } catch (error) { storageStatus.textContent = storageError(error); }
});

savedSearch.addEventListener("input", renderSavedList);
savedTypeFilter.addEventListener("change", renderSavedList);
savedSort.addEventListener("change", renderSavedList);

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) refreshSavedItems();
});
refreshSavedItems();
