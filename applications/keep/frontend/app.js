import { sharedStore } from './shared-store.js';
import { readSeedValues } from './requirement-seeds.js';

const STORE_KEY = 'keep-notes-v1';
const PRIVATE_KEY = 'keep-notes-private-v1';

/* ---------- state ---------- */
let state = null;
let privateState = null;

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function loadShared() {
  const raw = sharedStore.getItem(STORE_KEY);
  if (raw && typeof raw === 'object') return raw;
  return null;
}

function saveShared() {
  sharedStore.setItem(STORE_KEY, state);
}

function loadPrivate() {
  try {
    const raw = localStorage.getItem(PRIVATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function savePrivate() {
  localStorage.setItem(PRIVATE_KEY, JSON.stringify(privateState));
}

function initState() {
  let s = loadShared();
  if (!s) {
    const defaults = readSeedValues('default label') || [];
    const labels = [];
    for (const d of defaults) {
      if (d && d.name) {
        labels.push({ id: uid('label'), name: d.name, icon: d.icon || 'reminder', isDefault: true });
      }
    }
    if (!labels.some(l => l.name === 'Reminders')) {
      labels.push({ id: uid('label'), name: 'Reminders', icon: 'reminder', isDefault: true });
    }
    s = { notes: [], labels };
    state = s;
    saveShared();
  } else {
    state = s;
    if (!Array.isArray(state.notes)) state.notes = [];
    if (!Array.isArray(state.labels)) state.labels = [];
  }
  let p = loadPrivate();
  if (!p) {
    p = {
      sidebarExpanded: true,
      layout: 'grid',
      settings: { addToBottom: false, moveCheckedToBottom: false },
      route: { view: 'notes', labelId: null },
      search: ''
    };
    privateState = p;
    savePrivate();
  } else {
    privateState = p;
    if (!privateState.settings) privateState.settings = { addToBottom: false, moveCheckedToBottom: false };
    if (!privateState.route) privateState.route = { view: 'notes', labelId: null };
    if (typeof privateState.search !== 'string') privateState.search = '';
  }
}

/* ---------- helpers ---------- */
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getLabel(id) {
  return state.labels.find(l => l.id === id) || null;
}

function activeNotes() {
  return state.notes.filter(n => !n.archived && !n.deleted);
}

function archivedNotes() {
  return state.notes.filter(n => n.archived && !n.deleted);
}

function deletedNotes() {
  return state.notes.filter(n => n.deleted);
}

function noteMatchesSearch(n, q) {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (n.title || '').toLowerCase().includes(lq) || (n.content || '').toLowerCase().includes(lq);
}

function noteHasLabel(n, labelId) {
  return Array.isArray(n.labelIds) && n.labelIds.includes(labelId);
}

/* ---------- icons ---------- */
const ICONS = {
  notes: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
  reminder: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
  label: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.63 5.84C17.27 5.33 16.67 5 16 5H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  archive: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>',
  list: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>',
  palette: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
};

/* ---------- transient UI state ---------- */
let ui = {
  editor: null,          // { noteId|null, draft }
  labelChooser: null,    // { noteId|null, draftLabelIds }
  editLabelsOpen: false,
  settingsOpen: false,
  settingsDraft: null,
  emptyTrashOpen: false,
  notification: null,    // { kind, message, undo }
  openMenuNoteId: null,
  openColorNoteId: null,
  settingsMenuOpen: false,
  searchFocused: false,
  editorColorOpen: false
};

/* ---------- rendering ---------- */
const app = document.getElementById('app');

function renderMain() {
  const view = privateState.route.view;
  if (view === 'archived') return renderArchivedView();
  if (view === 'trash') return renderTrashView();
  return renderNotesView();
}

function render() {
  const mainHtml = renderMain();

  app.innerHTML = `
    <div class="app-shell ${privateState.sidebarExpanded ? '' : 'collapsed'}">
      <header class="topbar">
        <button type="button" class="icon-btn" data-action="toggle-sidebar" aria-label="Toggle sidebar" aria-expanded="${privateState.sidebarExpanded ? 'true' : 'false'}">${ICONS.menu}</button>
        <span class="brand">Keep</span>
        <div class="search-wrap">
          <div class="search-box">
            ${ICONS.search}
            <input type="search" role="searchbox" aria-label="Search" placeholder="Search" id="search-input" value="${esc(privateState.search)}" autocomplete="off">
          </div>
          ${ui.searchFocused ? renderSuggestedFilters() : ''}
        </div>
        <div class="topbar-actions">
          <button type="button" class="icon-btn" data-action="toggle-layout" aria-label="${privateState.layout === 'grid' ? 'List view' : 'Grid view'}">${privateState.layout === 'grid' ? ICONS.list : ICONS.grid}</button>
          <div class="menu-anchor">
            <button type="button" class="icon-btn" data-action="toggle-settings-menu" aria-label="Settings menu" aria-haspopup="menu" aria-expanded="${ui.settingsMenuOpen ? 'true' : 'false'}">${ICONS.settings}</button>
            ${ui.settingsMenuOpen ? `<div class="dropdown" role="menu"><button type="button" role="menuitem" data-action="open-settings">Settings</button></div>` : ''}
          </div>
        </div>
      </header>
      <div class="body-row">
        <nav class="sidebar" role="navigation" aria-label="Sidebar">
          ${renderSidebar()}
        </nav>
        <main class="main-content">
          ${mainHtml}
        </main>
      </div>
      ${renderNotification()}
      ${renderEditor()}
      ${renderLabelChooser()}
      ${renderEditLabels()}
      ${renderSettings()}
      ${renderEmptyTrash()}
    </div>
  `;
}

function renderSidebar() {
  const route = privateState.route;
  const exp = privateState.sidebarExpanded;
  const navBtn = (action, label, icon, current, extra = '') => `
    <button type="button" class="nav-item ${current ? 'current' : ''}" data-action="${action}" ${extra} aria-current="${current ? 'true' : 'false'}" aria-label="${esc(label)}">
      <span class="nav-icon">${icon}</span>
      <span class="nav-text" ${exp ? '' : 'hidden'}>${esc(label)}</span>
    </button>`;
  let html = '';
  html += navBtn('nav-notes', 'Notes', ICONS.notes, route.view === 'notes' && !route.labelId);
  html += navBtn('nav-reminders', 'Reminders', ICONS.reminder, route.view === 'label' && route.labelId === defaultLabelId());
  for (const l of state.labels) {
    if (l.isDefault) continue;
    html += navBtn('nav-label', l.name, ICONS.label, route.view === 'label' && route.labelId === l.id, `data-label-id="${esc(l.id)}"`);
  }
  html += navBtn('nav-edit-labels', 'Edit Labels', ICONS.edit, false);
  html += navBtn('nav-archived', 'Archived', ICONS.archive, route.view === 'archived');
  html += navBtn('nav-trash', 'Trash', ICONS.trash, route.view === 'trash');
  return html;
}

function defaultLabelId() {
  const l = state.labels.find(x => x.isDefault && x.name === 'Reminders') || state.labels.find(x => x.isDefault);
  return l ? l.id : null;
}

function renderSuggestedFilters() {
  const def = state.labels.find(l => l.isDefault);
  return `
    <div class="suggested-filters" role="region" aria-label="Suggested filters">
      <div class="suggested-title">Suggested filters</div>
      ${def ? `<button type="button" class="chip" data-action="suggest-reminders">${ICONS.reminder}<span>${esc(def.name)}</span></button>` : ''}
    </div>`;
}

function renderNotesView() {
  const route = privateState.route;
  const q = privateState.search.trim();
  let notes = activeNotes();
  if (route.view === 'label' && route.labelId) {
    notes = notes.filter(n => noteHasLabel(n, route.labelId));
  }
  if (q) notes = notes.filter(n => noteMatchesSearch(n, q));
  const pinned = notes.filter(n => n.pinned);
  const other = notes.filter(n => !n.pinned);
  const layout = privateState.layout;
  const desc = layout === 'grid' ? 'Grid view' : 'List view';
  return `
    <div class="notes-toolbar">
      <button type="button" class="take-note" data-action="take-note" aria-label="Take a note">Take a note</button>
    </div>
    <section class="notes-region" role="region" aria-label="Notes" aria-description="${desc}">
      <div class="section-label">Pinned</div>
      <div class="notes-grid ${layout}" role="region" aria-label="Pinned notes">${pinned.map(n => renderNoteCard(n, q)).join('')}</div>
      <div class="section-label">Others</div>
      <div class="notes-grid ${layout}" role="region" aria-label="Other notes">${other.map(n => renderNoteCard(n, q)).join('')}</div>
    </section>
  `;
}

function renderArchivedView() {
  const notes = archivedNotes();
  return `
    <section class="notes-region" role="region" aria-label="Notes" aria-description="${privateState.layout === 'grid' ? 'Grid view' : 'List view'}">
      <div class="section-label">Archived</div>
      <div class="notes-grid ${privateState.layout}" role="region" aria-label="Archived notes">
        ${notes.map(n => renderNoteCard(n, '', true)).join('')}
      </div>
      ${!notes.length ? `<div class="empty-state">Your archived notes appear here</div>` : ''}
    </section>
  `;
}

function renderTrashView() {
  const notes = deletedNotes();
  return `
    <section class="notes-region" role="region" aria-label="Notes" aria-description="${privateState.layout === 'grid' ? 'Grid view' : 'List view'}">
      <div class="trash-header">
        <div class="section-label">Trash</div>
        <button type="button" class="text-btn" data-action="empty-trash">Empty Trash</button>
      </div>
      <div class="notes-grid ${privateState.layout}" role="region" aria-label="Deleted notes">
        ${notes.map(n => renderNoteCard(n, '', false, true)).join('')}
      </div>
      ${!notes.length ? `<div class="empty-state">No notes in Trash</div>` : ''}
    </section>
  `;
}

function highlightContent(text, q) {
  if (!q) return esc(text);
  const lower = text.toLowerCase();
  const lq = q.toLowerCase();
  let out = '';
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(lq, i);
    if (idx === -1) { out += esc(text.slice(i)); break; }
    out += esc(text.slice(i, idx));
    out += `<mark class="highlight" role="region" aria-label="Highlight ${esc(q)}">${esc(q)}</mark>`;
    i = idx + q.length;
  }
  return out;
}

function renderNoteCard(n, q, archived = false, trashed = false) {
  const colorClass = n.color ? `color-${n.color}` : '';
  const labels = (n.labelIds || []).map(id => getLabel(id)).filter(Boolean);
  const colorName = n.color === 'lightgreen' ? 'Light green' : '';
  const bgLabel = colorName ? `Background color ${n.title}: ${colorName}` : `Background color ${n.title}`;
  const pinLabel = n.pinned ? `Unpin ${n.title}` : `Pin ${n.title}`;
  return `
    <article class="note-card ${colorClass}" role="region" aria-label="${esc(n.title)}" data-note-id="${esc(n.id)}">
      <div class="note-head">
        <button type="button" class="note-title-btn" data-action="open-note" data-note-id="${esc(n.id)}" aria-label="Open ${esc(n.title)}">${highlightContent(n.title, q)}</button>
        ${!trashed ? `<button type="button" class="icon-btn pin-btn" data-action="toggle-pin" data-note-id="${esc(n.id)}" aria-label="${esc(pinLabel)}" aria-pressed="${n.pinned ? 'true' : 'false'}">${ICONS.pin}</button>` : ''}
      </div>
      <div class="note-content">${highlightContent(n.content || '', q)}</div>
      ${labels.length ? `<div class="note-labels">${labels.map(l => `<span class="label-chip">${esc(l.name)}</span>`).join('')}</div>` : ''}
      <div class="note-actions">
        ${!trashed && !archived ? `<button type="button" class="icon-btn" data-action="open-color" data-note-id="${esc(n.id)}" aria-label="${esc(bgLabel)}">${ICONS.palette}</button>` : ''}
        ${archived ? `<button type="button" class="icon-btn" data-action="unarchive" data-note-id="${esc(n.id)}" aria-label="Unarchive ${esc(n.title)}">${ICONS.archive}</button>` : ''}
        ${!trashed && !archived ? `<button type="button" class="icon-btn" data-action="archive" data-note-id="${esc(n.id)}" aria-label="Archive ${esc(n.title)}">${ICONS.archive}</button>` : ''}
        ${!trashed ? `<div class="menu-anchor">
          <button type="button" class="icon-btn" data-action="toggle-note-menu" data-note-id="${esc(n.id)}" aria-label="More options ${esc(n.title)}" aria-haspopup="menu" aria-expanded="${ui.openMenuNoteId === n.id ? 'true' : 'false'}">${ICONS.more}</button>
          ${ui.openMenuNoteId === n.id ? `<div class="dropdown note-menu" role="menu">
            <button type="button" role="menuitem" data-action="menu-delete" data-note-id="${esc(n.id)}">Delete Note</button>
            <button type="button" role="menuitem" data-action="menu-change-labels" data-note-id="${esc(n.id)}">Change labels</button>
          </div>` : ''}
        </div>` : ''}
      </div>
      ${ui.openColorNoteId === n.id ? renderColorPalette(n.id) : ''}
    </article>
  `;
}

function renderColorPalette(noteId) {
  return `
    <div class="color-palette" role="group" aria-label="Background color">
      <button type="button" class="color-swatch swatch-lightgreen" data-action="set-color" data-note-id="${esc(noteId)}" data-color="lightgreen" aria-label="Light green"></button>
      <button type="button" class="color-swatch swatch-default" data-action="set-color" data-note-id="${esc(noteId)}" data-color="" aria-label="Default"></button>
    </div>`;
}

function renderNotification() {
  if (!ui.notification) return '';
  const n = ui.notification;
  return `
    <div class="notification" role="status" aria-label="${esc(n.message)}">
      <span class="notif-text">${esc(n.message)}</span>
      ${n.undo ? `<button type="button" class="text-btn" data-action="notif-undo">Undo</button>` : ''}
      <button type="button" class="text-btn" data-action="notif-dismiss">Dismiss notification</button>
    </div>`;
}

function renderEditor() {
  if (!ui.editor) return '';
  const d = ui.editor.draft;
  const labels = (d.labelIds || []).map(id => getLabel(id)).filter(Boolean);
  const colorName = d.color === 'lightgreen' ? 'Light green' : '';
  return `
    <div class="modal-backdrop">
      <div class="modal note-editor" role="dialog" aria-label="Note editor">
        <div class="editor-head">
          <input type="text" id="editor-title" aria-label="Title" placeholder="Title" value="${esc(d.title)}">
          <button type="button" class="icon-btn" data-action="editor-pin" aria-label="Pin note" aria-pressed="${d.pinned ? 'true' : 'false'}">${ICONS.pin}</button>
        </div>
        <textarea id="editor-content" aria-label="Content" placeholder="Take a note…" rows="6">${esc(d.content)}</textarea>
        ${labels.length ? `<div class="note-labels">${labels.map(l => `<span class="label-chip">${esc(l.name)}</span>`).join('')}</div>` : ''}
        <div class="editor-actions">
          <div class="menu-anchor">
            <button type="button" class="icon-btn" data-action="editor-color" aria-label="Background color" aria-expanded="${ui.editorColorOpen ? 'true' : 'false'}">${ICONS.palette}</button>
            ${ui.editorColorOpen ? `<div class="color-palette" role="group" aria-label="Background color">
              <button type="button" class="color-swatch swatch-lightgreen" data-action="editor-set-color" data-color="lightgreen" aria-label="Light green"></button>
              <button type="button" class="color-swatch swatch-default" data-action="editor-set-color" data-color="" aria-label="Default"></button>
            </div>` : ''}
          </div>
          <button type="button" class="icon-btn" data-action="editor-labels" aria-label="Change labels">${ICONS.label}</button>
          <span class="spacer"></span>
          <button type="button" class="text-btn" data-action="editor-close">Close</button>
        </div>
        ${colorName ? `<div class="editor-color-note">${esc(colorName)}</div>` : ''}
      </div>
    </div>`;
}

function renderLabelChooser() {
  if (!ui.labelChooser) return '';
  const draft = ui.labelChooser.draftLabelIds;
  return `
    <div class="modal-backdrop">
      <div class="modal label-chooser" role="dialog" aria-label="Note labels">
        <h2>Label note</h2>
        <div class="label-list">
          ${state.labels.map(l => `
            <label class="label-check">
              <input type="checkbox" data-action="toggle-label-check" data-label-id="${esc(l.id)}" ${draft.includes(l.id) ? 'checked' : ''}>
              <span>${esc(l.name)}</span>
            </label>`).join('')}
        </div>
        <div class="modal-actions">
          <button type="button" class="text-btn" data-action="label-chooser-done">Done</button>
        </div>
      </div>
    </div>`;
}

function renderEditLabels() {
  if (!ui.editLabelsOpen) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal edit-labels" role="dialog" aria-label="Edit Labels">
        <h2>Edit labels</h2>
        <div class="new-label-row">
          <input type="text" id="new-label-input" aria-label="New label" placeholder="New label">
          <button type="button" class="text-btn" data-action="create-label">Create label</button>
        </div>
        <div class="label-manage-list">
          ${state.labels.map(l => `
            <div class="label-manage-row" data-label-id="${esc(l.id)}">
              <input type="text" aria-label="Label name ${esc(l.name)}" value="${esc(l.name)}" data-label-input="${esc(l.id)}" ${l.isDefault ? 'readonly' : ''}>
              ${!l.isDefault ? `
                <button type="button" class="text-btn" data-action="save-label" data-label-id="${esc(l.id)}">Save label ${esc(l.name)}</button>
                <button type="button" class="text-btn danger" data-action="delete-label" data-label-id="${esc(l.id)}">Delete label ${esc(l.name)}</button>
              ` : ''}
            </div>`).join('')}
        </div>
        <div class="modal-actions">
          <button type="button" class="text-btn" data-action="edit-labels-done">Done</button>
        </div>
      </div>
    </div>`;
}

function renderSettings() {
  if (!ui.settingsOpen) return '';
  const d = ui.settingsDraft;
  return `
    <div class="modal-backdrop">
      <div class="modal settings" role="dialog" aria-label="Settings">
        <h2>Settings</h2>
        <label class="settings-check">
          <input type="checkbox" id="setting-add-bottom" ${d.addToBottom ? 'checked' : ''}>
          <span>Add new items to the bottom</span>
        </label>
        <label class="settings-check">
          <input type="checkbox" id="setting-move-checked" ${d.moveCheckedToBottom ? 'checked' : ''}>
          <span>Move checked items to bottom</span>
        </label>
        <div class="modal-actions">
          <button type="button" class="text-btn" data-action="settings-cancel">Cancel</button>
          <button type="button" class="text-btn" data-action="settings-save">Save</button>
        </div>
      </div>
    </div>`;
}

function renderEmptyTrash() {
  if (!ui.emptyTrashOpen) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-label="Empty Trash">
        <h2>Empty Trash?</h2>
        <p>All notes in Trash will be permanently deleted.</p>
        <div class="modal-actions">
          <button type="button" class="text-btn" data-action="empty-trash-cancel">Cancel</button>
          <button type="button" class="text-btn danger" data-action="empty-trash-confirm">Empty Trash</button>
        </div>
      </div>
    </div>`;
}

/* ---------- actions ---------- */
function setRoute(view, labelId = null) {
  privateState.route = { view, labelId };
  ui.searchFocused = false;
  savePrivate();
  render();
}

function openEditor(noteId) {
  let draft;
  if (noteId) {
    const n = state.notes.find(x => x.id === noteId);
    if (!n) return;
    draft = { title: n.title, content: n.content, pinned: !!n.pinned, color: n.color || '', labelIds: [...(n.labelIds || [])] };
  } else {
    draft = { title: '', content: '', pinned: false, color: '', labelIds: [] };
  }
  ui.editor = { noteId: noteId || null, draft };
  ui.editorColorOpen = false;
  render();
  const titleEl = document.getElementById('editor-title');
  if (titleEl) titleEl.focus();
}

function syncEditorDraft() {
  if (!ui.editor) return;
  const t = document.getElementById('editor-title');
  const c = document.getElementById('editor-content');
  if (t) ui.editor.draft.title = t.value;
  if (c) ui.editor.draft.content = c.value;
}

function closeEditor() {
  syncEditorDraft();
  const { noteId, draft } = ui.editor;
  if (noteId) {
    const n = state.notes.find(x => x.id === noteId);
    if (n) {
      n.title = draft.title;
      n.content = draft.content;
      n.pinned = draft.pinned;
      n.color = draft.color;
      n.labelIds = draft.labelIds;
    }
  } else {
    if (draft.title.trim() || draft.content.trim()) {
      const note = {
        id: uid('note'),
        title: draft.title,
        content: draft.content,
        pinned: draft.pinned,
        color: draft.color,
        labelIds: draft.labelIds,
        archived: false,
        deleted: false,
        createdAt: Date.now()
      };
      state.notes.push(note);
    }
  }
  saveShared();
  ui.editor = null;
  ui.editorColorOpen = false;
  render();
}

function showNotification(message, undoFn) {
  ui.notification = { message, undo: undoFn || null };
}

function deleteNote(noteId) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  n.deleted = true;
  n.archived = false;
  saveShared();
  ui.openMenuNoteId = null;
  showNotification('Note deleted', () => {
    n.deleted = false;
    saveShared();
    ui.notification = { message: 'Action undone', undo: null };
    render();
  });
  render();
}

function archiveNote(noteId) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  n.archived = true;
  saveShared();
  showNotification('Note archived', () => {
    n.archived = false;
    saveShared();
    ui.notification = { message: 'Action undone', undo: null };
    render();
  });
  render();
}

