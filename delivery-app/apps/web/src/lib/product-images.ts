// Ilustrações prontas (public/products) que a loja pode usar no lugar de uma foto.
export const ILLUSTRATIONS = [
  { src: "/products/sorvete-copo.svg", label: "Sorvete no copo" },
  { src: "/products/casquinha.svg", label: "Casquinha" },
  { src: "/products/acai.svg", label: "Açaí" },
  { src: "/products/milkshake.svg", label: "Milkshake" },
  { src: "/products/picole-fruta.svg", label: "Picolé de fruta" },
  { src: "/products/picole-cremoso.svg", label: "Picolé cremoso" },
] as const;

/** Prefixo das fotos enviadas e guardadas no banco (app/api/v1/images/[id]). */
export const UPLOADED_IMAGE_PREFIX = "/api/v1/images/";

/** Tipos aceitos no envio. O aparelho já converte para WebP ou JPEG antes de mandar. */
export const UPLOAD_TYPES = ["image/webp", "image/jpeg", "image/png"];
export const UPLOAD_MAX_BYTES = 1_500_000;
