const KEY = "nutrisync:v1";

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function defaultState(){
  const today = new Date().toISOString().slice(0,10);
  return {
    version: 1,
    today,
    goalKcal: 2100,
    meals: [
      { id: crypto.randomUUID(), type: "Breakfast", name:"Scrambled Eggs & Avocado", time:"08:00", notes:"", done:false },
      { id: crypto.randomUUID(), type: "Lunch", name:"Grilled Chicken Salad", time:"12:30", notes:"", done:false },
      { id: crypto.randomUUID(), type: "Dinner", name:"Lentil Soup", time:"19:30", notes:"", done:false }
    ],
    times: {
      Breakfast: "08:00",
      Lunch: "12:30",
      Dinner: "19:30",
      Snack: "16:30"
    },
    notifEnabled: false
  };
}

export function ensureToday(state){
  const today = new Date().toISOString().slice(0,10);
  if (!state || state.today !== today){
    const fresh = state ? { ...state } : defaultState();
    fresh.today = today;
    // reset done flags daily
    fresh.meals = (fresh.meals || []).map(m => ({...m, done:false}));
    return fresh;
  }
  return state;
}
