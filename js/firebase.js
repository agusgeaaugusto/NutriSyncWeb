// js/firebase.js — Firebase SDK (CDN) listo para GitHub Pages
// Exporta auth/db + helpers (Google, Email/Pass, Apple) + Firestore helpers.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig as defaultConfig } from "./firebase-config.js";

function validateConfig(cfg){
  if (!cfg || typeof cfg !== "object") throw new Error("Firebase config inválido.");
  const req = ["apiKey", "authDomain", "projectId", "appId"];
  for (const k of req){
    if (!cfg[k]) throw new Error(`Falta firebaseConfig.${k}`);
  }
}

// Exports mutables (se asignan en init)
export let app = null;
export let auth = null;
export let db = null;

export function initFirebaseOrFail(cfg = defaultConfig){
  validateConfig(cfg);

  app = getApps().length ? getApp() : initializeApp(cfg);

  // Analytics puede fallar (bloqueadores / http). No debe romper la app.
  analyticsSupported().then((ok) => {
    if (ok) {
      try { getAnalytics(app); } catch(_) {}
    }
  }).catch(()=>{});

  auth = getAuth(app);
  // keep session even after refresh (GitHub Pages friendly)
  setPersistence(auth, browserLocalPersistence).catch((e)=>console.warn("Auth persistence:", e));
  db = getFirestore(app);

  return { app, auth, db };
}

// Inicializa automáticamente si el config ya está pegado
try { initFirebaseOrFail(defaultConfig); } catch (e) { /* UI avisa */ }

// Re-export de helpers de Firestore (para profile-setup.js)
export { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, serverTimestamp };

// ---- Auth helpers ----

export function onAuthStateChangedSafe(a, cb){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");
  return onAuthStateChanged(theAuth, (user) => {
    try { cb(user); } catch (e) { console.error(e); }
  });
}

export async function logout(a){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");
  await signOut(theAuth);
}

export async function googleLogin(a){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const res = await signInWithPopup(theAuth, provider);
  return res.user;
}

export async function emailLogin(a, email, password){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");
  const res = await signInWithEmailAndPassword(theAuth, email, password);
  return res.user;
}

export async function emailCreateAccount(a, email, password){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");
  const res = await createUserWithEmailAndPassword(theAuth, email, password);
  // Enviar verificacion (solo email/password)
  try {
    if (res?.user && !res.user.emailVerified) {
      await sendEmailVerification(res.user);
    }
  } catch (e) {
    console.warn("No se pudo enviar verificacion de correo", e);
  }
  return res.user;
}

export async function resendVerification(user){
  if (!user) throw new Error("No hay usuario");
  await sendEmailVerification(user);
}


export async function appleLogin(a){
  const theAuth = a || auth;
  if (!theAuth) throw new Error("Firebase Auth no inicializado");

  // Requiere habilitar Apple en Firebase Auth + configuración de Apple Developer.
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const res = await signInWithPopup(theAuth, provider);
  return res.user;
}
