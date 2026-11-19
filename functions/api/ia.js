// Cloudflare Pages Function: POST /api/ia
// Encaminha o chat do EstudaAí para uma IA:
// - com a variável secreta GEMINI_API_KEY no Cloudflare → Google Gemini (rápido, entende imagens);
// - sem chave nenhuma → serviço grátis da Pollinations, chamado pelo servidor.
// Nenhuma chave vai para o navegador.

const FREE_URL = 'https://text.pollinations.ai/openai';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const ALLOWED_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const MAX_MESSAGES = 20;
const MAX_CHARS = 30000; // soma do texto de todas as mensagens
const MAX_IMAGES = 3;
const MAX_IMAGE_CHARS = 2_000_000; // ~1,5 MB por imagem em base64

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function fail(message, status) {
  return json({ error: { message } }, status);
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const msgs = raw.slice(-MAX_MESSAGES);
  let chars = 0;
  let images = 0;
  const out = [];
  for (const m of msgs) {
    if (!m || !['system', 'user', 'assistant'].includes(m.role)) return null;
    if (typeof m.content === 'string') {
      chars += m.content.length;
      out.push({ role: m.role, content: m.content });
    } else if (Array.isArray(m.content) && m.role === 'user') {
      const parts = [];
      for (const p of m.content) {
        if (p && p.type === 'text' && typeof p.text === 'string') {
          chars += p.text.length;
          parts.push({ type: 'text', text: p.text });
        } else if (p && p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string'
          && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(p.image_url.url)
          && p.image_url.url.length <= MAX_IMAGE_CHARS && images < MAX_IMAGES) {
          images++;
          parts.push({ type: 'image_url', image_url: { url: p.image_url.url } });
        }
      }
      if (!parts.length) return null;
      out.push({ role: m.role, content: parts });
    } else {
      return null;
    }
  }
  if (chars > MAX_CHARS) return null;
  return out;
}

// Sem chave: usa o serviço grátis da Pollinations a partir do servidor
// (do servidor ele não exige captcha). Imagens viram só texto.
async function callFree(messages) {
  const plain = messages.map((m) => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.map((p) => (p.type === 'text' ? p.text : '[imagem anexada]')).join('\n')
      : m.content,
  }));
  for (let attempt = 0; attempt < 2; attempt++) {
    let r, data = null;
    try {
      r = await fetch(FREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages: plain }),
      });
      data = await r.json();
    } catch {
      return fail('Não consegui falar com a IA grátis agora.', 502);
    }
    const content = r.ok && data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;
    if (content) return json({ choices: [{ index: 0, message: { role: 'assistant', content: String(content).replace(/<think>[\s\S]*?<\/think>/g, '').trim() } }] });
    const msg = (data && data.error && (data.error.message || data.error)) || 'Erro ' + (r && r.status);
    const wait = /retry after (\d+)/i.exec(String(msg));
    if (attempt === 0 && wait && +wait[1] <= 20) {
      await new Promise((ok) => setTimeout(ok, (+wait[1] + 1) * 1000));
      continue;
    }
    return fail('A IA grátis está ocupada agora (' + String(msg).slice(0, 160) + '). Tente de novo em alguns segundos.', 429);
  }
}

export async function onRequestPost({ request, env }) {
  // Só aceita chamadas vindas do próprio site.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return fail('Origem não permitida.', 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('JSON inválido.', 400);
  }

  const messages = sanitizeMessages(body && body.messages);
  if (!messages) return fail('Mensagens inválidas ou grandes demais.', 400);

  if (!env.GEMINI_API_KEY) return callFree(messages);

  const model = ALLOWED_MODELS.includes(body.model) ? body.model : ALLOWED_MODELS[0];
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 1400, 64), 2500);

  let upstream;
  try {
    upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GEMINI_API_KEY },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
    });
  } catch {
    return fail('Não consegui falar com o Gemini agora.', 502);
  }

  let data = null;
  try {
    data = await upstream.json();
  } catch {}

  if (!upstream.ok) {
    const err = Array.isArray(data) ? data[0] && data[0].error : data && data.error;
    const msg = (err && (err.message || err.status)) || 'Erro ' + upstream.status + ' no Gemini';
    // 401/403 do Gemini = problema na chave do site, não do visitante.
    const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : 500;
    return fail(String(msg).slice(0, 300), status);
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (!content) return fail('Resposta vazia do Gemini.', 502);

  return json({ choices: [{ index: 0, message: { role: 'assistant', content } }] });
}

export function onRequest() {
  return fail('Use POST.', 405);
}
