import { firebaseConfig } from "./firebase-config.js";
import { initFirebaseOrFail, onAuthStateChangedSafe } from "./firebase.js";
import { sendEmailVerification, reload } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { toast } from "./ui.js";

const btnResend = document.getElementById("btnResend");
const btnIveVerified = document.getElementById("btnIveVerified");
const msg = document.getElementById("msg");

const { auth } = initFirebaseOrFail(firebaseConfig);

let currentUser = null;

onAuthStateChangedSafe(auth, (u)=>{
  currentUser = u;
  if (!u){
    window.location.replace("./index.html");
    return;
  }
  msg.textContent = u.emailVerified ? "✅ Correo verificado" : "Pendiente de verificación…";
  if (u.emailVerified){
    window.location.replace("./profile.html");
  }
});

btnResend?.addEventListener("click", async ()=>{
  if (!currentUser) return;
  try{
    await sendEmailVerification(currentUser);
    toast("Correo reenviado ✅");
  }catch(e){
    console.error(e);
    toast("No se pudo reenviar. Esperá un momento e intentá de nuevo.");
  }
});

btnIveVerified?.addEventListener("click", async ()=>{
  if (!currentUser) return;
  msg.textContent = "Actualizando…";
  try{
    await reload(currentUser);
    if (currentUser.emailVerified){
      window.location.replace("./profile.html");
    } else {
      msg.textContent = "Aún no aparece verificado. Revisá tu bandeja y spam.";
      toast("Aún no verificado");
    }
  }catch(e){
    console.error(e);
    toast("No se pudo actualizar el estado.");
    msg.textContent = "";
  }
});