function unarchiveNote(noteId) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  n.archived = false;
  saveShared();
  render();
}

function togglePin(noteId) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  n.pinned = !n.pinned;
  saveShared();
  render();
}

function setNoteColor(noteId, color) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  n.color = color;
  saveShared();
  ui.openColorNoteId = null;
  render();
}

function openLabelChooser(noteId) {
  let draftLabelIds = [];
  if (noteId) {
    const n = state.notes.find(x => x.id === noteId);
    if (n) draftLabelIds = [...(n.labelIds || [])];
  } else if (ui.editor) {
    draftLabelIds = [...(ui.editor.draft.labelIds || [])];
  }
  ui.labelChooser = { noteId: noteId || null, draftLabelIds };
  ui.openMenuNoteId = null;
  render();
}

function closeLabelChooser() {
  const { noteId, draftLabelIds } = ui.labelChooser;
  if (noteId) {
    const n = state.notes.find(x => x.id === noteId);
    if (n) { n.labelIds = draftLabelIds; saveShared(); }
  } else if (ui.editor) {
    ui.editor.draft.labelIds = draftLabelIds;
  }
  ui.labelChooser = null;
  render();
}

function createLabel() {
  const input = document.getElementById('new-label-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (state.labels.some(l => l.name === name)) { input.value = ''; return; }
  state.labels.push({ id: uid('label'), name, icon: 'label', isDefault: false });
  saveShared();
  render();
}

function saveLabel(labelId) {
  const input = document.querySelector(`[data-label-input="${labelId}"]`);
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const l = getLabel(labelId);
  if (!l) return;
  l.name = name;
  saveShared();
  render();
}

function deleteLabel(labelId) {
  const idx = state.labels.findIndex(l => l.id === labelId);
  if (idx === -1) return;
  const l = state.labels[idx];
  if (l.isDefault) return;
  state.labels.splice(idx, 1);
  for (const n of state.notes) {
    if (Array.isArray(n.labelIds)) n.labelIds = n.labelIds.filter(id => id !== labelId);
  }
  if (privateState.route.view === 'label' && privateState.route.labelId === labelId) {
    privateState.route = { view: 'notes', labelId: null };
    savePrivate();
  }
  saveShared();
  render();
}

function openSettings() {
  ui.settingsMenuOpen = false;
  ui.settingsDraft = { ...privateState.settings };
  ui.settingsOpen = true;
  render();
}

function saveSettings() {
  const add = document.getElementById('setting-add-bottom');
  const move = document.getElementById('setting-move-checked');
  privateState.settings = {
    addToBottom: add ? add.checked : ui.settingsDraft.addToBottom,
    moveCheckedToBottom: move ? move.checked : ui.settingsDraft.moveCheckedToBottom
  };
  savePrivate();
  ui.settingsOpen = false;
  render();
}

function emptyTrash() {
  state.notes = state.notes.filter(n => !n.deleted);
  saveShared();
  ui.emptyTrashOpen = false;
  render();
}

/* ---------- event delegation ---------- */
app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) {
    // close menus when clicking outside
    if (ui.openMenuNoteId || ui.openColorNoteId || ui.settingsMenuOpen) {
      const inMenu = e.target.closest('.menu-anchor');
      const inPalette = e.target.closest('.color-palette');
      if (!inMenu && !inPalette) {
        ui.openMenuNoteId = null;
        ui.openColorNoteId = null;
        ui.settingsMenuOpen = false;
        render();
      }
    }
    return;
  }
  const action = btn.dataset.action;
  const noteId = btn.dataset.noteId;
  switch (action) {
    case 'toggle-sidebar':
      privateState.sidebarExpanded = !privateState.sidebarExpanded;
      savePrivate();
      render();
      break;
    case 'toggle-layout':
      privateState.layout = privateState.layout === 'grid' ? 'list' : 'grid';
      savePrivate();
      render();
      break;
    case 'toggle-settings-menu':
      ui.settingsMenuOpen = !ui.settingsMenuOpen;
      ui.openMenuNoteId = null;
      render();
      break;
    case 'open-settings':
      openSettings();
      break;
    case 'nav-notes':
      privateState.search = '';
      setRoute('notes');
      break;
    case 'nav-reminders': {
      const def = defaultLabelId();
      if (def) setRoute('label', def);
      break;
    }
    case 'nav-label':
      setRoute('label', btn.dataset.labelId);
      break;
    case 'nav-edit-labels':
      ui.editLabelsOpen = true;
      render();
      break;
    case 'nav-archived':
      setRoute('archived');
      break;
    case 'nav-trash':
      setRoute('trash');
      break;
    case 'suggest-reminders': {
      const def = defaultLabelId();
      if (def) { privateState.search = ''; savePrivate(); setRoute('label', def); }
      break;
    }
    case 'take-note':
      openEditor(null);
      break;
    case 'open-note':
      openEditor(noteId);
      break;
    case 'toggle-pin':
      togglePin(noteId);
      break;
    case 'archive':
      archiveNote(noteId);
      break;
    case 'unarchive':
      unarchiveNote(noteId);
      break;
    case 'toggle-note-menu':
      ui.openMenuNoteId = ui.openMenuNoteId === noteId ? null : noteId;
      ui.openColorNoteId = null;
      render();
      break;
    case 'menu-delete':
      deleteNote(noteId);
      break;
    case 'menu-change-labels':
      openLabelChooser(noteId);
      break;
    case 'open-color':
      ui.openColorNoteId = ui.openColorNoteId === noteId ? null : noteId;
      ui.openMenuNoteId = null;
      render();
      break;
    case 'set-color':
      setNoteColor(noteId, btn.dataset.color || '');
      break;
    case 'notif-undo':
      if (ui.notification && ui.notification.undo) ui.notification.undo();
      break;
    case 'notif-dismiss':
      ui.notification = null;
      render();
      break;
    case 'editor-pin':
      syncEditorDraft();
      ui.editor.draft.pinned = !ui.editor.draft.pinned;
      render();
      break;
    case 'editor-color':
      syncEditorDraft();
      ui.editorColorOpen = !ui.editorColorOpen;
      render();
      break;
    case 'editor-set-color':
      syncEditorDraft();
      ui.editor.draft.color = btn.dataset.color || '';
      ui.editorColorOpen = false;
      render();
      break;
    case 'editor-labels':
      syncEditorDraft();
      openLabelChooser(null);
      break;
    case 'editor-close':
      closeEditor();
      break;
    case 'toggle-label-check': {
      const lid = btn.dataset.labelId;
      const arr = ui.labelChooser.draftLabelIds;
      const i = arr.indexOf(lid);
      if (i === -1) arr.push(lid); else arr.splice(i, 1);
      break;
    }
    case 'label-chooser-done':
      closeLabelChooser();
      break;
    case 'create-label':
      createLabel();
      break;
    case 'save-label':
      saveLabel(btn.dataset.labelId);
      break;
    case 'delete-label':
      deleteLabel(btn.dataset.labelId);
      break;
    case 'edit-labels-done':
      ui.editLabelsOpen = false;
      render();
      break;
    case 'settings-save':
      saveSettings();
      break;
    case 'settings-cancel':
      ui.settingsOpen = false;
      render();
      break;
    case 'empty-trash':
      ui.emptyTrashOpen = true;
      render();
      break;
    case 'empty-trash-confirm':
      emptyTrash();
      break;
    case 'empty-trash-cancel':
      ui.emptyTrashOpen = false;
      render();
      break;
  }
});

