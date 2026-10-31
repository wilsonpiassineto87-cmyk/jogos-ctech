// Service worker mínimo: torna o site instalável e mostra uma página simples quando o
// celular está sem internet. Não guarda nada em cache (pedidos e cardápio são sempre ao vivo).
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1.5rem;background:#FDF9F0;color:#4a2e25">
<div style="font-size:3rem">🍦</div><h1 style="font-size:1.3rem">Sem conexão com a internet</h1>
<p>Confira sua conexão e tente de novo.</p>
<button onclick="location.reload()" style="margin-top:1rem;padding:.7rem 1.4rem;border:0;border-radius:999px;background:#E0457B;color:#fff;font-size:1rem">Tentar de novo</button>
</body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  // Só intercepta navegação de páginas; o resto vai direto para a rede.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
