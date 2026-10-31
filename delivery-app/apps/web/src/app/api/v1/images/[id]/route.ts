import { prisma } from "@/lib/db";

// GET /api/v1/images/<id> — foto de produto enviada pelo painel.
// Cada foto nova ganha um id novo (trocar a foto troca o endereço), então o navegador
// pode guardar para sempre e não pedir de novo.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response("Not found", { status: 404 });

  const image = await prisma.productImage.findUnique({ where: { id }, select: { contentType: true, data: true } });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
