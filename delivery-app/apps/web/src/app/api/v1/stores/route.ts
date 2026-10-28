import { storeListQuerySchema } from "@delivery/validators";
import { NextResponse } from "next/server";
import { apiHandler, parseQuery } from "@/lib/api";
import { listStores } from "@/features/stores/queries";

// GET /api/v1/stores?lat=-23.56&lng=-46.65&category=pizza&q=&limit=20
export const GET = apiHandler(async (req) => {
  const { lat, lng, ...rest } = parseQuery(req, storeListQuerySchema);
  const stores = await listStores({ latitude: lat, longitude: lng, ...rest });
  return NextResponse.json({ data: stores });
});
