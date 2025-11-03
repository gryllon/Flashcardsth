// Flashcards app with Menu, Create List and View List (supports multiple named lists)
const STORAGE_KEY = 'flashcardLists';
const STATS_STORAGE_KEY = 'flashcardStats';
const ACTIVITY_STORAGE_KEY = 'flashcardActivity';

// State
let cards = []; // current cards shown in flashcard mode
let index = 0;

// Elements
const cardEl = document.getElementById('card');
const frontEl = document.getElementById('card-front');
const backEl = document.getElementById('card-back');
const posEl = document.getElementById('position');

const startBtn = document.getElementById('start-btn');
const createBtn = document.getElementById('create-btn');
const viewBtn = document.getElementById('view-btn');

const menuStart = document.getElementById('menu-start');
const menuCreate = document.getElementById('menu-create');
const menuView = document.getElementById('menu-view');
const menuStats = document.getElementById('menu-stats');
const themeToggleBtn = document.getElementById('theme-toggle');

const sectionMenu = document.getElementById('menu');
const sectionCreate = document.getElementById('create-list');
const sectionView = document.getElementById('view-list');
const sectionStats = document.getElementById('stats-page');
const sectionFlash = document.getElementById('flashcards');
const headerNav = document.querySelector('.main-nav');

// Create list elements
const fileInput = document.getElementById('file-input');
const nameInput = document.getElementById('name-input');
const listNameInput = document.getElementById('list-name-input');
const addItemBtn = document.getElementById('add-item');
const saveListBtn = document.getElementById('save-list');
const createPreview = document.getElementById('create-preview');
const savedListEl = document.getElementById('saved-lists');
const createBackBtn = document.getElementById('create-back');
const viewListBackBtn = document.getElementById('view-list-back');
const confirmModal = document.getElementById('confirm-modal');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmMessage = document.getElementById('confirm-message');
const statsBackBtn = document.getElementById('stats-back');
const topErrorsEl = document.getElementById('top-errors');
const resetStatsBtn = document.getElementById('reset-stats-btn');

let tempList = [];
let editingListIndex = null; // null => creating new list; number => editing existing

// undo buffers
let removedListBuffer = null; // {item, index, timer}
let removedTempBuffer = null; // {item, index, timer}

// toast helper
const toastEl = document.getElementById('toast');
function showToast(message, actionLabel, actionCallback, timeout = 5000) {
  if (!toastEl) return;
  toastEl.innerHTML = '';
  const msg = document.createElement('div');
  msg.textContent = message;
  const action = document.createElement('button');
  action.className = 'action';
  action.textContent = actionLabel || 'Desfazer';
  let timer;
  action.addEventListener('click', () => {
    clearTimeout(timer);
    hideToast();
    actionCallback && actionCallback();
  });
  toastEl.appendChild(msg);
  toastEl.appendChild(action);
  toastEl.classList.remove('hidden');
  timer = setTimeout(() => {
    hideToast();
  }, timeout);
}

function hideToast() {
  if (!toastEl) return;
  toastEl.classList.add('hidden');
  toastEl.innerHTML = '';
}

// Sound helper
function playSound(src) {
  try {
    const audio = new Audio(src);
    audio.play();
  } catch (e) {
    console.error(`Error playing sound: ${src}`, e);
  }
}

// storage helpers (array of lists: { name, items: [...] })
function loadSavedLists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao carregar listas:', e);
    return [];
  }
}

function saveListsToStorage(lists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Erro: Armazenamento cheio. Apague listas antigas ou use imagens menores para liberar espaço.');
    } else {
      console.error('Failed to save lists:', e);
    }
  }
}

// Stat helpers
function getStats() {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error loading stats:', e);
    return {};
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Erro: Armazenamento cheio. Apague listas antigas ou use imagens menores para liberar espaço.');
    } else {
      console.error('Failed to save stats:', e);
    }
  }
}

// Activity helpers
function getActivity() {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading activity:', e);
    return [];
  }
}

function addActivity() {
  const activity = getActivity();
  const today = new Date().toISOString().slice(0, 10); // Get YYYY-MM-DD
  if (!activity.includes(today)) {
    activity.push(today);
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Erro: Armazenamento cheio. Apague listas antigas ou use imagens menores para liberar espaço.');
      } else {
        console.error('Failed to save activity:', e);
      }
    }
  }
}

// identifier is the card's image data
function updateCardStat(identifier, adjustment) {
  if (!identifier) return;
  const stats = getStats();
  if (!stats[identifier]) {
    stats[identifier] = 0;
  }
  stats[identifier] += adjustment;
  saveStats(stats);
}

function showSection(section) {
  // hide all known sections (including new mode/difficulty menus)
  [sectionMenu, sectionCreate, sectionView, sectionStats, sectionFlash, modeMenuSection, difficultyMenuSection].forEach(s => s && s.classList.add('hidden'));
  // show requested
  if (section) section.classList.remove('hidden');
  // whenever we are not showing the flashcards area, ensure mode-specific UI is hidden
  if (section !== sectionFlash) {
    if (altArea) altArea.classList.add('hidden');
    if (typeArea) typeArea.classList.add('hidden');
    if (altAreaReversed) altAreaReversed.classList.add('hidden');
  }
}

// Atualiza visibilidade do nav do cabeçalho: só mostra quando estiver no menu principal
function updateHeaderNav(section) {
  if (!headerNav) return;
  if (section === sectionMenu) headerNav.classList.remove('hidden');
  else headerNav.classList.add('hidden');
}

// Render flashcard (supports image front + name back, or text)
function render() {
  if (!cards || cards.length === 0) {
    frontEl.textContent = 'Sem cartões — crie uma lista primeiro.';
    backEl.textContent = '';
    posEl.textContent = '0 / 0';
    return;
  }
  const c = cards[index];
  // if object has image & name
  if (c.image) {
    frontEl.innerHTML = `<img src="${c.image}" alt="card image" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px">`;
    backEl.textContent = c.name || '';
  } else if (c.front || c.back) {
    frontEl.textContent = c.front || '';
    backEl.textContent = c.back || '';
  } else {
    // fallback
    frontEl.textContent = JSON.stringify(c);
    backEl.textContent = '';
  }

  posEl.textContent = `${index + 1} / ${cards.length}`;
  cardEl.classList.remove('flipped');
  cardEl.focus();
}

