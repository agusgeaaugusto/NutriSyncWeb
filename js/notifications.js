// Web Notifications scheduling (best-effort)
// Nota: la web NO garantiza alarmas en segundo plano. Esto funciona mejor con la app abierta.
let timers = [];

function clearTimers(){
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function msUntil(timeHHMM){
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function notify(title, body){
  if (Notification.permission !== "granted") return;
  navigator.serviceWorker?.getRegistration?.().then(reg => {
    if (reg?.showNotification) {
      reg.showNotification(title, { body, icon: "./assets/icon-192.png", badge: "./assets/icon-192.png" });
    } else {
      new Notification(title, { body });
    }
  }).catch(() => new Notification(title, { body }));
}

export async function requestNotifications(){
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function scheduleMealNotifications(times){
  clearTimers();
  if (Notification.permission !== "granted") return;

  const entries = Object.entries(times || {});
  for (const [meal, time] of entries){
    if (!time) continue;

    // 15 min before
    const preMs = msUntil(time) - (15 * 60 * 1000);
    if (preMs > 0){
      timers.push(setTimeout(() => {
        notify("NutriSync", `En 15 min: preparar ${meal}.`);
      }, preMs));
    }

    // on time
    const onMs = msUntil(time);
    timers.push(setTimeout(() => {
      notify("NutriSync", `Hora de comer: ${meal}.`);
    }, onMs));
  }
}

export function cancelMealNotifications(){
  clearTimers();
}
