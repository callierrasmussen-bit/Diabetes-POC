import { NextResponse } from "next/server";
import { requestClient } from "@/lib/supabase";
import { z } from "zod";
export async function GET(req: Request) {
  const db = requestClient(req);
  if (!db)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.from("caregiver_permissions").select("*");
  if (error)
    return NextResponse.json(
      { error: "Could not load invitations" },
      { status: 403 },
    );
  return NextResponse.json(
    { grants: data },
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
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const b = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("invite"), email: z.email() }),
        z.object({ action: z.literal("accept"), id: z.uuid() }),
        z.object({ action: z.literal("revoke"), id: z.uuid() }),
      ])
      .parse(await req.json());
    const { error } = await db.rpc(
      "care_" + b.action,
      b.action === "invite" ? { email: b.email } : { invitation: b.id },
    );
    if (error)
      return NextResponse.json(
        {
          error:
            "Could not update this invitation. Check your account and permissions.",
        },
        { status: 403 },
      );
    const { data } = await db.from("caregiver_permissions").select("*");
    return NextResponse.json({ grants: data });
  } catch {
    return NextResponse.json(
      { error: "Check the email or invitation." },
      { status: 400 },
    );
  }
}
