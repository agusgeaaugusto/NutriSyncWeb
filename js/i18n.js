// Simple i18n (no dependencies)
// Usage:
//   import { t, setLang, getLang, applyI18n } from './i18n.js';
//   applyI18n();

const STORAGE_KEY = "nutrisync:lang";

const DICT = {
  es: {
    "login.title": "Login / Onboarding",
    "login.email": "Correo",
    "login.password": "Contraseña",
    "login.signin": "Iniciar sesión",
    "login.signup": "Crear cuenta",
    "login.or": "o",
    "login.google": "Continuar con Google",
    "login.apple": "Continuar con Apple / iCloud",
    "login.terms": "Acepto los Términos y Condiciones",
    "login.must_terms": "Debes aceptar los términos",

    "nav.home": "Home",
    "nav.profile": "Profile & Biometrics",
    "nav.premium": "Premium Plan",
    "nav.settings": "Settings",
    "nav.languages": "Idiomas",
    "nav.logout": "Salir",

    "lang.title": "Idioma",
    "lang.help": "Elige el idioma para la app. Se guarda en tu dispositivo.",
    "lang.save": "Guardar",
    "lang.cancel": "Cancelar",
    "toast.saved": "Guardado ✅",
    "toast.logout": "Sesión cerrada",
  },
  pt: {
    "login.title": "Login / Onboarding",
    "login.email": "E-mail",
    "login.password": "Senha",
    "login.signin": "Entrar",
    "login.signup": "Criar conta",
    "login.or": "ou",
    "login.google": "Continuar com Google",
    "login.apple": "Continuar com Apple / iCloud",
    "login.terms": "Aceito os Termos e Condições",
    "login.must_terms": "Você precisa aceitar os termos",

    "nav.home": "Início",
    "nav.profile": "Perfil & Biometria",
    "nav.premium": "Plano Premium",
    "nav.settings": "Configurações",
    "nav.languages": "Idiomas",
    "nav.logout": "Sair",

    "lang.title": "Idioma",
    "lang.help": "Escolha o idioma do app. Fica salvo no seu dispositivo.",
    "lang.save": "Salvar",
    "lang.cancel": "Cancelar",
    "toast.saved": "Salvo ✅",
    "toast.logout": "Sessão encerrada",
  },
  en: {
    "login.title": "Login / Onboarding",
    "login.email": "Email",
    "login.password": "Password",
    "login.signin": "Sign in",
    "login.signup": "Create account",
    "login.or": "or",
    "login.google": "Continue with Google",
    "login.apple": "Continue with Apple / iCloud",
    "login.terms": "I accept the Terms & Conditions",
    "login.must_terms": "You must accept the terms",

    "nav.home": "Home",
    "nav.profile": "Profile & Biometrics",
    "nav.premium": "Premium Plan",
    "nav.settings": "Settings",
    "nav.languages": "Languages",
    "nav.logout": "Logout",

    "lang.title": "Language",
    "lang.help": "Choose the app language. It will be saved on your device.",
    "lang.save": "Save",
    "lang.cancel": "Cancel",
    "toast.saved": "Saved ✅",
    "toast.logout": "Signed out",
  }
};

export function getLang() {
  const raw = (localStorage.getItem(STORAGE_KEY) || "").trim();
  if (raw && DICT[raw]) return raw;
  const browser = (navigator.language || "es").slice(0, 2).toLowerCase();
  return DICT[browser] ? browser : "es";
}

export function setLang(lang) {
  const next = DICT[lang] ? lang : "es";
  localStorage.setItem(STORAGE_KEY, next);
  try { document.documentElement.lang = next; } catch {}
  applyI18n();
  return next;
}

export function t(key) {
  const lang = getLang();
  return (DICT[lang] && DICT[lang][key]) || (DICT.es[key]) || key;
}

// Apply translations to DOM elements with data-i18n
export function applyI18n(root = document) {
  const lang = getLang();
  try { document.documentElement.lang = lang; } catch {}

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key));
  });
}
