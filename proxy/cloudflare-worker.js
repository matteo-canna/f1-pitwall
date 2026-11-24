/* Sport LIVE APP — proxy dati per MotoGP e Superbike (Cloudflare Worker, piano gratuito).
   I siti di MotoGP e WorldSBK non permettono ad altri siti di leggere i loro dati dal browser (CORS).
   Questo Worker li legge per conto dell'app e li restituisce con il permesso giusto, tenendoli 15 secondi in cache.
   Sicurezza: accetta solo i due indirizzi dei dati moto e solo le richieste che arrivano dal sito dell'app.
   Istruzioni: proxy/LEGGIMI.md */

/* il sito dell'app: se lo pubblichi altrove aggiungi qui il suo indirizzo (senza / finale) */
const ALLOWED_ORIGINS = ["https://matteo-canna.github.io"];
/* gli unici server che il proxy può leggere */
const ALLOWED_HOSTS = ["api.motogp.pulselive.com", "api.pulselive.worldsbk.com"];
/* secondi di cache: dati freschi per il live timing, ma poche richieste ai server originali */
const TTL = 15;

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const okOrigin = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": okOrigin ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "solo GET" }, 405, cors);
    if (!okOrigin) return json({ error: "origine non ammessa" }, 403, cors);

    let target;
    try { target = new URL(new URL(request.url).searchParams.get("u") || ""); }
    catch (e) { return json({ error: "manca l'indirizzo da leggere (?u=)" }, 400, cors); }
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) return json({ error: "indirizzo non ammesso" }, 403, cors);

    const cache = caches.default;
    const key = new Request(target.toString(), { method: "GET" });
    let res = await cache.match(key);
    if (!res) {
      let up;
      try { up = await fetch(target.toString(), { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; SportLiveProxy/1.0)" } }); }
      catch (e) { return json({ error: "server dei dati non raggiungibile" }, 502, cors); }
      res = new Response(up.body, up);
      res.headers.set("Cache-Control", "public, max-age=" + TTL + ", s-maxage=" + TTL);
      res.headers.delete("Set-Cookie");
      if (up.ok && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v));
    out.headers.delete("Set-Cookie");
    return out;
  }
};