function next() {
  if (!cards.length) return;
  index = (index + 1) % cards.length;
  render();
}

function prev() {
  if (!cards.length) return;
  index = (index - 1 + cards.length) % cards.length;
  render();
}

function shuffle() {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  index = 0;
  render();
}

// Create list: add image + name
function addTempItem() {
  const file = fileInput.files && fileInput.files[0];
  const name = nameInput.value && nameInput.value.trim();
  if (!file) { alert('Escolha uma imagem.'); return; }
  if (!name) { alert('Digite um nome para a imagem.'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    tempList.push({ image: e.target.result, name });
    renderPreview();
    // reset inputs
    fileInput.value = '';
    nameInput.value = '';
  };
  reader.readAsDataURL(file);
}

function renderPreview() {
  createPreview.innerHTML = '';
  tempList.forEach((it, i) => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.setAttribute('draggable', 'true');
    div.dataset.index = i;
    div.innerHTML = `
      <img src="${it.image}" alt="thumb">
      <div class="name">${escapeHtml(it.name)}</div>
      <div class="item-actions">
        <button class="btn small edit-item" data-i="${i}">Editar</button>
        <button class="btn small remove-item" data-i="${i}">Remover</button>
      </div>
    `;
    createPreview.appendChild(div);

    // drag handlers
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(i));
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => div.classList.remove('dragging'));

    div.querySelector('.remove-item').addEventListener('click', () => removeTempItemWithUndo(i));
    div.querySelector('.edit-item').addEventListener('click', () => editTempItem(i, div));
  });

  // dragover/drop on container
  createPreview.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(createPreview, e.clientY);
    const dragging = createPreview.querySelector('.dragging');
    if (!dragging) return;
    if (afterEl == null) createPreview.appendChild(dragging);
    else createPreview.insertBefore(dragging, afterEl);
  });
  createPreview.addEventListener('drop', (e) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const draggingEl = createPreview.querySelector('.dragging');
    // find new index by positions
    const nodes = Array.from(createPreview.querySelectorAll('.preview-item'));
    const to = nodes.indexOf(draggingEl);
    if (!Number.isNaN(from) && to >= 0 && from !== to) {
      const item = tempList.splice(from, 1)[0];
      tempList.splice(to, 0, item);
      renderPreview();
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.preview-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function editTempItem(i, containerDiv) {
  if (!containerDiv) return;
  containerDiv.classList.add('editing');
  // build edit form inside container
  containerDiv.innerHTML = `
    <div style="width:100%">
      <input type="file" accept="image/*" class="edit-file">
      <input type="text" class="edit-name" value="${escapeHtml(tempList[i].name)}" placeholder="Nome">
      <div class="item-actions">
        <button class="btn small save-edit">Salvar</button>
        <button class="btn small">Cancelar</button>
      </div>
    </div>
  `;
  const fileInputEl = containerDiv.querySelector('.edit-file');
  const nameInputEl = containerDiv.querySelector('.edit-name');
  const saveBtn = containerDiv.querySelector('.save-edit');
  const cancelBtn = containerDiv.querySelector('.btn.small:not(.save-edit)');

  let newImageData = null;
  fileInputEl.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { newImageData = ev.target.result; };
    reader.readAsDataURL(f);
  });

  saveBtn.addEventListener('click', () => {
    const newName = nameInputEl.value && nameInputEl.value.trim();
    if (!newName) { alert('Digite um nome.'); return; }
    if (newImageData) tempList[i].image = newImageData;
    tempList[i].name = newName;
    renderPreview();
  });
  cancelBtn.addEventListener('click', () => {
    renderPreview();
  });
}

function removeTempItemWithUndo(i) {
  const item = tempList.splice(i, 1)[0];
  renderPreview();
  // clear previous buffer
  if (removedTempBuffer && removedTempBuffer.timer) clearTimeout(removedTempBuffer.timer);
  removedTempBuffer = { item, index: i };
  showToast('Item removido', 'Desfazer', () => {
    if (!removedTempBuffer) return;
    tempList.splice(removedTempBuffer.index, 0, removedTempBuffer.item);
    renderPreview();
    removedTempBuffer = null;
  }, 5000);
  // finalize after timeout
  removedTempBuffer.timer = setTimeout(() => { removedTempBuffer = null; hideToast(); }, 5000);
}

function updateViewBtnLabel() {
  if (!viewBtn) return;
  const lists = loadSavedLists();
  if (!lists.length) viewBtn.textContent = 'Ver lista';
  else viewBtn.textContent = `Ver lista — ${lists[lists.length - 1].name}`;
}

