import { NextResponse } from "next/server";
import { requestClient } from "@/lib/supabase";
export async function DELETE(req: Request) {
  const db = requestClient(req);
  if (!db)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { error } = await db.rpc("delete_my_records");
  return NextResponse.json(
    error ? { error: "Could not delete records" } : { deleted: true },
    { status: error ? 403 : 200 },
  );
}
