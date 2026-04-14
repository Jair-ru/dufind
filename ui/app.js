const state = {
  query: "",
  extensionFilter: "",
  favoritesOnly: false,
  enableContentSearch: true,
  maxResults: 200,
  results: [],
  selectedIndex: -1,
  extensions: [],
  stats: null,
  settings: null,
  isLoading: false,
  isInitialized: false
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  results: document.getElementById("results"),
  extensionFilter: document.getElementById("extensionFilter"),
  statusText: document.getElementById("statusText"),
  btnReindex: document.getElementById("btnReindex"),
  btnFavorites: document.getElementById("btnFavorites"),
  resultTemplate: document.getElementById("resultTemplate")
};

function setStatus(message) {
  elements.statusText.textContent = message || "";
}

function setLoading(loading) {
  state.isLoading = Boolean(loading);
  document.body.classList.toggle("loading", state.isLoading);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  try {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  } catch {
    return String(value || 0);
  }
}

function formatSize(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;

  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Date(timestamp).toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

function debounce(fn, delay = 180) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getSelectedResult() {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.results.length) {
    return null;
  }

  return state.results[state.selectedIndex];
}

function updateFavoritesButton() {
  elements.btnFavorites.classList.toggle("active", state.favoritesOnly);
  elements.btnFavorites.textContent = state.favoritesOnly ? "★" : "☆";
  elements.btnFavorites.title = state.favoritesOnly
    ? "Mostrando somente favoritos"
    : "Mostrar somente favoritos";
}

function updateStatusFromResults() {
  const total = state.results.length;
  const queryText = state.query.trim();

  if (state.isLoading) {
    setStatus("Carregando...");
    return;
  }

  if (!state.isInitialized) {
    setStatus("Inicializando...");
    return;
  }

  if (!queryText && !state.favoritesOnly && !state.extensionFilter) {
    const indexedFiles = state.stats?.inMemoryFiles ?? 0;
    setStatus(
      `${formatNumber(indexedFiles)} arquivos indexados • ${formatNumber(total)} exibidos`
    );
    return;
  }

  const parts = [`${formatNumber(total)} resultado(s)`];

  if (queryText) {
    parts.push(`busca: "${queryText}"`);
  }

  if (state.extensionFilter) {
    parts.push(`extensão: ${state.extensionFilter}`);
  }

  if (state.favoritesOnly) {
    parts.push("somente favoritos");
  }

  setStatus(parts.join(" • "));
}

function buildEmptyState(title, description) {
  const container = document.createElement("div");
  container.className = "empty-state";
  container.innerHTML = `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(description)}</div>
    </div>
  `;
  return container;
}

function clearResults() {
  elements.results.innerHTML = "";
}

function buildMeta(record) {
  const meta = document.createElement("div");
  meta.className = "result-meta";

  if (record.ext) {
    const extBadge = document.createElement("span");
    extBadge.className = "badge";
    extBadge.textContent = record.ext;
    meta.appendChild(extBadge);
  }

  if (record.size >= 0) {
    const sizeBadge = document.createElement("span");
    sizeBadge.className = "badge";
    sizeBadge.textContent = formatSize(record.size);
    meta.appendChild(sizeBadge);
  }

  if (record.matchedBy) {
    const matchBadge = document.createElement("span");
    matchBadge.className = "badge";
    matchBadge.textContent = `match: ${record.matchedBy}`;
    meta.appendChild(matchBadge);
  }

  return meta;
}