function renderSavedList() {
  const lists = loadSavedLists();
  savedListEl.innerHTML = '';
  if (!lists.length) {
    savedListEl.textContent = 'Nenhuma lista salva.';
    updateViewBtnLabel();
    return;
  }
  lists.forEach((list, i) => {
      const div = document.createElement('div');
      div.className = 'list-card';
      div.innerHTML = `\n      <div class="meta">\n        <strong>${escapeHtml(list.name)}</strong>\n        <div class="muted">${list.items.length} itens</div>\n      </div>\n      <div>\n        <button class="btn small edit-list" data-i="${i}">Editar</button>\n        <button class="btn small open-list" data-i="${i}">Abrir</button>\n        <button class="btn small" data-i="${i}" data-action="remove">Remover</button>\n      </div>\n    `;
      savedListEl.appendChild(div);
      div.querySelector('.open-list').addEventListener('click', () => { openList(i); });
      div.querySelector('.edit-list').addEventListener('click', () => { editList(i); });
      div.querySelector('button[data-action="remove"]').addEventListener('click', () => {
        // confirm before permanent deletion, then allow undo
        showConfirm(`Tem certeza que deseja apagar a lista "${list.name}"?`, () => {
          removeListWithUndoConfirmed(i);
        });
      });
  });
  updateViewBtnLabel();
}

  function removeListWithUndo(i) {
    const lists = loadSavedLists();
    if (i < 0 || i >= lists.length) return;
    const item = lists.splice(i, 1)[0];
    saveListsToStorage(lists);
    renderSavedList();
    // clear previous buffer
    if (removedListBuffer && removedListBuffer.timer) clearTimeout(removedListBuffer.timer);
    removedListBuffer = { item, index: i };
    showToast('Lista removida', 'Desfazer', () => {
      if (!removedListBuffer) return;
      const s = loadSavedLists();
      s.splice(removedListBuffer.index, 0, removedListBuffer.item);
      saveListsToStorage(s);
      renderSavedList();
      updateViewBtnLabel();
      removedListBuffer = null;
    }, 6000);
    removedListBuffer.timer = setTimeout(() => { removedListBuffer = null; hideToast(); updateViewBtnLabel(); }, 6000);
  }

  function removeListWithUndoConfirmed(i) {
    const lists = loadSavedLists();
    if (i < 0 || i >= lists.length) return;
    const item = lists.splice(i, 1)[0];
    saveListsToStorage(lists);
    renderSavedList();
    // clear previous buffer
    if (removedListBuffer && removedListBuffer.timer) clearTimeout(removedListBuffer.timer);
    removedListBuffer = { item, index: i };
    showToast('Lista removida', 'Desfazer', () => {
      if (!removedListBuffer) return;
      const s = loadSavedLists();
      s.splice(removedListBuffer.index, 0, removedListBuffer.item);
      saveListsToStorage(s);
      renderSavedList();
      updateViewBtnLabel();
      removedListBuffer = null;
    }, 6000);
    removedListBuffer.timer = setTimeout(() => { removedListBuffer = null; hideToast(); updateViewBtnLabel(); }, 6000);
  }

  function showConfirm(message, onConfirm, onCancel) {
    if (!confirmModal) {
      if (confirm(message)) onConfirm && onConfirm(); else onCancel && onCancel();
      return;
    }
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');
    function cleanup() {
      confirmModal.classList.add('hidden');
      confirmOk.removeEventListener('click', okHandler);
      confirmCancel.removeEventListener('click', cancelHandler);
    }
    function okHandler() { cleanup(); onConfirm && onConfirm(); }
    function cancelHandler() { cleanup(); onCancel && onCancel(); }
    confirmOk.addEventListener('click', okHandler);
    confirmCancel.addEventListener('click', cancelHandler);
  }

  function editList(i) {
    const lists = loadSavedLists();
    const list = lists[i];
    if (!list) return;
    editingListIndex = i;
    listNameInput.value = list.name;
    tempList = list.items.slice();
    renderPreview();
    showSection(sectionCreate);
    updateHeaderNav(sectionCreate);
  }

function openList(listIndex) {
  const lists = loadSavedLists();
  const list = lists[listIndex];
  if (!list || !list.items || !list.items.length) { alert('Lista vazia.'); return; }
  if (DEBUG) console.log('[DEBUG] openList', { listIndex, name: list.name });
  cards = list.items.map(it => ({ image: it.image, name: it.name }));
  index = 0;
  showSection(sectionFlash);
  updateHeaderNav(sectionFlash);
  render();
}

function saveList() {
  const listName = listNameInput && listNameInput.value && listNameInput.value.trim();
  if (!listName) { alert('Digite o nome da lista (obrigatório).'); return; }
  if (!tempList.length) { alert('Adicione ao menos 1 item antes de salvar.'); return; }
  const lists = loadSavedLists();
  if (editingListIndex === null) {
    // create new
    lists.push({ name: listName, items: tempList.slice() });
    saveListsToStorage(lists);
    alert('Lista criada.');
  } else {
    // update existing
    lists[editingListIndex] = { name: listName, items: tempList.slice() };
    saveListsToStorage(lists);
    alert('Lista atualizada.');
    editingListIndex = null;
  }
  // Resetar temporários e formulário para permitir criar nova lista limpa
  tempList = [];
  renderPreview();
  listNameInput.value = '';
  fileInput.value = '';
  nameInput.value = '';
  renderSavedList();
  showSection(sectionView);
}

function renderStatsPage() {
  renderActivityCalendar();
  const stats = getStats();
  const allLists = loadSavedLists();
  const cardMap = new Map();
  allLists.forEach(list => {
    list.items.forEach(item => {
      if (!cardMap.has(item.image)) {
        cardMap.set(item.image, item.name);
      }
    });
  });

  const sortedErrors = Object.entries(stats)
    .filter(([, score]) => score > 0)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, 3);

  topErrorsEl.innerHTML = '';
  if (sortedErrors.length === 0) {
    topErrorsEl.textContent = 'Nenhuma carta com erros registrados ainda. Continue jogando!';
    return;
  }

  sortedErrors.forEach(([identifier, score]) => {
    const cardName = cardMap.get(identifier) || 'Carta desconhecida';
    const div = document.createElement('div');
    div.className = 'list-card'; // Reusing style for consistency
    div.innerHTML = `
      <div class="meta">
        <strong>${escapeHtml(cardName)}</strong>
        <div class="muted">Pontuação de erro: ${score}</div>
      </div>
    `;
    topErrorsEl.appendChild(div);
  });
}

function renderActivityCalendar() {
  const activity = getActivity();
  const calendarEl = document.getElementById('activity-calendar');
  if (!calendarEl) return;

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDay = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

  let html = '<div class="calendar-header"><h4>Histórico de Atividade</h4></div>';
  html += '<div class="calendar-grid">';

  const dayHeaders = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  dayHeaders.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  for (let i = 0; i < startingDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isPracticed = activity.includes(dateStr);
    html += `<div class="calendar-day ${isPracticed ? 'practiced' : ''}">${i}</div>`;
  }

  html += '</div>';
  calendarEl.innerHTML = html;
}

