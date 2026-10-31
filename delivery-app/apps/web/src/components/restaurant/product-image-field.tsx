"use client";

import { Camera, ImageOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ILLUSTRATIONS, UPLOAD_MAX_BYTES } from "@/lib/product-images";
import { cn } from "@/lib/utils";

const MAX_SIDE = 900;

/**
 * Foto do produto no formulário do painel. A foto escolhida no aparelho (galeria ou
 * câmera) é reduzida aqui mesmo antes de enviar: uma foto de celular de ~4 MB vira
 * ~100 KB, o envio fica rápido e o cardápio carrega leve.
 *
 * Campos enviados: "image" (arquivo, quando escolheu foto) e "imageUrl" (ilustração
 * escolhida, foto atual ou vazio para ficar sem foto).
 */
export function ProductImageField({ current }: { current?: string | null }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(current ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O formulário é limpo depois de salvar (React faz form.reset()): volta ao estado inicial.
  useEffect(() => {
    const form = fileRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setUrl(current ?? "");
      setPreview(null);
      setError(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [current]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      const small = await shrink(file);
      if (small.size > UPLOAD_MAX_BYTES) throw new Error("too-big");
      const transfer = new DataTransfer();
      transfer.items.add(small);
      input.files = transfer.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      input.value = "";
      setPreview(null);
      setError("Não foi possível usar essa foto. Tente outra.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
  }

  const shown = preview ?? (url || null);

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <input type="hidden" name="imageUrl" value={url} />
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor={`${id}-file`}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <Camera className="size-4" />
            {busy ? "Preparando foto..." : preview ? "Trocar foto" : "Foto do celular"}
          </label>
          <input ref={fileRef} id={`${id}-file`} type="file" name="image" accept="image/*" onChange={onPick} className="sr-only" />
          {shown && (
            <button
              type="button"
              onClick={() => {
                clearFile();
                setUrl("");
              }}
              className="block text-xs text-destructive hover:underline"
            >
              Ficar sem foto
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {preview && <p className="text-xs text-muted-foreground">Foto escolhida. Ela é enviada quando você salvar.</p>}

      <p className="pt-1 text-xs text-muted-foreground">Ou use uma ilustração pronta:</p>
      <div className="flex flex-wrap gap-2">
        {ILLUSTRATIONS.map((art) => (
          <button
            key={art.src}
            type="button"
            title={art.label}
            aria-label={`Usar ilustração: ${art.label}`}
            aria-pressed={!preview && url === art.src}
            onClick={() => {
              clearFile();
              setUrl(art.src);
            }}
            className={cn(
              "size-11 overflow-hidden rounded-lg border-2 border-transparent",
              !preview && url === art.src && "border-primary",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.src} alt="" className="size-full" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Reduz para no máximo MAX_SIDE px no lado maior e converte para WebP (ou JPEG). */
async function shrink(file: File): Promise<File> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  // iPhones antigos não geram WebP (devolvem PNG, bem maior): aí usa JPEG.
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("encode");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `foto.${ext}`, { type: blob.type });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Respeita a rotação gravada pela câmera (foto em pé continua em pé).
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const src = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(src);
    }
  }
}
