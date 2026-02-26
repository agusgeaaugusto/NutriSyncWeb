export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function toast(msg){
  let el = document.querySelector(".toast");
  if (!el){
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

export function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

export function iconCheck(){
  return `<svg viewBox="0 0 24 24"><path d="M9.2 16.6 4.7 12.1l1.4-1.4 3.1 3.1 8.7-8.7 1.4 1.4-10.1 10.1Z"/></svg>`;
}
export function iconClock(){
  return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h4v-2h-3V7h-2v6Z"/></svg>`;
}