function startFromStorage() {
  const lists = loadSavedLists();
  if (!lists.length) { alert('Nenhuma lista encontrada. Crie uma lista primeiro.'); return; }
  // open most recent list
  openList(lists.length - 1);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]; });
}

// Wiring
document.getElementById('next').addEventListener('click', next);
document.getElementById('prev').addEventListener('click', prev);
document.getElementById('shuffle').addEventListener('click', shuffle);
document.getElementById('flip').addEventListener('click', () => cardEl.classList.toggle('flipped'));

cardEl.addEventListener('click', () => cardEl.classList.toggle('flipped'));
cardEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); cardEl.classList.toggle('flipped'); }
});

let touchStartX = null;
cardEl.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
cardEl.addEventListener('touchend', (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); } else { cardEl.classList.toggle('flipped'); }
  touchStartX = null;
});


// Menu buttons (atualizam header nav e a seção)
// Header start: open the play area so the user can choose mode/difficulty/list manually
startBtn && startBtn.addEventListener('click', () => {
  // Open the start flow: show mode selection menu
  pendingMode = null;
  currentDifficulty = null;
  // hide any pickers if open
  if (listPickerModal) listPickerModal.classList.add('hidden');
  if (difficultySelector) difficultySelector.classList.add('hidden');
  showSection(modeMenuSection);
  updateHeaderNav(modeMenuSection);
});
createBtn && createBtn.addEventListener('click', () => {
  // abrir criação como nova (reset) quando não estiver em modo edição
  if (editingListIndex === null) {
    tempList = [];
    listNameInput.value = '';
    fileInput.value = '';
    nameInput.value = '';
    renderPreview();
  }
  showSection(sectionCreate);
  updateHeaderNav(sectionCreate);
});
viewBtn && viewBtn.addEventListener('click', () => { renderSavedList(); showSection(sectionView); updateHeaderNav(sectionView); });

// Menu 'Iniciar' should open the play area and let the user choose mode/difficulty/list
menuStart && menuStart.addEventListener('click', () => {
  // Open the start flow from main menu -> mode selection
  pendingMode = null;
  currentDifficulty = null;
  if (listPickerModal) listPickerModal.classList.add('hidden');
  if (difficultySelector) difficultySelector.classList.add('hidden');
  showSection(modeMenuSection);
  updateHeaderNav(modeMenuSection);
});
menuCreate && menuCreate.addEventListener('click', () => {
  if (editingListIndex === null) {
    tempList = [];
    listNameInput.value = '';
    fileInput.value = '';
    nameInput.value = '';
    renderPreview();
  }
  showSection(sectionCreate); updateHeaderNav(sectionCreate);
});
menuView && menuView.addEventListener('click', () => { renderSavedList(); showSection(sectionView); updateHeaderNav(sectionView); });
menuStats && menuStats.addEventListener('click', () => { renderStatsPage(); showSection(sectionStats); updateHeaderNav(sectionStats); });

// Voltar da tela de criação para o menu (preserva temporários por padrão)
createBackBtn && createBackBtn.addEventListener('click', () => {
  // apenas volta ao menu e mantém tempList e preview (não limpa)
  showSection(sectionMenu);
  updateHeaderNav(sectionMenu);
});

statsBackBtn && statsBackBtn.addEventListener('click', () => {
  showSection(sectionMenu);
  updateHeaderNav(sectionMenu);
});

resetStatsBtn && resetStatsBtn.addEventListener('click', () => {
  showConfirm('Tem certeza que deseja apagar todas as estatísticas? Esta ação não pode ser desfeita.', () => {
    localStorage.removeItem(STATS_STORAGE_KEY);
    renderStatsPage();
    showToast('Estatísticas apagadas.', null, null, 3000);
  });
});

viewListBackBtn && viewListBackBtn.addEventListener('click', () => {
  showSection(sectionMenu);
  updateHeaderNav(sectionMenu);
});

// Create list actions
addItemBtn && addItemBtn.addEventListener('click', addTempItem);
saveListBtn && saveListBtn.addEventListener('click', saveList);

// Play mode elements
const modeCardsBtn = document.getElementById('mode-cards');
const modeMcBtn = document.getElementById('mode-mc');
const modeTypeBtn = document.getElementById('mode-type');
const altArea = document.getElementById('alt-area');
const altImage = document.getElementById('alt-image');
const altOptions = document.getElementById('alt-options');
const altFeedback = document.getElementById('alt-feedback');
const typeArea = document.getElementById('type-area');
const typeImage = document.getElementById('type-image');
const typeInput = document.getElementById('type-input');
const typeSubmit = document.getElementById('type-submit');
const typeFeedback = document.getElementById('type-feedback');
const playScore = document.getElementById('play-score');
const exitPlayBtn = document.getElementById('exit-play');
const prevBtn = document.getElementById('prev');
const flipBtn = document.getElementById('flip');
const nextBtn = document.getElementById('next');
// Reversed mode elements
const altAreaReversed = document.getElementById('alt-area-reversed');
const reversedAltQuestion = document.getElementById('reversed-alt-question');
const reversedAltOptions = document.getElementById('reversed-alt-options');
const reversedAltFeedback = document.getElementById('reversed-alt-feedback');

// difficulty & list picker elements
const difficultySelector = document.getElementById('difficulty-selector');
const diffFacil = document.getElementById('diff-facil');
const diffMedio = document.getElementById('diff-medio');
const diffDificil = document.getElementById('diff-dificil');
const diffBack = document.getElementById('diff-back');
const playTimerEl = document.getElementById('play-timer');
const listPickerModal = document.getElementById('list-picker-modal');
const listPicker = document.getElementById('list-picker');
const listPickerCancel = document.getElementById('list-picker-cancel');
const roundOverModal = document.getElementById('round-over-modal');
const roundOverScore = document.getElementById('round-over-score');
const roundOverMenuBtn = document.getElementById('round-over-menu');
const roundOverRestartBtn = document.getElementById('round-over-restart');