app.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'search-input') {
    privateState.search = t.value;
    savePrivate();
    if (!t.value.trim()) {
      ui.searchFocused = false;
      const sf = document.querySelector('.suggested-filters');
      if (sf) sf.remove();
    }
    // re-render only the notes list area so the search input keeps focus and its value
    const mainEl = document.querySelector('.main-content');
    if (mainEl) mainEl.innerHTML = renderMain();
  } else if (t.id === 'editor-title' || t.id === 'editor-content') {
    if (ui.editor) {
      if (t.id === 'editor-title') ui.editor.draft.title = t.value;
      else ui.editor.draft.content = t.value;
    }
  }
});

app.addEventListener('focusin', (e) => {
  if (e.target.id === 'search-input') {
    if (!ui.searchFocused) {
      ui.searchFocused = true;
      const wrap = document.querySelector('.search-wrap');
      if (wrap && !wrap.querySelector('.suggested-filters')) {
        wrap.insertAdjacentHTML('beforeend', renderSuggestedFilters());
      }
    }
  }
});

app.addEventListener('focusout', (e) => {
  if (e.target.id === 'search-input') {
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active.closest && active.closest('.suggested-filters')) return;
      if (active && active.id === 'search-input') return;
      ui.searchFocused = false;
      const sf = document.querySelector('.suggested-filters');
      if (sf) sf.remove();
    }, 150);
  }
});

/* ---------- boot ---------- */
initState();
render();
