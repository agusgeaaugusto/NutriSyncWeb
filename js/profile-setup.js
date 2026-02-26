// js/profile-setup.js (COMPLETO - corregido y listo)

import { auth, db, doc, getDoc, setDoc } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { toast } from "./ui.js";

const $ = (s) => document.querySelector(s);

function num(id){
  const v = $(id).value;
  return v === "" ? null : Number(v);
}

function calcKcal({ sex="male", age, heightCm, weightKg, activity="sedentary", goal="lose" }){
  // Mifflin-St Jeor
  const sexConst = (sex === "female") ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConst;

  const mult = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725
  }[activity] || 1.2;

  let tdee = bmr * mult;

  // Ajuste por objetivo
  if (goal === "lose") tdee -= 400;
  if (goal === "gain") tdee += 250;

  // Piso razonable
  tdee = Math.round(Math.max(1200, tdee));
  return tdee;
}

async function ensureUser(){
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub(); // ✅ corta el listener al primer evento
      if (!user){
        window.location.href = "./index.html";
        return;
      }
      resolve(user);
    });
  });
}

const form = $("#profileForm");
const btnLogout = $("#btnLogout");
const btnBack = $("#btnBack");
const btnSkip = $("#btnSkip");

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./index.html";
});

btnBack?.addEventListener("click", () => {
  window.location.href = "./app.html";
});

btnSkip?.addEventListener("click", () => {
  // Permite entrar igual, pero el plan puede ser más genérico
  window.location.href = "./app.html";
});

const user = await ensureUser();

// Prefill si ya existe perfil
const ref = doc(db, "users", user.uid);
const snap = await getDoc(ref);

if (snap.exists()){
  const p = snap.data()?.profile || {};
  $("#firstName").value = p.firstName || "";
  $("#lastName").value  = p.lastName  || "";
  $("#age").value       = p.age ?? "";
  $("#heightCm").value  = p.heightCm ?? "";
  $("#weightKg").value  = p.weightKg ?? "";
  $("#goal").value      = p.goal || "lose";
  $("#activity").value  = p.activity || "sedentary";
  $("#prefs").value     = p.prefs || "";

  // ✅ Solo si agregaste el campo "sex" en profile.html
  const sexEl = $("#sex");
  if (sexEl) sexEl.value = p.sex || "male";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = $("#firstName").value.trim();
  const lastName  = $("#lastName").value.trim();
  const age       = num("#age");
  const heightCm  = num("#heightCm");
  const weightKg  = num("#weightKg");
  const goal      = $("#goal").value;
  const activity  = $("#activity").value;
  const prefs     = $("#prefs").value.trim();

  // ✅ Solo si agregaste el campo "sex" en profile.html
  const sexEl = $("#sex");
  const sex = sexEl ? sexEl.value : "male";

  if (!firstName || !lastName || !age || !heightCm || !weightKg){
    toast("Completa los campos obligatorios");
    return;
  }

  const goalKcal = calcKcal({ sex, age, heightCm, weightKg, activity, goal });

  const payload = {
    profile: { firstName, lastName, sex, age, heightCm, weightKg, goal, activity, prefs },
    goalKcal,
    updatedAt: Date.now(),
    email: user.email || null,
    displayName: user.displayName || null
  };

  await setDoc(ref, payload, { merge: true });

  // guardar en local por comodidad
  localStorage.setItem("nutrisync:goalKcal", String(goalKcal));

  toast("Perfil guardado ✅");
  window.location.href = "./app.html";
});