// New menus for the start flow
const modeMenuSection = document.getElementById('mode-menu');
const difficultyMenuSection = document.getElementById('difficulty-menu');
const modeMenuBack = document.getElementById('mode-menu-back');
const modeMenuCards = document.getElementById('mode-menu-cards');
const modeMenuMc = document.getElementById('mode-menu-mc');
const modeMenuMcReversed = document.getElementById('mode-menu-mc-reversed');
const modeMenuType = document.getElementById('mode-menu-type');
const difficultyBack = document.getElementById('difficulty-back');
const difficultyFacil = document.getElementById('difficulty-facil');
const difficultyMedio = document.getElementById('difficulty-medio');
const difficultyDificil = document.getElementById('difficulty-dificil');

// pending state when user chooses mode but hasn't selected difficulty/list
let pendingMode = null; // 'cards'|'mc'|'type'|'mc-reversed' while waiting
let currentDifficulty = null; // 'facil'|'medio'|'dificil'

// answer timer
let answerTimer = null;
let answerTimeLeft = 0;

let playMode = 'cards'; // 'cards' | 'mc' | 'type' | 'mc-reversed'
let playCorrect = 0;
let playLocked = false; // when true, user is locked into the chosen mode until they exit to menu
let sessionActive = false; // true when a play session has started (list+difficulty selected)
// debug flag
const DEBUG = false;

// Theme helpers
function applyTheme(t) {
  if (t === 'dark') {
    document.body.classList.add('dark');
    if (themeToggleBtn) themeToggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    document.body.classList.remove('dark');
    if (themeToggleBtn) themeToggleBtn.setAttribute('aria-pressed', 'false');
  }
}

// initialize theme from storage
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') applyTheme('dark');
} catch (e) { /* ignore */ }

// toggle handler
themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  themeToggleBtn.setAttribute('aria-pressed', String(isDark));
  try { 
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); 
  } catch (e) {
    console.error('Failed to save theme preference:', e);
  }
});

function disableOtherModeButtons(activeMode) {
  const btns = [modeCardsBtn, modeMcBtn, modeTypeBtn];
  btns.forEach(b => {
    if (!b) return;
    const idMode = b.id.replace('mode-', '');
    b.disabled = idMode !== activeMode;
  });
}

function unlockModeButtons() {
  const btns = [modeCardsBtn, modeMcBtn, modeTypeBtn];
  btns.forEach(b => { if (!b) return; b.disabled = false; });
}

/**
 * Set the current play mode.
 * If `lock` is true (user selected via UI), lock other mode buttons so the user cannot
 * play multiple modes at the same time. Programmatic calls (openList) should pass
 * lock=false to avoid locking immediately.
 */
function setPlayMode(mode, lock = false) {
  // if already locked into a mode, ignore requests to change to another mode
  if (playLocked && mode !== playMode) return;
  playMode = mode;
  modeCardsBtn.classList.toggle('active', mode === 'cards');
  modeMcBtn.classList.toggle('active', mode === 'mc');
  modeTypeBtn.classList.toggle('active', mode === 'type');
  // show/hide containers
  const cardSection = document.querySelector('.card-wrap');
  if (cardSection) cardSection.classList.toggle('hidden', mode !== 'cards');
  altArea.classList.toggle('hidden', mode !== 'mc');
  typeArea.classList.toggle('hidden', mode !== 'type');
  altAreaReversed.classList.toggle('hidden', mode !== 'mc-reversed');

  // hide navigation controls (Anterior/Virar/Proximo) when NOT in Cards mode
  // (they don't belong to Alternatives or Digitar modes)
  const hideNav = mode !== 'cards';
  if (prevBtn) prevBtn.classList.toggle('hidden', hideNav);
  if (flipBtn) flipBtn.classList.toggle('hidden', hideNav);
  if (nextBtn) nextBtn.classList.toggle('hidden', hideNav);

  if (lock) {
    // user explicitly selected a mode -> lock other mode buttons and show exit control
    playLocked = true;
    disableOtherModeButtons(mode);
    if (exitPlayBtn) exitPlayBtn.classList.remove('hidden');
  } else {
    // programmatic switch -> keep controls unlocked
    playLocked = false;
    unlockModeButtons();
    if (exitPlayBtn) exitPlayBtn.classList.add('hidden');
  }

  // render according to chosen mode
  renderCurrentMode();
}

function renderCurrentMode() {
  // update position/score
  playScore.textContent = `${playCorrect} / ${cards.length || 0}`;
  if (!cards || !cards.length) {
    // nothing — also ensure mode-specific UI is hidden so type input doesn't linger
    if (altArea) altArea.classList.add('hidden');
    if (typeArea) typeArea.classList.add('hidden');
    if (altAreaReversed) altAreaReversed.classList.add('hidden');
    return;
  }
  if (playMode === 'cards') {
    render();
  } else if (playMode === 'mc') {
    renderMc();
  } else if (playMode === 'mc-reversed') {
    renderMcReversed();
  } else if (playMode === 'type') {
    renderType();
  }
}

