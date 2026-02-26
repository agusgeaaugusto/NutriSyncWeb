import { firebaseConfig } from "./firebase-config.js";
import { initFirebaseOrFail, onAuthStateChangedSafe, logout } from "./firebase.js";
import { loadState, saveState, defaultState, ensureToday } from "./storage.js";
import { requestNotifications, scheduleMealNotifications, cancelMealNotifications } from "./notifications.js";
import { $, $all, toast, escapeHtml, iconCheck, iconClock } from "./ui.js";
import { generateWeeklyMeals, shouldRefreshWeekly, markWeeklyRefreshed, setAiEndpoint, getAiEndpoint } from "./ai.js";
import { getLang, setLang, applyI18n, t } from "./i18n.js";

let auth, user;
try {
  ({ auth } = initFirebaseOrFail(firebaseConfig));
} catch (e) {
  console.warn(e);
  alert("Falta configurar Firebase. Abre README.md y pega tu firebaseConfig en js/firebase-config.js");
  window.location.href = "./index.html";
}

let state = ensureToday(loadState() || defaultState());
saveState(state);

const mealList = $("#mealList");
const goalKcal = $("#goalKcal");
const btnDrawer = $("#btnDrawer");
const drawer = $("#drawer");
const drawerBackdrop = $("#drawerBackdrop");
const btnLogout = $("#btnLogout");
const btnLang = $("#btnLang");
const langModal = $("#langModal");
const langBackdrop = $("#langBackdrop");
const closeLang = $("#closeLang");
const cancelLang = $("#cancelLang");
const saveLang = $("#saveLang");
const langSelect = $("#langSelect");

const views = {
  home: $("#view-home"),
  planner: $("#view-planner"),
  progress: $("#view-progress"),
  recipes: $("#view-recipes"),
};

function setRoute(route){
  // views
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("active", k === route));
  // bottom nav
  $all(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  // drawer
  $all(".drawer-item").forEach(a => a.classList.toggle("active", a.dataset.route === route));
}

function openDrawer(open){
  drawer.classList.toggle("open", open);
}

function openLang(){
  if (!langModal) return;
  if (langSelect) langSelect.value = getLang();
  langModal.setAttribute("aria-hidden", "false");
  langModal.classList.add("show");
}

function closeLangModal(){
  if (!langModal) return;
  langModal.setAttribute("aria-hidden", "true");
  langModal.classList.remove("show");
}

btnDrawer?.addEventListener("click", () => openDrawer(true));
drawerBackdrop?.addEventListener("click", () => openDrawer(false));

$all(".nav-btn[data-route]").forEach(btn => {
  btn.addEventListener("click", () => setRoute(btn.dataset.route));
});

$all(".drawer-item[data-route]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer(false);
    setRoute(a.dataset.route);
  });
});

// Language selector (sidebar)
btnLang?.addEventListener("click", (e) => {
  e.preventDefault();
  openDrawer(false);
  openLang();
});
langBackdrop?.addEventListener("click", closeLangModal);
closeLang?.addEventListener("click", closeLangModal);
cancelLang?.addEventListener("click", closeLangModal);
saveLang?.addEventListener("click", () => {
  const chosen = (langSelect?.value || "es").trim();
  setLang(chosen);
  applyI18n();
  toast(t("toast.saved"));
  closeLangModal();
});

btnLogout?.addEventListener("click", async () => {
  await logout(auth);
  toast(t("toast.logout"));
  window.location.href = "./index.html";
});

// profile images
function fillUser(u){
  const name = u?.displayName || "Amigo";
  $("#helloName").textContent = `Hola, ${name.split(" ")[0]}!`;
  $("#drawerName").textContent = name;
  $("#drawerEmail").textContent = u?.email || "";
  const photo = u?.photoURL || "assets/avatar-fallback.png";
  $("#avatarImg").src = photo;
  $("#drawerAvatar").src = photo;
}

onAuthStateChangedSafe(auth, (u) => {
  user = u;
  if (!u) window.location.href = "./index.html";
  fillUser(u);
});

// ===== Meals UI =====
function renderMeals(){
  mealList.innerHTML = "";
  for (const m of state.meals){
    const el = document.createElement("div");
    el.className = "meal-card";
    el.innerHTML = `
      <div class="meal-left">
        <div class="meal-name">${escapeHtml(m.type)}: ${escapeHtml(m.name || "—")}</div>
        <div class="meal-meta">
          <span class="badge">${escapeHtml(m.time || "--:--")}</span>
          ${m.notes ? `<span class="badge gray">${escapeHtml(m.notes.slice(0,32))}${m.notes.length>32?'…':''}</span>` : ""}
        </div>
      </div>
      <div class="meal-actions">
        <button class="check ${m.done ? "done" : ""}" data-id="${m.id}" title="Marcar como hecho">
          ${iconCheck()}
        </button>
        <button class="clock" data-edit="${m.id}" title="Editar">
          ${iconClock()}
        </button>
      </div>
    `;
    mealList.appendChild(el);
  }

  // handlers
  $all(".check").forEach(b => b.onclick = () => toggleDone(b.dataset.id));
  $all(".clock").forEach(b => b.onclick = () => openEditModal(b.dataset.edit));

  updateProgress();
}

