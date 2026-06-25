const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~`"
};

const ambiguousCharacters = new Set("il1Lo0O".split(""));
const historyLimit = 5;
const passwordHistory = [];

const elements = {
  passwordOutput: document.querySelector("#password-output"),
  statusMessage: document.querySelector("#status-message"),
  generateButton: document.querySelector("#generate-button"),
  copyButton: document.querySelector("#copy-button"),
  lengthRange: document.querySelector("#length-range"),
  lengthNumber: document.querySelector("#length-number"),
  uppercase: document.querySelector("#uppercase"),
  lowercase: document.querySelector("#lowercase"),
  numbers: document.querySelector("#numbers"),
  symbols: document.querySelector("#symbols"),
  avoidAmbiguous: document.querySelector("#avoid-ambiguous"),
  strengthLabel: document.querySelector("#strength-label"),
  strengthBar: document.querySelector("#strength-bar"),
  entropyValue: document.querySelector("#entropy-value"),
  historyList: document.querySelector("#history-list"),
  themeToggle: document.querySelector("#theme-toggle")
};

function getRandomInt(maxExclusive) {
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const randomValues = new Uint32Array(1);
  let value;

  do {
    crypto.getRandomValues(randomValues);
    value = randomValues[0];
  } while (value >= limit);

  return value % maxExclusive;
}

function shuffleSecurely(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function cleanSet(characters) {
  if (!elements.avoidAmbiguous.checked) {
    return characters;
  }

  return [...characters].filter((character) => !ambiguousCharacters.has(character)).join("");
}

function getSelectedSets() {
  return [
    { enabled: elements.uppercase.checked, characters: cleanSet(characterSets.uppercase) },
    { enabled: elements.lowercase.checked, characters: cleanSet(characterSets.lowercase) },
    { enabled: elements.numbers.checked, characters: cleanSet(characterSets.numbers) },
    { enabled: elements.symbols.checked, characters: cleanSet(characterSets.symbols) }
  ].filter((set) => set.enabled && set.characters.length > 0);
}

function clampLength(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 12;
  }

  return Math.min(64, Math.max(8, parsed));
}

function syncLength(source) {
  const length = clampLength(source.value);
  elements.lengthRange.value = length;
  elements.lengthNumber.value = length;
  updateStrengthPreview();
}

function calculateEntropy(length, poolSize) {
  if (poolSize <= 1 || length <= 0) {
    return 0;
  }

  return length * Math.log2(poolSize);
}

function getStrength(entropy) {
  if (entropy < 50) {
    return { label: "Fraca", width: "25%", color: "var(--danger)" };
  }

  if (entropy < 75) {
    return { label: "Media", width: "50%", color: "var(--warning)" };
  }

  if (entropy < 100) {
    return { label: "Forte", width: "75%", color: "var(--good)" };
  }

  return { label: "Muito forte", width: "100%", color: "linear-gradient(90deg, var(--good), var(--great))" };
}

function updateStrengthPreview() {
  const selectedSets = getSelectedSets();
  const pool = selectedSets.map((set) => set.characters).join("");
  const entropy = calculateEntropy(clampLength(elements.lengthNumber.value), pool.length);
  const strength = getStrength(entropy);

  elements.strengthLabel.textContent = selectedSets.length ? strength.label : "-";
  elements.strengthBar.style.width = selectedSets.length ? strength.width : "0%";
  elements.strengthBar.style.background = strength.color;
  elements.entropyValue.textContent = `${entropy.toFixed(1)} bits`;
}

function updateHistory(password) {
  passwordHistory.unshift(password);
  passwordHistory.splice(historyLimit);

  elements.historyList.replaceChildren(
    ...passwordHistory.map((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      return listItem;
    })
  );
}

function generatePassword() {
  const selectedSets = getSelectedSets();

  if (selectedSets.length === 0) {
    elements.statusMessage.textContent = "Selecione pelo menos um tipo de caractere.";
    elements.passwordOutput.textContent = "Nenhum tipo selecionado";
    updateStrengthPreview();
    return;
  }

  if (selectedSets.length < 2) {
    elements.statusMessage.textContent = "Escolha no minimo 2 tipos de caracteres.";
    updateStrengthPreview();
    return;
  }

  const length = clampLength(elements.lengthNumber.value);
  const pool = selectedSets.map((set) => set.characters).join("");
  const passwordCharacters = selectedSets.map((set) => set.characters[getRandomInt(set.characters.length)]);

  while (passwordCharacters.length < length) {
    passwordCharacters.push(pool[getRandomInt(pool.length)]);
  }

  const password = shuffleSecurely(passwordCharacters).join("");
  elements.passwordOutput.textContent = password;
  elements.statusMessage.textContent = "Senha gerada com seguranca.";
  updateStrengthPreview();
  updateHistory(password);
}

async function copyPassword() {
  const password = elements.passwordOutput.textContent;

  if (!password || password === "Clique em gerar" || password === "Nenhum tipo selecionado") {
    elements.statusMessage.textContent = "Gere uma senha antes de copiar.";
    return;
  }

  try {
    await navigator.clipboard.writeText(password);
    showCopySuccess();
  } catch {
    const copiedWithFallback = copyWithFallback(password);

    if (copiedWithFallback) {
      showCopySuccess();
      return;
    }

    elements.statusMessage.textContent = "Nao foi possivel copiar automaticamente.";
  }
}

function copyWithFallback(password) {
  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = password;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.left = "-9999px";
  document.body.appendChild(temporaryInput);
  temporaryInput.focus();
  temporaryInput.select();
  temporaryInput.setSelectionRange(0, temporaryInput.value.length);

  try {
    return document.execCommand("copy");
  } finally {
    temporaryInput.remove();
  }
}

function showCopySuccess() {
  elements.copyButton.textContent = "Copiado!";
  elements.statusMessage.textContent = "Senha copiada para a area de transferencia.";
  window.setTimeout(() => {
    elements.copyButton.textContent = "Copiar";
  }, 1400);
}

function toggleTheme() {
  document.body.classList.toggle("light", elements.themeToggle.checked);
}

elements.generateButton.addEventListener("click", generatePassword);
elements.copyButton.addEventListener("click", copyPassword);
elements.lengthRange.addEventListener("input", () => syncLength(elements.lengthRange));
elements.lengthNumber.addEventListener("input", () => syncLength(elements.lengthNumber));
elements.themeToggle.addEventListener("change", toggleTheme);

[
  elements.uppercase,
  elements.lowercase,
  elements.numbers,
  elements.symbols,
  elements.avoidAmbiguous
].forEach((checkbox) => {
  checkbox.addEventListener("change", updateStrengthPreview);
});

document.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement.tagName.toLowerCase();

  if (event.code === "Space" && activeTag !== "input" && activeTag !== "button") {
    event.preventDefault();
    generatePassword();
  }
});

updateStrengthPreview();
generatePassword();
