"use strict";

// 요소를 한 번 찾아 두고 입력값과 결과 화면을 관리합니다.
const form = document.querySelector("#document-form");
const purposeInput = document.querySelector("#purpose");
const contentInput = document.querySelector("#content");
const typeInputs = Array.from(form.querySelectorAll('[name="documentType"]'));
const result = document.querySelector("#result");
const statusMessage = document.querySelector("#form-status");

function showError(id, message, inputs) {
  const error = document.getElementById(id);
  error.textContent = message;
  error.hidden = !message;
  inputs.forEach((input) => {
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  });
}

// 수정 중에는 이전 결과를 숨겨 오래된 내용과 혼동하지 않게 합니다.
form.addEventListener("input", (event) => {
  result.hidden = true;
  statusMessage.textContent = "";
  if (event.target.name === "documentType") showError("type-error", "", typeInputs);
  if (event.target === purposeInput) showError("purpose-error", "", [purposeInput]);
  if (event.target === contentInput) showError("content-error", "", [contentInput]);
});

form.addEventListener("submit", (event) => {
  event.preventDefault(); // 새로고침 없이 현재 화면에서 처리합니다.
  const selectedType = form.querySelector('[name="documentType"]:checked');
  // 공백만 입력한 경우도 빈 값으로 처리합니다.
  const purpose = purposeInput.value.trim();
  const content = contentInput.value.trim();
  showError("type-error", selectedType ? "" : "문서 유형을 선택해 주세요.", typeInputs);
  showError("purpose-error", purpose ? "" : "문서 작성 목적을 입력해 주세요.", [purposeInput]);
  showError("content-error", content ? "" : "핵심 내용을 입력해 주세요.", [contentInput]);

  if (!selectedType || !purpose || !content) {
    result.hidden = true;
    statusMessage.textContent = "필수 입력 항목을 확인해 주세요.";
    const firstInvalid = !selectedType ? typeInputs[0] : !purpose ? purposeInput : contentInput;
    firstInvalid.focus();
    return;
  }
  // textContent는 HTML을 실행하지 않고 태그도 일반 글자로 표시합니다.
  document.querySelector("#result-type").textContent = selectedType.value;
  document.querySelector("#result-purpose").textContent = purpose;
  document.querySelector("#result-content").textContent = content;
  result.hidden = false;
  statusMessage.textContent = "입력 내용 확인이 완료되었습니다.";
  document.querySelector("#result-heading").focus();
});