function renderResults() {
  clearResults();

  if (!state.results.length) {
    const hasFilter =
      Boolean(state.query.trim()) ||
      Boolean(state.extensionFilter) ||
      Boolean(state.favoritesOnly);

    const empty = hasFilter
      ? buildEmptyState("Nenhum resultado encontrado", "Tente outro termo, extensão ou filtro.")
      : buildEmptyState("Nenhum arquivo exibido", "Digite algo para buscar ou reindexe o sistema.");

    elements.results.appendChild(empty);
    updateStatusFromResults();
    return;
  }

  const fragment = document.createDocumentFragment();

  state.results.forEach((record, index) => {
    const node = elements.resultTemplate.content.firstElementChild.cloneNode(true);

    node.dataset.index = String(index);
    node.dataset.path = record.path || "";

    if (record.isFavorite) {
      node.classList.add("favorite");
    }

    if (index === state.selectedIndex) {
      node.classList.add("selected");
      node.style.borderColor = "rgba(56, 189, 248, 0.4)";
      node.style.boxShadow = "0 0 0 4px rgba(56, 189, 248, 0.08)";
    }

    const nameEl = node.querySelector(".result-name");
    const pathEl = node.querySelector(".result-path");
    const previewEl = node.querySelector(".result-preview");

    nameEl.textContent = record.displayName || record.name || "Sem nome";
    nameEl.title = record.displayName || record.name || "";

    const pathText = record.displayDirectory || record.directory || record.path || "";
    pathEl.textContent = pathText;
    pathEl.title = record.path || "";

    const previewParts = [];

    if (record.contentPreview) {
      previewParts.push(record.contentPreview);
    }

    if (record.mtimeMs) {
      previewParts.push(`Modificado: ${formatDate(record.mtimeMs)}`);
    }

    previewEl.textContent = previewParts.join(" • ");

    const meta = buildMeta(record);
    node.querySelector(".result-main").appendChild(meta);

    const btnOpen = node.querySelector(".btn-open");
    const btnFolder = node.querySelector(".btn-folder");
    const btnReveal = node.querySelector(".btn-reveal");
    const btnCopy = node.querySelector(".btn-copy");
    const btnFav = node.querySelector(".btn-fav");

    btnFav.textContent = record.isFavorite ? "★" : "☆";
    btnFav.classList.toggle("active", Boolean(record.isFavorite));
    btnFav.title = record.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos";

    btnOpen.addEventListener("click", async (event) => {
      event.stopPropagation();
      await openFile(record.path);
    });

    btnFolder.addEventListener("click", async (event) => {
      event.stopPropagation();
      await openFolder(record.path);
    });

    btnReveal.addEventListener("click", async (event) => {
      event.stopPropagation();
      await revealFile(record.path);
    });

    btnCopy.addEventListener("click", async (event) => {
      event.stopPropagation();
      await copyPath(record.path);
    });

    btnFav.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleFavorite(record.path);
    });

    node.addEventListener("click", () => {
      state.selectedIndex = index;
      renderResults();
    });

    node.addEventListener("dblclick", async () => {
      await openFile(record.path);
    });

    fragment.appendChild(node);
  });

  elements.results.appendChild(fragment);
  updateStatusFromResults();
}

function renderExtensions() {
  const currentValue = state.extensionFilter;
  elements.extensionFilter.innerHTML = `<option value="">Todas extensões</option>`;

  state.extensions.forEach((ext) => {
    const option = document.createElement("option");
    option.value = ext;
    option.textContent = ext;
    elements.extensionFilter.appendChild(option);
  });

  elements.extensionFilter.value = currentValue;
}

async function refreshStats() {
  const response = await window.dufind.index.stats();

  if (response?.success) {
    state.stats = response.stats;
  }
}

async function refreshExtensions() {
  const response = await window.dufind.index.extensions();

  if (response?.success) {
    state.extensions = Array.isArray(response.extensions) ? response.extensions : [];
    renderExtensions();
  }
}

async function searchNow() {
  setLoading(true);

  try {
    const response = await window.dufind.search.files({
      query: state.query,
      extensionFilter: state.extensionFilter,
      favoritesOnly: state.favoritesOnly,
      enableContentSearch: state.enableContentSearch,
      maxResults: state.maxResults
    });

    if (!response?.success) {
      state.results = [];
      state.selectedIndex = -1;
      setStatus(response?.message || "Falha ao buscar arquivos.");
      renderResults();
      return;
    }

    state.results = Array.isArray(response.results) ? response.results : [];
    state.selectedIndex = state.results.length ? 0 : -1;
    renderResults();
  } catch (error) {
    state.results = [];
    state.selectedIndex = -1;
    setStatus(`Erro na busca: ${error.message}`);
    renderResults();
  } finally {
    setLoading(false);
  }
}

const debouncedSearch = debounce(searchNow, 140);

async function openFile(filePath) {
  const response = await window.dufind.file.open(filePath);
  if (!response?.success) {
    setStatus(response?.message || "Não foi possível abrir o arquivo.");
    return;
  }

  setStatus("Arquivo aberto com sucesso.");
}

async function openFolder(filePath) {
  const response = await window.dufind.file.openFolder(filePath);
  if (!response?.success) {
    setStatus(response?.message || "Não foi possível abrir a pasta.");
    return;
  }

  setStatus("Pasta aberta com sucesso.");
}

async function revealFile(filePath) {
  const response = await window.dufind.file.reveal(filePath);
  if (!response?.success) {
    setStatus(response?.message || "Não foi possível mostrar no Explorer.");
    return;
  }

  setStatus("Arquivo revelado no Explorer.");
}

async function copyPath(filePath) {
  const response = await window.dufind.file.copyPath(filePath);
  if (!response?.success) {
    setStatus(response?.message || "Não foi possível copiar o caminho.");
    return;
  }

  setStatus("Caminho copiado.");
}

