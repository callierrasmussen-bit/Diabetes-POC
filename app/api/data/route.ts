import { NextResponse } from "next/server";
import { requestClient } from "@/lib/supabase";
import { schemas, type Table } from "@/lib/domain";
export async function GET(req: Request) {
  const db = requestClient(req);
  if (!db)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const owner = new URL(req.url).searchParams.get("owner") || user.id;
  const entries = await Promise.all(
    Object.keys(schemas).map(async (table) => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("owner_id", owner)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return [table, data];
    }),
  ).catch(() => null);
  if (!entries)
    return NextResponse.json(
      {
        error: "Could not load records. Check database setup and permissions.",
      },
      { status: 403 },
    );
  const { data: clinical } = await db
    .from("clinician_settings")
    .select("*")
    .eq("owner_id", owner);
  return NextResponse.json(
    { ...Object.fromEntries(entries), clinician_settings: clinical || [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  const db = requestClient(req);
  if (!db)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  try {
    const body = await req.json();
    if (!Object.hasOwn(schemas, body.table)) throw Error("Unknown record type");
    const table = body.table as Table;
    const parsed = schemas[table].safeParse(body.record);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(". ") },
        { status: 400 },
      );
    const { data, error } = await db
      .from(table)
      .insert({
        ...parsed.data,
        owner_id: body.owner || user.id,
        created_by: user.id,
      })
      .select()
      .single();
    if (error)
      return NextResponse.json(
        { error: "Could not save. Check your access and try again." },
        { status: 403 },
      );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
