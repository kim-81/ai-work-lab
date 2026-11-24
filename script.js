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
  promptRevision++;
  copyStatus.textContent = "";
  promptResult.hidden = false;
  statusMessage.textContent = "AI 프롬프트가 생성되었습니다.";
  document.querySelector("#prompt-heading").focus();
});

copyButton.addEventListener("click", async () => {
  if (promptResult.hidden || !promptOutput.value || copyButton.disabled) return;
  const revision = promptRevision;
  const text = promptOutput.value;
  copyButton.disabled = true;
  copyStatus.textContent = "";
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      throw new Error("Clipboard unavailable");
    }
    await navigator.clipboard.writeText(text);
    if (revision === promptRevision) copyStatus.textContent = "프롬프트가 복사되었습니다. ChatGPT에 붙여넣어 주세요.";
  } catch {
    // 파일로 열었거나 브라우저가 권한을 거부한 경우 직접 복사를 안내합니다.
    if (revision === promptRevision) {
      promptOutput.focus();
      promptOutput.select();
      copyStatus.textContent = "자동 복사를 사용할 수 없습니다. 선택된 내용을 Ctrl+C(맥: Command+C)로 복사하거나, 모바일에서는 내용을 길게 눌러 복사해 주세요.";
    }
  } finally {
    copyButton.disabled = false;
  }
});
