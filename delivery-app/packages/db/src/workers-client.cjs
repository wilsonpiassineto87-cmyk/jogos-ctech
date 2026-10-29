// Carrega a variante wasm do client gerado só quando chamada (no Cloudflare Workers),
// para não ser avaliada no Node (next build / next dev).
module.exports = function loadWorkersPrismaClient() {
  return require("../generated/client/wasm.js").PrismaClient;
};
