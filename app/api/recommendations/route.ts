import { NextResponse } from "next/server";
import { z } from "zod";
import { recipes } from "@/lib/demo";
import { suitable } from "@/lib/domain";
export async function POST(req: Request) {
  try {
    const input = z
      .object({
        allergies: z.array(z.string().max(100)).max(50),
        dislikes: z.array(z.string().max(100)).max(50),
        max_time: z.number().min(5).max(240),
      })
      .parse(await req.json());
    return NextResponse.json({
      source: "Curated synthetic demo recipes; no external AI used",
      recipes: recipes.filter(
        (r) =>
          r.minutes <= input.max_time &&
          suitable(r, input.allergies, input.dislikes),
      ),
      notice:
        "Check ingredient packaging for allergens and cross-contact. Nutrition is an estimate.",
    });
  } catch {
    return NextResponse.json(
      { error: "Please check meal preferences." },
      { status: 400 },
    );
  }
}
