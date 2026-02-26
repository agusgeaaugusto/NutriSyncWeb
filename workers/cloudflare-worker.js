export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: corsHeaders() });
    }
    const { goalKcal = 2100, locale = "es" } = await request.json();

    const prompt = `
Eres un nutricionista práctico. Genera un plan semanal con variedad (sin repetir platos).
Devuelve SOLO JSON con este formato:
{
  "meals": [
    {"type":"Breakfast","name":"...", "time":"08:00", "notes":"..."},
    {"type":"Lunch","name":"...", "time":"12:30", "notes":"..."},
    {"type":"Snack","name":"...", "time":"16:30", "notes":"..."},
    {"type":"Dinner","name":"...", "time":"19:30", "notes":"..."}
  ],
  "recipes": [
    {"title":"...", "items":["...","...","..."]},
    {"title":"...", "items":["...","...","..."]}
  ]
}
Requisitos:
- Idioma: ${locale}
- Meta calorías/día aproximada: ${goalKcal}
- En notes agrega tips simples.
`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Responde estrictamente en JSON válido." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      })
    });

    if (!r.ok) {
      return new Response(await r.text(), { status: 500, headers: corsHeaders() });
    }

    const out = await r.json();
    let text = out.choices?.[0]?.message?.content || "{}";
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1);
    return new Response(text, { status: 200, headers: { ...corsHeaders(), "Content-Type":"application/json" } });
  }
}
function corsHeaders(){
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
