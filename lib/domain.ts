import { z } from "zod";
export const contexts = [
  "fasting",
  "before meal",
  "after meal",
  "bedtime",
  "other",
] as const;
export const toMg = (value: number, unit: string) =>
  unit === "mmol/L" ? Math.round(value * 18.0182) : value;
export const toMmol = (value: number) =>
  Math.round((value / 18.0182) * 10) / 10;
const time = z.string().datetime({ offset: true });
export const schemas = {
  glucose_readings: z.object({
    value: z.number().positive().max(2000),
    unit: z.enum(["mg/dL", "mmol/L"]),
    context: z.enum(contexts),
    recorded_at: time,
    meal_id: z.string().nullable().optional(),
    notes: z.string().max(2000).default(""),
  }),
  blood_pressure_readings: z
    .object({
      systolic: z.number().int().min(30).max(350),
      diastolic: z.number().int().min(20).max(250),
      pulse: z.number().int().min(20).max(250),
      recorded_at: time,
      notes: z.string().max(2000).default(""),
    })
    .refine(
      (x) => x.systolic > x.diastolic,
      "Systolic must be higher than diastolic",
    ),
  meal_logs: z.object({
    recipe_id: z.string().nullable(),
    name: z.string().min(1).max(200),
    servings: z.number().positive().max(20),
    carbs: z.number().min(0).max(2000),
    recorded_at: time,
    notes: z.string().max(2000).default(""),
    factors: z.string().max(1000).default(""),
  }),
  meal_ratings: z.object({
    meal_id: z.string(),
    stars: z.number().int().min(1).max(5),
    enjoyed: z.boolean(),
    easy: z.boolean(),
    again: z.boolean(),
  }),
  meal_plans: z.object({
    recipe_id: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    servings: z.number().positive().max(20),
  }),
  caregiver_notes: z.object({
    text: z.string().min(1).max(2000),
    recorded_at: time,
  }),
  food_preferences: z.object({
    allergies: z.array(z.string()),
    dislikes: z.array(z.string()),
    preferred: z.string().max(1000),
    restrictions: z.string().max(1000),
    cuisines: z.string().max(500),
    ability: z.string().max(200),
    max_time: z.number().min(5).max(240),
    budget: z.string().max(200),
    servings: z.number().int().min(1).max(20),
    shopping: z.string().max(500),
    equipment: z.string().max(500),
    diabetes_type: z.string().max(100),
    guidance: z.string().max(2000),
    kidney_guidance: z.string().max(1000),
  }),
  shopping_lists: z.object({
    items: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number().min(0),
          unit: z.string(),
          category: z.string(),
          checked: z.boolean(),
          owned: z.boolean(),
        }),
      )
      .max(500),
    days: z.number().int().min(3).max(7),
  }),
};
export type Table = keyof typeof schemas;
export type Row = {
  id: string;
  owner_id?: string;
  created_by?: string;
  [key: string]: any;
};
export type Reading = {
  id: string;
  value: number;
  unit: string;
  recorded_at: string;
  context: string;
  meal_id?: string | null;
};
export type Meal = {
  id: string;
  name: string;
  recorded_at: string;
  carbs: number;
  servings: number;
  factors?: string;
};
export function canAccess(
  actor: string,
  owner: string,
  grants: {
    caregiver_id: string;
    senior_id: string;
    accepted: boolean;
    revoked: boolean;
    can_write: boolean;
  }[],
  write = false,
) {
  return (
    actor === owner ||
    grants.some(
      (g) =>
        g.caregiver_id === actor &&
        g.senior_id === owner &&
        g.accepted &&
        !g.revoked &&
        (!write || g.can_write),
    )
  );
}
export function linkMeal(meal: Meal, readings: Reading[]) {
  const t = Date.parse(meal.recorded_at);
  const pre = readings
    .filter(
      (r) =>
        r.context === "before meal" &&
        Date.parse(r.recorded_at) <= t &&
        t - Date.parse(r.recorded_at) <= 60 * 60000,
    )
    .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))[0];
  const post = readings
    .filter(
      (r) =>
        r.context === "after meal" &&
        (!r.meal_id || r.meal_id === meal.id) &&
        Date.parse(r.recorded_at) - t >= 60 * 60000 &&
        Date.parse(r.recorded_at) - t <= 180 * 60000,
    )
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.recorded_at) - t - 120 * 60000) -
        Math.abs(Date.parse(b.recorded_at) - t - 120 * 60000),
    )[0];
  return pre && post
    ? {
        pre,
        post,
        delta: toMg(post.value, post.unit) - toMg(pre.value, pre.unit),
        minutes: Math.round((Date.parse(post.recorded_at) - t) / 60000),
      }
    : null;
}
export function patterns(meals: Meal[], readings: Reading[]) {
  const groups = new Map<
    string,
    { delta: number; minutes: number; factors: string }[]
  >();
  const usedMeals = new Set<string>();
  const usedPairs = new Set<string>();
  meals.forEach((m) => {
    if (usedMeals.has(m.id)) return;
    usedMeals.add(m.id);
    const linked = linkMeal(m, readings);
    if (linked) {
      const pair = linked.pre.id + ":" + linked.post.id;
      if (usedPairs.has(pair)) return;
      usedPairs.add(pair);
      const k = m.name.toLowerCase();
      groups.set(k, [
        ...(groups.get(k) || []),
        {
          delta: linked.delta,
          minutes: linked.minutes,
          factors: m.factors || "Other factors were not recorded",
        },
      ]);
    }
  });
  return [...groups]
    .filter(([, v]) => v.length >= 3)
    .map(([name, v]) => ({
      name,
      count: v.length,
      average: Math.round(v.reduce((s, x) => s + x.delta, 0) / v.length),
      timing: `${Math.min(...v.map((x) => x.minutes))}–${Math.max(...v.map((x) => x.minutes))} minutes`,
      factors: [...new Set(v.map((x) => x.factors))].join("; "),
    }));
}
export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};
export type Recipe = {
  id: string;
  name: string;
  slot: string;
  minutes: number;
  carbs: number;
  fiber: number;
  protein: number;
  sodium: number;
  calories: number;
  allergens: string[];
  ingredients: Ingredient[];
  steps: string[];
  color: string;
  emoji: string;
  description: string;
};
export function suitable(
  recipe: Recipe,
  allergies: string[],
  dislikes: string[] = [],
) {
  const words = [...recipe.allergens, ...recipe.ingredients.map((i) => i.name)]
    .join(" ")
    .toLowerCase();
  return ![...allergies, ...dislikes]
    .filter(Boolean)
    .some((a) => words.includes(a.trim().toLowerCase()));
}
export function consolidate(recipes: { recipe: Recipe; servings: number }[]) {
  const map = new Map<
    string,
    Ingredient & { checked: boolean; owned: boolean }
  >();
  recipes.forEach(({ recipe, servings }) =>
    recipe.ingredients.forEach((i) => {
      const key = i.name.toLowerCase() + i.unit;
      const old = map.get(key);
      map.set(key, {
        ...i,
        quantity:
          Math.round(((old?.quantity || 0) + i.quantity * servings) * 100) /
          100,
        checked: false,
        owned: false,
      });
    }),
  );
  return [...map.values()];
}