function toggleDone(id){
  state.meals = state.meals.map(m => m.id === id ? ({...m, done: !m.done}) : m);
  saveState(state);
  renderMeals();
  toast("Guardado");
}

function updateProgress(){
  const total = state.meals.length;
  const done = state.meals.filter(m => m.done).length;
  $("#doneCount").textContent = `${done}/${total}`;
}

goalKcal.value = state.goalKcal;
goalKcal.addEventListener("change", () => {
  const v = Number(goalKcal.value || 0);
  state.goalKcal = Math.min(4500, Math.max(1200, v || 2100));
  goalKcal.value = state.goalKcal;
  saveState(state);
  toast("Meta actualizada");
});

// reset
$("#btnResetToday")?.addEventListener("click", () => {
  if (!confirm("¿Resetear el día (marcas de hecho) ?")) return;
  state.meals = state.meals.map(m => ({...m, done:false}));
  saveState(state);
  renderMeals();
});

// modal add/edit
const modal = $("#modal");
const modalBackdrop = $("#modalBackdrop");
const modalClose = $("#modalClose");
const btnCancel = $("#btnCancel");
const btnSaveMeal = $("#btnSaveMeal");
const navPlus = $("#navPlus");
const btnQuickAdd = $("#btnQuickAdd");
const mealName = $("#mealName");
const mealTime = $("#mealTime");
const mealNotes = $("#mealNotes");
let editingId = null;

function openModal(open){
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", String(!open));
}
function resetModal(){
  editingId = null;
  $("#modalTitle").textContent = "Nueva comida";
  mealName.value = "";
  mealTime.value = "";
  mealNotes.value = "";
}
function openAddModal(){
  resetModal();
  mealTime.value = nextSuggestedTime();
  openModal(true);
}
function openEditModal(id){
  const m = state.meals.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  $("#modalTitle").textContent = "Editar comida";
  mealName.value = m.name || "";
  mealTime.value = m.time || "";
  mealNotes.value = m.notes || "";
  openModal(true);
}
function nextSuggestedTime(){
  // pick next meal time (simple)
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  const sorted = [...state.meals].sort((a,b) => (a.time||"00:00").localeCompare(b.time||"00:00"));
  for (const m of sorted){
    const [h, mi] = (m.time||"00:00").split(":").map(Number);
    const tMin = h*60+mi;
    if (tMin > nowMin) return m.time;
  }
  return "19:30";
}

navPlus?.addEventListener("click", openAddModal);
btnQuickAdd?.addEventListener("click", openAddModal);
modalBackdrop?.addEventListener("click", () => openModal(false));
modalClose?.addEventListener("click", () => openModal(false));
btnCancel?.addEventListener("click", () => openModal(false));

btnSaveMeal?.addEventListener("click", () => {
  const name = mealName.value.trim();
  const time = mealTime.value;
  const notes = mealNotes.value.trim();

  if (!name) return toast("Pon un nombre");

  if (editingId){
    state.meals = state.meals.map(m => m.id === editingId ? ({...m, name, time, notes}) : m);
  } else {
    state.meals = [
      ...state.meals,
      { id: crypto.randomUUID(), type: "Extra", name, time, notes, done:false }
    ];
  }
  saveState(state);
  openModal(false);
  renderMeals();
  toast("Listo");
});

// ===== Planner / Times =====
const timeSettings = $("#timeSettings");

function renderTimes(){
  const times = state.times || {};
  const keys = ["Breakfast","Lunch","Snack","Dinner"];
  timeSettings.innerHTML = keys.map(k => `
    <div class="time-row">
      <strong>${k}</strong>
      <input type="time" data-time="${k}" value="${times[k] || ""}" />
    </div>
  `).join("");
}
renderTimes();

$("#btnSaveTimes")?.addEventListener("click", () => {
  const inputs = $all("input[data-time]");
  const times = { ...(state.times || {}) };
  inputs.forEach(i => times[i.dataset.time] = i.value);
  state.times = times;

  // also update base meals times if types match
  state.meals = state.meals.map(m => times[m.type] ? ({...m, time: times[m.type]}) : m);

  saveState(state);
  renderMeals();
  toast("Horarios guardados");

  if (state.notifEnabled && Notification.permission === "granted"){
    scheduleMealNotifications(state.times);
    toast("Alertas reprogramadas");
  }
});

$("#btnEnableNotifs")?.addEventListener("click", async () => {
  const ok = await requestNotifications();
  if (!ok) return toast("Permiso denegado");
  state.notifEnabled = true;
  saveState(state);
  scheduleMealNotifications(state.times);
  toast("Alertas activadas");
});

