// O app roda no Cloudflare Workers, onde módulos nativos não carregam, e as imagens
// são servidas sem otimização (next.config.ts: images.unoptimized). Este stub só
// existe para o OpenNext não tentar empacotar o sharp de verdade.
function sharp() {
  throw new Error("sharp não está disponível: imagens são servidas sem otimização");
}
sharp.concurrency = () => 0;
sharp.cache = () => ({});
sharp.simd = () => false;

module.exports = sharp;
