// Gera os ícones do app (aba do navegador, tela do celular, app instalado) a partir do logo
// da marca: apps/web/public/brand/logo.png (fundo transparente).
// Uso, na pasta delivery-app:  pnpm --dir apps/web exec node ../../scripts/make-icons.mjs
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// O sharp vem com o Next: é resolvido a partir da pasta de onde o script é chamado (apps/web).
const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");

const out = path.join(process.cwd(), "public");
const LOGO = path.join(out, "brand/logo.png");
// Creme do material da marca: o logo foi desenhado para ficar em cima dele.
const CREAM = "#FFF9E3";

/** Logo redimensionado para caber em `width` px de largura. */
const logo = (width) => sharp(LOGO).resize({ width: Math.round(width) }).png().toBuffer();

/**
 * Quadrado com o logo no meio. `scale`: largura do logo em relação ao quadrado.
 * `radius`: cantos arredondados (0 a 0.5); `background: null` = fundo transparente.
 */
async function square(size, { scale, radius = 0, background = CREAM }) {
  const base = background
    ? Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="${background}"/></svg>`,
      )
    : { create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  return sharp(base)
    .composite([{ input: await logo(size * scale), gravity: "center" }])
    .png()
    .toBuffer();
}

/** .ico com PNGs dentro (aceito por todos os navegadores atuais). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// Ícone do app: placa creme de cantos arredondados com o logo.
await writeFile(path.join(out, "icons/icon-192.png"), await square(192, { scale: 0.9, radius: 0.2 }));
await writeFile(path.join(out, "icons/icon-512.png"), await square(512, { scale: 0.9, radius: 0.2 }));
// Maskable: o Android recorta em círculo, então o logo fica dentro da área segura (80%).
await writeFile(path.join(out, "icons/maskable-512.png"), await square(512, { scale: 0.66 }));
// iPhone não aceita transparência e arredonda os cantos sozinho: fundo creme inteiro.
await writeFile(path.join(out, "icons/apple-touch-icon.png"), await square(180, { scale: 0.88 }));
// Aba do navegador: só o logo, sem fundo (ocupa a largura toda para continuar legível).
await writeFile(
  path.join(out, "favicon.ico"),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await square(size, { scale: 1, background: null }) })))),
);
console.log("Ícones gerados em apps/web/public");