// ===== Recipes =====
const recipes = [
  { title: "Desayuno rápido", items: ["Huevos + palta", "Avena con yogurt", "Fruta + frutos secos"] },
  { title: "Almuerzo limpio", items: ["Pollo + ensalada", "Carne magra + arroz integral", "Pescado + verduras"] },
  { title: "Cena liviana", items: ["Sopa de verduras", "Ensalada + proteína", "Omelette de claras"] },
  { title: "Snack inteligente", items: ["Yogur natural", "Almendras", "Fruta + queso"] },
];

function renderRecipes(){
  const grid = $("#recipesGrid");
  const list = (state.aiRecipes && Array.isArray(state.aiRecipes) && state.aiRecipes.length) ? state.aiRecipes : recipes;
  grid.innerHTML = list.map((r, idx) => `
    <div class="recipe">
      <h3>${escapeHtml(r.title)}</h3>
      <ul class="muted">
        ${r.items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}
      </ul>
      <button class="btn btn-primary" data-use="${idx}">Usar ahora</button>
    </div>
  `).join("");

  $all("button[data-use]").forEach(b => b.addEventListener("click", () => {
    const r = list[Number(b.dataset.use)];
    openAddModal();
    mealName.value = r.items[0];
    toast("Plantilla aplicada");
  }));
}
renderRecipes();

// ===== initial render =====
renderMeals();

// ===== keep state day in sync =====
setInterval(() => {
  const updated = ensureToday(loadState() || state);
  if (updated.today !== state.today){
    state = updated;
    saveState(state);
    renderMeals();
    toast("Nuevo día, reset hecho ✅");
  }
}, 60_000);


// ===== AI weekly refresh (optional) =====
const aiEndpointInput = document.getElementById("aiEndpoint");
const btnSaveAi = document.getElementById("btnSaveAi");
const btnAiRefresh = document.getElementById("btnAiRefresh");

function syncAiEndpointUI(){
  if (!aiEndpointInput) return;
  aiEndpointInput.value = getAiEndpoint() || "";
}
syncAiEndpointUI();

btnSaveAi?.addEventListener("click", () => {
  const url = (aiEndpointInput?.value || "").trim();
  if (!url) return toast("Pega la URL del endpoint");
  setAiEndpoint(url);
  toast("Endpoint guardado");
});

async function applyAiData(data){
  if (data?.meals?.length){
    const extras = state.meals.filter(m => m.type === "Extra");
    const mapped = data.meals.map(m => ({
      id: crypto.randomUUID(),
      type: m.type || "Meal",
      name: m.name || "—",
      time: m.time || (state.times?.[m.type] || "12:00"),
      notes: m.notes || "",
      done: false
    }));
    state.meals = [...mapped, ...extras];

    state.times = { ...(state.times || {}) };
    for (const m of data.meals){
      if (m.type && m.time) state.times[m.type] = m.time;
    }
  }
  if (data?.recipes?.length){
    state.aiRecipes = data.recipes;
  }
  saveState(state);
  renderTimes();
  renderMeals();
  renderRecipes();
}

btnAiRefresh?.addEventListener("click", async () => {
  try{
    toast("Generando plan…");
    const data = await generateWeeklyMeals({ goalKcal: state.goalKcal, locale: "es" });
    await applyAiData(data);
    markWeeklyRefreshed();
    toast("Plan semanal actualizado ✅");
  }catch(e){
    console.error(e);
    toast("AI: configura endpoint primero");
    alert("Para AI necesitas un endpoint (Cloudflare Worker). Lee README.md (carpeta /workers).");
  }
});

// auto refresh once per week (if endpoint exists)
(async () => {
  try{
    if (!getAiEndpoint()) return;
    if (!shouldRefreshWeekly()) return;
    const data = await generateWeeklyMeals({ goalKcal: state.goalKcal, locale: "es" });
    await applyAiData(data);
    markWeeklyRefreshed();
  }catch(e){
    console.warn("AI weekly refresh skipped:", e);
  }
})();


async function loadUserProfile(user){
  try{
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists() || !snap.data()?.profile){
      // force profile completion
      window.location.href = "./profile.html";
      return;
    }
    const data = snap.data();
    state.goalKcal = data.goalKcal || state.goalKcal;
    saveState(state);
    // Update header greeting if exists
    const name = data.profile?.firstName || user.displayName?.split(" ")?.[0] || "!";
    const hello = document.getElementById("helloName");
    if (hello) hello.textContent = name;
    const kcalEl = document.getElementById("goalKcal");
    if (kcalEl) kcalEl.textContent = String(state.goalKcal || 2100);
  }catch(e){
    console.warn("profile load failed", e);
  }
}

// Quick access: drawer "Profile & Biometrics" opens profile page
document.querySelectorAll('[data-nav="profile"]').forEach((b) => {
  b.addEventListener("click", () => {
    window.location.href = "./profile.html";
  });
});
