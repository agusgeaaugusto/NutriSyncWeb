export function runSplash({durationMs=900} = {}){
  const splash = document.getElementById("splash");
  if (!splash) return;

  const targetSel = splash.dataset.reveal;
  const target = targetSel ? document.querySelector(targetSel) : null;

  if (target){
    target.classList.add("hidden");
  }

  window.requestAnimationFrame(() => {
    setTimeout(() => {
      splash.classList.add("hide");
      if (target){
        target.classList.remove("hidden");
        target.classList.add("reveal");
      }
      setTimeout(() => splash.remove(), 900);
    }, durationMs);
  });
}
