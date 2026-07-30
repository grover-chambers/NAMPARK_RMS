import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = getVapidPublicKey();
  return NextResponse.json({ publicKey: key });
}
