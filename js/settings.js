import { firebaseConfig } from "./firebase-config.js";
import { initFirebaseOrFail, onAuthStateChangedSafe, db, doc, getDoc, setDoc } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { toast } from "./ui.js";

const $ = (s) => document.querySelector(s);

const { auth } = initFirebaseOrFail(firebaseConfig);

const profileView = $("#profileView");
const weightNow = $("#weightNow");
const btnAddWeight = $("#btnAddWeight");
const weightsList = $("#weightsList");
const btnLogout = $("#btnLogout");

let currentUser = null;

function fmtDate(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleDateString("es-ES", { year:"numeric", month:"2-digit", day:"2-digit" }) + " " +
           d.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
  }catch{ return ""; }
}

async function loadProfile(){
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const p = snap.exists() ? (snap.data()?.profile || {}) : {};
  const goalKcal = snap.exists() ? (snap.data()?.goalKcal ?? null) : null;

  profileView.innerHTML = `
    <div><strong>Nombre:</strong> ${(p.firstName||"")} ${(p.lastName||"")}</div>
    <div><strong>Edad:</strong> ${p.age ?? ""}</div>
    <div><strong>Altura:</strong> ${p.heightCm ?? ""} cm</div>
    <div><strong>Peso:</strong> ${p.weightKg ?? ""} kg</div>
    ${goalKcal ? `<div><strong>Meta kcal/día:</strong> ${goalKcal}</div>` : "" }
  `;
}

async function loadWeights(){
  const q = query(
    collection(db, "users", currentUser.uid, "weights"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snaps = await getDocs(q);
  if (snaps.empty){
    weightsList.textContent = "Aún no hay registros de peso.";
    return;
  }
  const items = [];
  snaps.forEach((d)=>{
    const v = d.data();
    items.push({ w: v.weightKg, t: v.createdAtMs || null });
  });

  weightsList.innerHTML = `
    <ul style="margin:0;padding-left:18px;">
      ${items.map(it => `<li>${it.w} kg — ${it.t ? fmtDate(it.t) : ""}</li>`).join("")}
    </ul>
  `;
}

async function addWeight(){
  const w = Number(weightNow.value);
  if (!w || w <= 0){ toast("Ingresa un peso válido"); return; }
  btnAddWeight.disabled = true;
  try{
    await addDoc(collection(db, "users", currentUser.uid, "weights"), {
      weightKg: w,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
    });

    // Actualizar peso principal del perfil también (si existe)
    const uref = doc(db, "users", currentUser.uid);
    await setDoc(uref, {
      profile: { weightKg: w },
      updatedAt: Date.now()
    }, { merge: true });

    toast("Peso agregado ✅");
    weightNow.value = "";
    await loadProfile();
    await loadWeights();
  }catch(e){
    console.error(e);
    toast("No se pudo guardar el peso. Revisa Firestore Rules.");
  }finally{
    btnAddWeight.disabled = false;
  }
}

btnAddWeight?.addEventListener("click", addWeight);

btnLogout?.addEventListener("click", async ()=>{
  await signOut(auth);
  window.location.replace("./index.html");
});

onAuthStateChangedSafe(auth, async (u)=>{
  if (!u){ window.location.replace("./index.html"); return; }
  currentUser = u;
  await loadProfile();
  await loadWeights();
});