async function toggleFavorite(filePath) {
  const response = await window.dufind.favorites.toggle(filePath);
  if (!response?.success) {
    setStatus(response?.message || "Não foi possível alterar favorito.");
    return;
  }

  const target = state.results.find((item) => item.path === filePath);
  if (target) {
    target.isFavorite = Boolean(response.isFavorite);
  }

  if (state.favoritesOnly) {
    state.results = state.results.filter((item) => item.isFavorite);
  }

  renderResults();
  setStatus(response.message || "Favorito atualizado.");
}

async function rebuildIndex() {
  setLoading(true);
  setStatus("Reindexando arquivos...");

  try {
    const response = await window.dufind.index.rebuild();

    if (!response?.success) {
      setStatus(response?.message || "Falha ao reindexar.");
      return;
    }

    state.stats = response.stats || state.stats;
    state.extensions = Array.isArray(response.extensions) ? response.extensions : state.extensions;

    renderExtensions();
    await searchNow();

    const totalFiles = response.totalFiles ?? state.stats?.inMemoryFiles ?? 0;
    setStatus(`Indexação concluída. ${formatNumber(totalFiles)} arquivo(s) indexado(s).`);
  } catch (error) {
    setStatus(`Erro ao reindexar: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function moveSelection(direction) {
  if (!state.results.length) {
    return;
  }

  const lastIndex = state.results.length - 1;

  if (state.selectedIndex < 0) {
    state.selectedIndex = 0;
  } else {
    state.selectedIndex += direction;
  }

  if (state.selectedIndex < 0) {
    state.selectedIndex = 0;
  }

  if (state.selectedIndex > lastIndex) {
    state.selectedIndex = lastIndex;
  }

  renderResults();

  const selectedNode = elements.results.querySelector(
    `.result-item[data-index="${state.selectedIndex}"]`
  );

  selectedNode?.scrollIntoView({
    block: "nearest",
    behavior: "smooth"
  });
}

async function handleEnterKey() {
  const selected = getSelectedResult();
  if (!selected) {
    return;
  }

  await openFile(selected.path);
}

async function handleKeyboardShortcuts(event) {
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    await handleEnterKey();
    return;
  }

  if (event.key === "Escape") {
    elements.searchInput.value = "";
    state.query = "";
    await searchNow();
    return;
  }

  if (ctrlOrMeta && event.key.toLowerCase() === "f") {
    event.preventDefault();
    elements.searchInput.focus();
    elements.searchInput.select();
    return;
  }

  if (ctrlOrMeta && event.key.toLowerCase() === "r") {
    event.preventDefault();
    await rebuildIndex();
    return;
  }

  if (ctrlOrMeta && event.key.toLowerCase() === "d") {
    event.preventDefault();
    const selected = getSelectedResult();
    if (selected) {
      await openFolder(selected.path);
    }
    return;
  }

  if (ctrlOrMeta && event.key.toLowerCase() === "c") {
    const selected = getSelectedResult();
    if (selected && document.activeElement !== elements.searchInput) {
      event.preventDefault();
      await copyPath(selected.path);
    }
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    debouncedSearch();
  });

  elements.extensionFilter.addEventListener("change", () => {
    state.extensionFilter = elements.extensionFilter.value;
    searchNow();
  });

  elements.btnFavorites.addEventListener("click", async () => {
    state.favoritesOnly = !state.favoritesOnly;
    updateFavoritesButton();
    await searchNow();
  });

  elements.btnReindex.addEventListener("click", async () => {
    await rebuildIndex();
  });

  document.addEventListener("keydown", handleKeyboardShortcuts);
}

async function initializeApp() {
  setLoading(true);
  setStatus("Inicializando DuFind...");

  try {
    const response = await window.dufind.app.init();

    if (!response?.success) {
      setStatus(response?.message || "Falha ao inicializar o aplicativo.");
      return;
    }

    state.settings = response.settings || {};
    state.stats = response.stats || null;
    state.extensions = Array.isArray(response.extensions) ? response.extensions : [];
    state.enableContentSearch = response.settings?.enableContentSearch ?? true;
    state.maxResults = response.settings?.maxResults ?? 200;
    state.isInitialized = true;

    renderExtensions();
    updateFavoritesButton();
    await searchNow();

    const indexed = state.stats?.inMemoryFiles ?? 0;
    setStatus(`DuFind pronto • ${formatNumber(indexed)} arquivos indexados`);
  } catch (error) {
    setStatus(`Erro ao inicializar: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

bindEvents();
initializeApp();