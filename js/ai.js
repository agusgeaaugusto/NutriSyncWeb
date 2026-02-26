const DEFAULT_AI_ENDPOINT = ""; // ej: "https://plato-inteligente-ai.TU_USUARIO.workers.dev"

export function getAiEndpoint(){
  return localStorage.getItem("nutrisync:ai_endpoint") || DEFAULT_AI_ENDPOINT;
}
export function setAiEndpoint(url){
  localStorage.setItem("nutrisync:ai_endpoint", url);
}

function weekKey(){
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}
export function shouldRefreshWeekly(){
  const key = weekKey();
  const last = localStorage.getItem("nutrisync:last_week");
  return last !== key;
}
export function markWeeklyRefreshed(){
  localStorage.setItem("nutrisync:last_week", weekKey());
}

export async function generateWeeklyMeals({goalKcal=2100, locale="es"} = {}){
  const endpoint = getAiEndpoint();
  if (!endpoint) throw new Error("AI endpoint no configurado.");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalKcal, locale })
  });
  if (!res.ok) throw new Error("AI endpoint error");
  return await res.json();
}
