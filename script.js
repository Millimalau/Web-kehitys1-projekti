"use strict";

const STORAGE_KEY = "listasovellus-v2";
const COLORS = ["#e9461d", "#e62777", "#eef114", "#5dce79", "#09cfcf", "#bf5af2"];
const DEFAULT_COLOR = "#f3f5f7";

const MIN_ITEM = 2;
const MAX_ITEM = 80;
const MIN_NAME = 2;
const MAX_NAME = 40;

const nameInput = document.getElementById("list-name");
const nameError = document.getElementById("name-error");
const counter = document.getElementById("counter");
const form = document.getElementById("item-form");
const itemInput = document.getElementById("item-input");
const itemError = document.getElementById("item-error");
const itemList = document.getElementById("item-list");
const emptyMessage = document.getElementById("empty-message");
const savedPanel = document.getElementById("saved-panel");
const savedList = document.getElementById("saved-list");
const savedEmpty = document.getElementById("saved-empty");
const popup = document.getElementById("popup");

const btnLists = document.getElementById("btn-lists");
const btnNew = document.getElementById("btn-new");
const btnSave = document.getElementById("btn-save");
const btnClear = document.getElementById("btn-clear");

let idCounter = 0;
let openPaletteId = null;
let popupTimer = null;
let state = loadState();

/* ---------- Apufunktiot ---------- */

function makeId() {
  idCounter += 1;
  return Date.now() + "-" + idCounter;
}

function createList() {
  return { id: makeId(), name: "", items: [] };
}

function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

/* ---------- Tallennus (localStorage) ---------- */

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.current && Array.isArray(stored.saved)) {
      return stored;
    }
  } catch (error) {
    // Jos tallennettu data on rikki, aloitetaan puhtaalta
  }
  return { current: createList(), saved: [] };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Tallennus epäonnistui:", error);
  }
}

function upsertSaved(list) {
  const snapshot = copy(list);
  if (snapshot.name.trim() === "") {
    snapshot.name = "Nimetön lista";
  }
  const index = state.saved.findIndex(function (entry) {
    return entry.id === snapshot.id;
  });
  if (index >= 0) {
    state.saved[index] = snapshot;
  } else {
    state.saved.unshift(snapshot);
  }
}

/* ---------- Validointi ---------- */

function showError(input, errorElement, message) {
  input.classList.add("invalid");
  errorElement.textContent = message;
}

function clearError(input, errorElement) {
  input.classList.remove("invalid");
  errorElement.textContent = "";
}

function validateItem() {
  const value = itemInput.value.trim();

  if (value === "") {
    showError(itemInput, itemError, "Kirjoita ensin jotain kenttään.");
    return false;
  }
  if (value.length < MIN_ITEM) {
    showError(itemInput, itemError, "Kohdan tulee olla vähintään " + MIN_ITEM + " merkkiä pitkä.");
    return false;
  }
  if (value.length > MAX_ITEM) {
    showError(itemInput, itemError, "Kohta saa olla enintään " + MAX_ITEM + " merkkiä pitkä.");
    return false;
  }
  clearError(itemInput, itemError);
  return true;
}

function validateName() {
  const value = nameInput.value.trim();

  if (value === "") {
    showError(nameInput, nameError, "Anna listalle nimi ennen tallennusta.");
    return false;
  }
  if (value.length < MIN_NAME) {
    showError(nameInput, nameError, "Nimen tulee olla vähintään " + MIN_NAME + " merkkiä pitkä.");
    return false;
  }
  if (value.length > MAX_NAME) {
    showError(nameInput, nameError, "Nimi saa olla enintään " + MAX_NAME + " merkkiä pitkä.");
    return false;
  }
  clearError(nameInput, nameError);
  return true;
}

/* ---------- Ponnahdusikkuna ---------- */

function showPopup(message) {
  popup.textContent = message;
  popup.classList.add("show");
  clearTimeout(popupTimer);
  popupTimer = setTimeout(function () {
    popup.classList.remove("show");
  }, 1500);
}

/* ---------- Piirtäminen (DOM-skriptaus) ---------- */

function render() {
  renderItems();
  renderSaved();
}

function renderItems() {
  const list = state.current;
  nameInput.value = list.name;
  itemList.innerHTML = "";

  list.items.forEach(function (item) {
    const li = document.createElement("li");
    li.className = "item" + (item.done ? " done" : "");
    li.style.setProperty("--c", item.color);

    const row = document.createElement("div");
    row.className = "item-row";

    const circle = document.createElement("button");
    circle.type = "button";
    circle.className = "circle";
    circle.setAttribute("aria-pressed", String(item.done));
    circle.setAttribute("aria-label", "Merkitse tehdyksi: " + item.text);
    circle.addEventListener("click", function () {
      toggleItem(item.id);
    });

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item.text;

    const colorButton = document.createElement("button");
    colorButton.type = "button";
    colorButton.className = "icon-button color-button";
    colorButton.setAttribute("aria-label", "Vaihda väriä");
    colorButton.addEventListener("click", function () {
      openPaletteId = openPaletteId === item.id ? null : item.id;
      renderItems();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "Poista: " + item.text);
    deleteButton.addEventListener("click", function () {
      deleteItem(item.id);
    });

    row.appendChild(circle);
    row.appendChild(text);
    row.appendChild(colorButton);
    row.appendChild(deleteButton);
    li.appendChild(row);

    if (openPaletteId === item.id) {
      li.appendChild(createPalette(item));
    }

    itemList.appendChild(li);
  });

  emptyMessage.classList.toggle("hidden", list.items.length > 0);

  const doneCount = list.items.filter(function (item) {
    return item.done;
  }).length;
  counter.textContent = list.items.length > 0
    ? doneCount + " / " + list.items.length
    : "";
}

function createPalette(item) {
  const palette = document.createElement("div");
  palette.className = "palette";

  COLORS.forEach(function (color) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch" + (item.color === color ? " selected" : "");
    swatch.style.setProperty("--c", color);
    swatch.setAttribute("aria-label", "Valitse väri " + color);
    swatch.addEventListener("click", function () {
      setColor(item.id, color);
    });
    palette.appendChild(swatch);
  });

  return palette;
}

