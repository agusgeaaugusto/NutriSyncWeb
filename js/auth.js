import { firebaseConfig } from "./firebase-config.js";
import {
  initFirebaseOrFail,
  googleLogin,
  emailLogin,
  emailCreateAccount,
  appleLogin,
  onAuthStateChangedSafe,
  db,
  doc,
  getDoc
} from "./firebase.js";
import { toast } from "./ui.js";
import { t } from "./i18n.js";

const $ = (s) => document.querySelector(s);

const btnGoogle = $("#btnGoogle");
const btnApple  = $("#btnApple");
const btnEmailLogin  = $("#btnEmailLogin");
const btnEmailCreate = $("#btnEmailCreate");
const acceptTerms = $("#acceptTerms");
const openTerms = $("#openTerms");
const $msg = $("#msg");

let auth;
try {
  ({ auth } = initFirebaseOrFail(firebaseConfig));
  if (!db) throw new Error("Firestore not initialized");
} catch (e) {
  console.warn(e);
  alert("Falta configurar Firebase. Abre README.md y pega tu firebaseConfig en js/firebase-config.js");
}

// No deshabilitamos por el checkbox (confunde). Validamos al hacer click.
[btnGoogle, btnApple, btnEmailLogin, btnEmailCreate].forEach((b)=>{ if(b) b.disabled = !auth; });
openTerms?.addEventListener("click", (e)=>{
  e.preventDefault();
  alert(
    "Términos y Condiciones (demo)\n\n" +
    "• Esta app da sugerencias y no reemplaza consulta médica.\n" +
    "• Tus datos se guardan en tu cuenta.\n" +
    "• Puedes cerrar sesión cuando quieras."
  );
});

let isRedirecting = false;
async function redirectByProfile(user){
  if (!user || isRedirecting) return;
  isRedirecting = true;
  $msg.textContent = "Cargando perfil...";
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const hasProfile = !!(snap.exists() && snap.data()?.profile && snap.data()?.profile?.firstName);
    if (!hasProfile){
      window.location.replace("./profile.html");
    } else {
      window.location.replace("./app.html");
    }
  } catch (e) {
    console.error(e);
    isRedirecting = false;
    $msg.textContent = "No se pudo leer tu perfil. Revisa Firestore Rules.";
    toast("Error leyendo tu perfil");
  }
}

// Google
btnGoogle?.addEventListener("click", async () => {
  try {
    if (!acceptTerms?.checked){ toast(t("login.must_terms")); return; }
    $msg.textContent = "Abriendo Google...";
    const user = await googleLogin(auth);
    await redirectByProfile(user);
  } catch (e) {
    console.error(e);
    toast("No se pudo iniciar sesión con Google. Revisa Firebase Auth y dominios autorizados.");
    $msg.textContent = "";
    isRedirecting = false;
  }
});

// Apple (demo)
btnApple?.addEventListener("click", async () => {
  try {
    if (!acceptTerms?.checked){ toast(t("login.must_terms")); return; }
    $msg.textContent = "Abriendo Apple...";
    const user = await appleLogin(auth);
    if (user) await redirectByProfile(user);
  } catch (e) {
    console.error(e);
    toast("Apple/iCloud requiere configuración OAuth. Por ahora es demo.");
    $msg.textContent = "";
    isRedirecting = false;
  }
});

// Email/password: iniciar sesión
btnEmailLogin?.addEventListener("click", async () => {
  try {
    if (!acceptTerms?.checked){ toast(t("login.must_terms")); return; }
    const email = $("#email")?.value?.trim();
    const pass  = $("#password")?.value;
    if (!email || !pass){ toast("Ingresa correo y contraseña"); return; }
    $msg.textContent = "Iniciando sesión...";
    const user = await emailLogin(auth, email, pass);
    await redirectByProfile(user);
  } catch (e) {
    console.error(e);
    toast("No se pudo iniciar sesión. Revisa correo/contraseña o Firebase Auth.");
    $msg.textContent = "";
    isRedirecting = false;
  }
});

// Email/password: crear cuenta
btnEmailCreate?.addEventListener("click", async () => {
  try {
    if (!acceptTerms?.checked){ toast(t("login.must_terms")); return; }
    const email = $("#email")?.value?.trim();
    const pass  = $("#password")?.value;
    if (!email || !pass){ toast("Ingresa correo y contraseña"); return; }
    if (pass.length < 6){ toast("La contraseña debe tener al menos 6 caracteres"); return; }
    $msg.textContent = "Creando cuenta...";
    const user = await emailCreateAccount(auth, email, pass);
    // Nota: la verificación por correo es opcional. Por ahora dejamos entrar.
    await redirectByProfile(user);
  } catch (e) {
    console.error(e);
    toast("No se pudo crear la cuenta. Revisa si el correo ya existe.");
    $msg.textContent = "";
    isRedirecting = false;
  }
});

// Si ya está logueado, salta directo
onAuthStateChangedSafe(auth, (user) => {
  if (user){
    redirectByProfile(user);
  } else {
    isRedirecting = false;
    $msg.textContent = "";
  }
});
