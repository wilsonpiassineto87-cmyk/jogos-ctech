// Carrega a variante wasm do Prisma pela condição "require": no Prisma 6.19 a
// condição "import" de `@prisma/client/wasm` aponta para um wasm.mjs inexistente.
module.exports = require("@prisma/client/wasm");