function renderMc() {
  const c = cards[index];
  altImage.innerHTML = `<img src="${c.image}" alt="image">`;
  altOptions.innerHTML = '';
  altFeedback.textContent = '';
  // build options. number depends on difficulty: facil=2, medio=3, dificil=4
  const optionCount = currentDifficulty === 'facil' ? 2 : currentDifficulty === 'medio' ? 3 : 4;
  const names = cards.map(x => x.name);
  const correct = c.name;
  const choices = [correct];
  // gather distractors unique and not equal to correct
  const pool = names.filter(n => n !== correct);
  shuffleArray(pool);
  while (choices.length < optionCount && pool.length) choices.push(pool.shift());
  // if not enough from same list, pull from other saved lists
  if (choices.length < optionCount) {
    const allLists = loadSavedLists();
    const extras = [];
    allLists.forEach(l => l.items.forEach(it => { if (it.name !== correct) extras.push(it.name); }));
    shuffleArray(extras);
    while (choices.length < optionCount && extras.length) choices.push(extras.shift());
  }
  shuffleArray(choices);
  choices.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      // disable options after selection
      Array.from(altOptions.children).forEach(ch => ch.disabled = true);
      // stop timer for this question
      stopAnswerTimer();
      if (opt === correct) {
        b.classList.add('correct');
        altFeedback.textContent = 'Correto!';
        playCorrect++;
        playSound('assets/sounds/acerto.mp3');
        updateCardStat(c.image, -1); // Correct answer
      } else {
        b.classList.add('wrong');
        altFeedback.textContent = `Errado — resposta: ${correct}`;
        updateCardStat(c.image, 1); // Incorrect answer
        // highlight correct button
        Array.from(altOptions.children).forEach(ch => { if (ch.textContent === correct) ch.classList.add('correct'); });
      }
      // update score
      playScore.textContent = `${playCorrect} / ${cards.length || 0}`;
      // auto-advance after brief delay
      setTimeout(() => { next(); }, 1000);
    });
    altOptions.appendChild(b);
  });
  // start timer for this question
  startAnswerTimer();
}

function renderMcReversed() {
  const c = cards[index];
  reversedAltQuestion.textContent = c.name;
  reversedAltOptions.innerHTML = '';
  reversedAltFeedback.textContent = '';

  const optionCount = 3; // Always 3 image options as requested
  const images = cards.map(x => x.image);
  const correctImage = c.image;
  const choices = [correctImage];

  const pool = images.filter(img => img !== correctImage);
  shuffleArray(pool);
  while (choices.length < optionCount && pool.length) {
    choices.push(pool.shift());
  }

  shuffleArray(choices);

  choices.forEach(imgSrc => {
    const btn = document.createElement('button');
    btn.className = 'opt-img'; // You might want to style this
    btn.innerHTML = `<img src="${imgSrc}" alt="option">`;
    btn.addEventListener('click', () => {
      Array.from(reversedAltOptions.children).forEach(child => { child.disabled = true; });
      stopAnswerTimer();
      if (imgSrc === correctImage) {
        btn.classList.add('correct');
        reversedAltFeedback.textContent = 'Correto!';
        playCorrect++;
        playSound('assets/sounds/acerto.mp3');
        updateCardStat(c.image, -1); // Correct answer
      } else {
        btn.classList.add('wrong');
        reversedAltFeedback.textContent = 'Errado!';
        updateCardStat(c.image, 1); // Incorrect answer
        // Highlight the correct one
        Array.from(reversedAltOptions.children).forEach(child => {
            const img = child.querySelector('img');
            if (img && img.src === correctImage) {
                child.classList.add('correct');
            }
        });
      }
      playScore.textContent = `${playCorrect} / ${cards.length || 0}`;
      setTimeout(() => { next(); }, 1200);
    });
    reversedAltOptions.appendChild(btn);
  });
  startAnswerTimer();
}

function renderType() {
  const c = cards[index];
  typeImage.innerHTML = `<img src="${c.image}" alt="image">`;
  typeInput.value = '';
  typeFeedback.textContent = '';
  // start timer for typing question
  startAnswerTimer();
}

// helpers
function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