function renderSaved() {
  savedList.innerHTML = "";

  state.saved.forEach(function (list) {
    const li = document.createElement("li");
    li.className = "saved-item";

    const info = document.createElement("div");
    info.className = "saved-info";

    const name = document.createElement("span");
    name.className = "saved-name";
    name.textContent = list.name;

    const doneCount = list.items.filter(function (item) {
      return item.done;
    }).length;
    const meta = document.createElement("span");
    meta.className = "saved-meta";
    meta.textContent = doneCount + " / " + list.items.length + "";

    info.appendChild(name);
    info.appendChild(meta);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "small-button";
    openButton.textContent = "Avaa";
    openButton.addEventListener("click", function () {
      openSaved(list.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-button danger";
    deleteButton.textContent = "Poista";
    deleteButton.addEventListener("click", function () {
      deleteSaved(list.id);
    });

    li.appendChild(info);
    li.appendChild(openButton);
    li.appendChild(deleteButton);
    savedList.appendChild(li);
  });

  savedEmpty.classList.toggle("hidden", state.saved.length > 0);
}

/* ---------- Kohtien toiminnot ---------- */

function addItem(text) {
  state.current.items.push({
    id: makeId(),
    text: text,
    done: false,
    color: DEFAULT_COLOR
  });
  persist();
  renderItems();
}

function toggleItem(id) {
  state.current.items.forEach(function (item) {
    if (item.id === id) {
      item.done = !item.done;
    }
  });
  persist();
  renderItems();
}

function setColor(id, color) {
  state.current.items.forEach(function (item) {
    if (item.id === id) {
      item.color = color;
    }
  });
  openPaletteId = null;
  persist();
  renderItems();
}

function deleteItem(id) {
  state.current.items = state.current.items.filter(function (item) {
    return item.id !== id;
  });
  persist();
  renderItems();
}

/* ---------- Tallennettujen listojen toiminnot ---------- */

function setSavedPanel(open) {
  savedPanel.classList.toggle("hidden", !open);
  btnLists.setAttribute("aria-expanded", String(open));
}

function openSaved(id) {
  const target = state.saved.find(function (list) {
    return list.id === id;
  });
  if (!target) {
    return;
  }
  // Nykyinen lista säilytetään ennen vaihtoa
  if (state.current.items.length > 0 && state.current.id !== id) {
    upsertSaved(state.current);
  }
  state.current = copy(target);
  openPaletteId = null;
  persist();
  setSavedPanel(false);
  render();
}

function deleteSaved(id) {
  if (!window.confirm("Poistetaanko tallennettu lista?")) {
    return;
  }
  state.saved = state.saved.filter(function (list) {
    return list.id !== id;
  });
  persist();
  renderSaved();
}

/* ---------- Alapalkin napit ---------- */

btnSave.addEventListener("click", function () {
  state.current.name = nameInput.value.trim();
  if (!validateName()) {
    nameInput.focus();
    return;
  }
  upsertSaved(state.current);
  persist();
  renderSaved();
  showPopup("Lista tallennettu");
});

btnNew.addEventListener("click", function () {
  // Vanha lista säilytetään tallennettujen joukossa, jos siinä on sisältöä
  if (state.current.items.length > 0) {
    upsertSaved(state.current);
  }
  state.current = createList();
  openPaletteId = null;
  clearError(nameInput, nameError);
  clearError(itemInput, itemError);
  persist();
  setSavedPanel(false);
  render();
  showPopup("Uusi lista aloitettu");
  itemInput.focus();
});

btnClear.addEventListener("click", function () {
  if (state.current.items.length === 0 && state.current.name === "") {
    return;
  }

  // Uusi id, jotta mahdollinen tallennettu kopio ei ylikirjoitu tyhjällä
  state.current = createList();
  openPaletteId = null;
  clearError(nameInput, nameError);
  clearError(itemInput, itemError);
  persist();
  render();
});

btnLists.addEventListener("click", function () {
  const open = savedPanel.classList.contains("hidden");
  setSavedPanel(open);
});

/* ---------- Lomake ja kentät ---------- */

form.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!validateItem()) {
    return;
  }
  setSavedPanel(false);
  addItem(itemInput.value.trim());
  form.reset();
  itemInput.focus();
});

itemInput.addEventListener("input", function () {
  if (itemInput.classList.contains("invalid")) {
    validateItem();
  }
});

nameInput.addEventListener("input", function () {
  state.current.name = nameInput.value;
  persist();
  if (nameInput.classList.contains("invalid")) {
    validateName();
  }
});

render();