// New flow: clicking a mode will either open difficulty selector (mc/type) or list picker (cards).
// We'll drive the mode -> difficulty -> list flow using the new standalone menus.
// Mode menu buttons (shown after clicking Iniciar)
modeMenuCards && modeMenuCards.addEventListener('click', () => {
  pendingMode = 'cards';
  currentDifficulty = null;
  if (DEBUG) console.log('[DEBUG] mode-menu: cards selected', { pendingMode });
  // Cards mode does not use difficulty — skip difficulty menu and show list picker
  if (!populateListPicker()) {
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  // hide the mode menu and show the list picker modal
  showSection(null);
  if (listPickerModal) listPickerModal.classList.remove('hidden');
  updateHeaderNav(null);
});
modeMenuMc && modeMenuMc.addEventListener('click', () => {
  pendingMode = 'mc';
  currentDifficulty = null;
  if (DEBUG) console.log('[DEBUG] mode-menu: mc selected', { pendingMode });
  showSection(difficultyMenuSection);
  updateHeaderNav(difficultyMenuSection);
});
modeMenuMcReversed && modeMenuMcReversed.addEventListener('click', () => {
  pendingMode = 'mc-reversed';
  currentDifficulty = null; // Reversed mode doesn't use difficulty for now
  if (DEBUG) console.log('[DEBUG] mode-menu: mc-reversed selected', { pendingMode });
  // Reversed MC mode does not use difficulty — skip difficulty menu and show list picker
  if (!populateListPicker()) {
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  showSection(null);
  if (listPickerModal) listPickerModal.classList.remove('hidden');
  updateHeaderNav(null);
});
modeMenuType && modeMenuType.addEventListener('click', () => {
  pendingMode = 'type';
  currentDifficulty = null;
  if (DEBUG) console.log('[DEBUG] mode-menu: type selected', { pendingMode });
  showSection(difficultyMenuSection);
  updateHeaderNav(difficultyMenuSection);
});

// Back from mode menu -> main menu
modeMenuBack && modeMenuBack.addEventListener('click', () => {
  pendingMode = null;
  currentDifficulty = null;
  showSection(sectionMenu);
  updateHeaderNav(sectionMenu);
});

// Difficulty menu handlers (standalone menu used in start flow)
difficultyFacil && difficultyFacil.addEventListener('click', () => {
  currentDifficulty = 'facil';
  if (DEBUG) console.log('[DEBUG] difficulty-menu selected', { currentDifficulty, pendingMode });
  // show list picker to choose a list and then start
  if (!populateListPicker()) {
    // inform user and offer to create a list
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  if (listPickerModal) listPickerModal.classList.remove('hidden');
});
difficultyMedio && difficultyMedio.addEventListener('click', () => {
  currentDifficulty = 'medio';
  if (DEBUG) console.log('[DEBUG] difficulty-menu selected', { currentDifficulty, pendingMode });
  if (!populateListPicker()) {
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  if (listPickerModal) listPickerModal.classList.remove('hidden');
});
difficultyDificil && difficultyDificil.addEventListener('click', () => {
  currentDifficulty = 'dificil';
  if (DEBUG) console.log('[DEBUG] difficulty-menu selected', { currentDifficulty, pendingMode });
  if (!populateListPicker()) {
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  if (listPickerModal) listPickerModal.classList.remove('hidden');
});

// Back from difficulty menu -> mode menu
difficultyBack && difficultyBack.addEventListener('click', () => {
  currentDifficulty = null;
  showSection(modeMenuSection);
  updateHeaderNav(modeMenuSection);
});

// difficulty button handlers (Portuguese)
diffFacil && diffFacil.addEventListener('click', () => { selectDifficulty('facil'); });
diffMedio && diffMedio.addEventListener('click', () => { selectDifficulty('medio'); });
diffDificil && diffDificil.addEventListener('click', () => { selectDifficulty('dificil'); });
// back (voltar) from difficulty selector
diffBack && diffBack.addEventListener('click', () => {
  pendingMode = null;
  currentDifficulty = null;
  if (difficultySelector) difficultySelector.classList.add('hidden');
});

// list picker cancel
listPickerCancel && listPickerCancel.addEventListener('click', () => {
  // hide the modal and return to the mode selection menu
  pendingMode = null;
  currentDifficulty = null;
  if (listPickerModal) listPickerModal.classList.add('hidden');
  showSection(modeMenuSection);
  updateHeaderNav(modeMenuSection);
});

// helper: populate list picker with saved lists
function populateListPicker() {
  const lists = loadSavedLists();
  if (!listPicker) return;
  listPicker.innerHTML = '';
  if (!lists.length) {
    listPicker.textContent = 'Nenhuma lista salva.';
    return false; // indicate there are no lists
  }
  lists.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'list-card';
    div.innerHTML = `<div class="meta"><strong>${escapeHtml(l.name)}</strong><div class="muted">${l.items.length} itens</div></div>`;
    div.addEventListener('click', () => {
      // user selected this list to play
      if (DEBUG) console.log('[DEBUG] listPicker selected', { index: i, name: l.name, pendingMode, currentDifficulty });
      if (pendingMode === 'cards') {
        startPlay('cards', null, i);
      } else if (pendingMode === 'mc' || pendingMode === 'type' || pendingMode === 'mc-reversed') {
        startPlay(pendingMode, currentDifficulty, i);
      }
      // hide picker
      if (listPickerModal) listPickerModal.classList.add('hidden');
    });
    listPicker.appendChild(div);
  });
  return true;
}

// user selected a difficulty
function selectDifficulty(d) {
  currentDifficulty = d; // 'facil'|'medio'|'dificil'
  // hide difficulty UI
  if (difficultySelector) difficultySelector.classList.add('hidden');
  // ALWAYS ask the user to pick a list after selecting difficulty
  if (DEBUG) console.log('[DEBUG] difficulty selected', { difficulty: d, pendingMode });
  if (!populateListPicker()) {
    showToast('Nenhuma lista salva. Crie uma lista primeiro.', 'Criar', () => {
      showSection(sectionCreate);
      updateHeaderNav(sectionCreate);
    });
    return;
  }
  if (listPickerModal) listPickerModal.classList.remove('hidden');
}

// start play with given mode, difficulty and optional listIndex
function startPlay(mode, difficulty, listIndex) {
  // if listIndex provided, load it
  if (typeof listIndex === 'number') {
    const lists = loadSavedLists();
    const list = lists[listIndex];
    if (!list || !list.items || !list.items.length) { alert('Lista vazia.'); return; }
    cards = list.items.map(it => ({ image: it.image, name: it.name }));
    shuffleArray(cards); // Always shuffle on start
    index = 0;
    playCorrect = 0;
  }
  currentDifficulty = difficulty || currentDifficulty;
  // mark session as active: user selected list (and difficulty if applicable)
  sessionActive = true;
  if (DEBUG) console.log('[DEBUG] startPlay', { mode, difficulty: currentDifficulty, listIndex });
  // lock into chosen mode now
  setPlayMode(mode, true);
  // show play area
  // ensure non-relevant mode areas are hidden when starting cards
  if (mode === 'cards') {
    if (altArea) altArea.classList.add('hidden');
    if (typeArea) typeArea.classList.add('hidden');
    const cardSection = document.querySelector('.card-wrap');
    if (cardSection) cardSection.classList.remove('hidden');
  } else if (mode === 'mc') {
    // ensure typing UI is hidden for mc
    if (typeArea) typeArea.classList.add('hidden');
    if (altArea) altArea.classList.remove('hidden');
  } else if (mode === 'type') {
    // show typing UI only for type
    if (altArea) altArea.classList.add('hidden');
    if (typeArea) typeArea.classList.remove('hidden');
    // focus input for convenience
    if (typeInput) typeInput.focus();
  }
  showSection(sectionFlash);
  updateHeaderNav(sectionFlash);
  // when starting, if mode is mc or type start the timer for the first question
  if (mode === 'mc' || mode === 'type' || mode === 'mc-reversed') startAnswerTimer();
}

// exit/back button inside play area: returns to main menu and unlocks modes
exitPlayBtn && exitPlayBtn.addEventListener('click', () => {
  // If a session was active, fully reset game state so restarting begins fresh
  if (sessionActive) {
    sessionActive = false;
    // stop timers and clear play data
    stopAnswerTimer();
    cards = [];
    index = 0;
    playCorrect = 0;
    currentDifficulty = null;
    pendingMode = null;
    // unlock and reset modes
    playLocked = false;
    unlockModeButtons();
    if (exitPlayBtn) exitPlayBtn.classList.add('hidden');
    // hide pickers
    if (listPickerModal) listPickerModal.classList.add('hidden');
    if (difficultySelector) difficultySelector.classList.add('hidden');
    // reset play view and return to menu
    setPlayMode('cards', false);
    showSection(sectionMenu);
    updateHeaderNav(sectionMenu);
  } else {
    // no active session: just return to menu without clearing a started session
    playLocked = false;
    unlockModeButtons();
    if (exitPlayBtn) exitPlayBtn.classList.add('hidden');
    pendingMode = null;
    currentDifficulty = null;
    if (listPickerModal) listPickerModal.classList.add('hidden');
    if (difficultySelector) difficultySelector.classList.add('hidden');
    stopAnswerTimer();
    setPlayMode('cards', false);
    showSection(sectionMenu);
    updateHeaderNav(sectionMenu);
  }
});

// next/prev should rerender according to mode
function next() {
  if (!cards.length) return;
  index++;
  if (index >= cards.length) {
    showRoundOverModal();
  } else {
    renderCurrentMode();
  }
}

function prev() {
  if (!cards.length) return;
  index = (index - 1 + cards.length) % cards.length;
  renderCurrentMode();
}

function showRoundOverModal() {
  addActivity(); // Record that a round was completed today
  roundOverScore.textContent = `Você acertou ${playCorrect} de ${cards.length}.`;
  roundOverModal.classList.remove('hidden');
}

function restartRound() {
  roundOverModal.classList.add('hidden');
  playCorrect = 0;
  index = 0;
  shuffleArray(cards);
  renderCurrentMode();
}

// Round over modal listeners
roundOverRestartBtn.addEventListener('click', restartRound);
roundOverMenuBtn.addEventListener('click', () => {
  roundOverModal.classList.add('hidden');
  // Simulate exit button click to properly reset state
  exitPlayBtn.click();
});

// type submit handler
// normalize helper: remove diacritics and lowercase
function normalizeText(s) {
  if (!s) return '';
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  } catch (e) {
    // fallback: simple remove combining marks range
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}

// Timer helpers
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startAnswerTimer() {
  // only for mc/type
  if (!playTimerEl) return;
  stopAnswerTimer();
  let seconds = 30; // default
  if (currentDifficulty === 'facil') seconds = 60;
  else if (currentDifficulty === 'medio') seconds = 30;
  else if (currentDifficulty === 'dificil') seconds = 15;
  answerTimeLeft = seconds;
  playTimerEl.textContent = formatTime(answerTimeLeft);
  playTimerEl.classList.remove('hidden');
  answerTimer = setInterval(() => {
    answerTimeLeft -= 1;
    if (answerTimeLeft < 0) {
      // expired
      stopAnswerTimer();
      handleTimeExpired();
      return;
    }
    playTimerEl.textContent = formatTime(answerTimeLeft);
  }, 1000);
}

function stopAnswerTimer() {
  if (answerTimer) { clearInterval(answerTimer); answerTimer = null; }
  if (playTimerEl) playTimerEl.textContent = '00:00';
}

function handleTimeExpired() {
  // Called when timer reaches 0 for current question
  if (!cards || !cards.length) return;
  const correct = (cards[index] && cards[index].name) || '';
  if (playMode === 'mc') {
    // disable options and show correct
    Array.from(altOptions.children).forEach(ch => { ch.disabled = true; if (ch.textContent === correct) ch.classList.add('correct'); });
    altFeedback.textContent = `Tempo esgotado — resposta: ${correct}`;
  } else if (playMode === 'type') {
    typeFeedback.textContent = `Tempo esgotado — resposta: ${correct}`;
  } else if (playMode === 'mc-reversed') {
    const correctImage = (cards[index] && cards[index].image) || '';
    Array.from(reversedAltOptions.children).forEach(child => {
        child.disabled = true;
        const img = child.querySelector('img');
        if (img && img.src === correctImage) {
            child.classList.add('correct');
        }
    });
    reversedAltFeedback.textContent = `Tempo esgotado!`;
  }
  // advance to next after short delay
  setTimeout(() => { next(); }, 1200);
}

typeSubmit && typeSubmit.addEventListener('click', () => {
  const valRaw = (typeInput.value || '');
  const val = valRaw.trim();
  const correctRaw = (cards[index] && cards[index].name) || '';
  if (!val) return;

  // stop timer for this question
  stopAnswerTimer();

  let ok = false;
  const diff = currentDifficulty || 'medio';
  if (diff === 'facil') {
    // substring match, accent-insensitive
    ok = normalizeText(correctRaw).includes(normalizeText(val));
  } else if (diff === 'medio') {
    // accent-insensitive exact
    ok = normalizeText(val) === normalizeText(correctRaw);
  } else {
    // dificil: strict exact match (including accents, case-sensitive)
    ok = val === correctRaw.trim();
  }

  if (ok) {
    typeFeedback.textContent = 'Correto!';
    playCorrect++;
    playSound('assets/sounds/acerto.mp3');
    updateCardStat(cards[index].image, -1); // Correct answer
  } else {
    typeFeedback.textContent = `Errado — resposta: ${correctRaw}`;
    updateCardStat(cards[index].image, 1); // Incorrect answer
  }
  playScore.textContent = `${playCorrect} / ${cards.length || 0}`;
  // auto-advance after short delay
  setTimeout(() => { next(); }, 1000);
});

// when opening a list, reset play state
function openList(listIndex) {
  const lists = loadSavedLists();
  const list = lists[listIndex];
  if (!list || !list.items || !list.items.length) { alert('Lista vazia.'); return; }
  cards = list.items.map(it => ({ image: it.image, name: it.name }));
  index = 0;
  playCorrect = 0;
  // open with default 'cards' mode and lock it to show the exit button
  setPlayMode('cards', true);
  showSection(sectionFlash);
  updateHeaderNav(sectionFlash);
}

// initial UI
tempList = [];
showSection(sectionMenu);
renderSavedList();
