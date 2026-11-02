import type { Recipe, Row } from "./domain";
export const recipes: Recipe[] = [
  {
    id: "salmon",
    name: "Lemon herb salmon bowl",
    slot: "Lunch",
    minutes: 25,
    carbs: 34,
    fiber: 7,
    protein: 32,
    sodium: 380,
    calories: 460,
    allergens: ["fish"],
    color: "#e9eddb",
    emoji: "🥗",
    description:
      "A bright, satisfying bowl with tender salmon, hearty grains, and plenty of greens.",
    ingredients: [
      { name: "Salmon", quantity: 120, unit: "g", category: "Protein" },
      {
        name: "Brown rice, cooked",
        quantity: 0.5,
        unit: "cup",
        category: "Grains",
      },
      { name: "Broccoli", quantity: 1, unit: "cup", category: "Produce" },
      { name: "Lemon", quantity: 0.5, unit: "whole", category: "Produce" },
      { name: "Olive oil", quantity: 1, unit: "tsp", category: "Pantry" },
    ],
    steps: [
      "Heat oven to 400°F / 200°C. Place salmon and broccoli on a tray.",
      "Drizzle with olive oil and lemon. Bake 15–18 minutes, until fish reaches 145°F / 63°C.",
      "Serve with cooked brown rice. Check fish carefully for bones.",
    ],
  },
  {
    id: "oats",
    name: "Blueberry overnight oats",
    slot: "Breakfast",
    minutes: 10,
    carbs: 32,
    fiber: 6,
    protein: 15,
    sodium: 85,
    calories: 310,
    allergens: ["milk", "dairy", "oats"],
    color: "#eee8f5",
    emoji: "🫐",
    description:
      "Creamy oats, juicy berries, and a little cinnamon. A lovely make-ahead breakfast.",
    ingredients: [
      { name: "Rolled oats", quantity: 0.33, unit: "cup", category: "Grains" },
      {
        name: "Plain Greek yogurt",
        quantity: 0.5,
        unit: "cup",
        category: "Dairy",
      },
      { name: "Blueberries", quantity: 0.5, unit: "cup", category: "Produce" },
      { name: "Cinnamon", quantity: 0.25, unit: "tsp", category: "Pantry" },
    ],
    steps: [
      "Mix oats and yogurt with a splash of water.",
      "Add berries and cinnamon. Cover and refrigerate overnight.",
      "Stir and enjoy cold, or gently warm before serving.",
    ],
  },
  {
    id: "chicken",
    name: "Garden chicken & vegetables",
    slot: "Dinner",
    minutes: 30,
    carbs: 28,
    fiber: 8,
    protein: 35,
    sodium: 320,
    calories: 420,
    allergens: [],
    color: "#f4e6d3",
    emoji: "🍗",
    description:
      "A simple one-pan supper with colorful vegetables and a comforting roasted flavor.",
    ingredients: [
      { name: "Chicken breast", quantity: 130, unit: "g", category: "Protein" },
      {
        name: "Sweet potato",
        quantity: 0.5,
        unit: "whole",
        category: "Produce",
      },
      { name: "Broccoli", quantity: 1, unit: "cup", category: "Produce" },
      { name: "Olive oil", quantity: 1, unit: "tsp", category: "Pantry" },
    ],
    steps: [
      "Heat oven to 400°F / 200°C. Cut sweet potato into small cubes.",
      "Arrange vegetables and chicken on a tray. Brush with oil and herbs.",
      "Roast 25–30 minutes until chicken reaches 165°F / 74°C.",
    ],
  },
  {
    id: "apple",
    name: "Apple & sunflower butter",
    slot: "Snack",
    minutes: 5,
    carbs: 19,
    fiber: 4,
    protein: 4,
    sodium: 45,
    calories: 180,
    allergens: ["sunflower"],
    color: "#e8efdf",
    emoji: "🍎",
    description:
      "Crisp apple slices with a creamy dip for an easy afternoon bite.",
    ingredients: [
      { name: "Apple", quantity: 1, unit: "small", category: "Produce" },
      {
        name: "Sunflower butter",
        quantity: 1,
        unit: "tbsp",
        category: "Pantry",
      },
    ],
    steps: [
      "Wash and slice the apple, removing the core.",
      "Serve with sunflower butter for dipping. Check the label for allergen cross-contact.",
    ],
  },
];
export const defaultPreferences = {
  allergies: [],
  dislikes: [],
  preferred: "Salmon, berries, chicken, fresh vegetables",
  restrictions: "",
  cuisines: "Mediterranean, home cooking",
  ability: "Simple recipes",
  max_time: 30,
  budget: "Moderate",
  servings: 1,
  shopping: "Weekly grocery shop",
  equipment: "Oven, stovetop, microwave",
  diabetes_type: "Not specified",
  guidance: "",
  kidney_guidance: "",
};
export function demoData(): Record<string, Row[]> {
  const now = new Date();
  const at = (days: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return {
    glucose_readings: [
      {
        id: "g0",
        value: 118,
        unit: "mg/dL",
        context: "fasting",
        recorded_at: at(0, 8, 15),
        notes: "",
      },
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `g${i + 1}`,
        value: [126, 132, 119, 141, 124, 130, 122][i],
        unit: "mg/dL",
        context: "fasting",
        recorded_at: at(i + 1, 8),
        notes: "",
      })),
    ],
    blood_pressure_readings: [
      {
        id: "b0",
        systolic: 124,
        diastolic: 78,
        pulse: 72,
        recorded_at: at(0, 8, 20),
        notes: "After resting",
      },
      {
        id: "b1",
        systolic: 128,
        diastolic: 80,
        pulse: 74,
        recorded_at: at(2, 8),
        notes: "",
      },
    ],
    meal_plans: recipes
      .slice(0, 3)
      .map((r, i) => ({
        id: `p${i}`,
        recipe_id: r.id,
        date: now.toLocaleDateString("en-CA"),
        slot: r.slot,
        servings: 1,
      })),
    meal_logs: [
      {
        id: "m0",
        recipe_id: "oats",
        name: "Blueberry overnight oats",
        carbs: 32,
        servings: 1,
        recorded_at: at(0, 8, 30),
        notes: "Lovely with cinnamon",
        factors: "",
      },
      {
        id: "m1",
        recipe_id: "salmon",
        name: "Lemon herb salmon bowl",
        carbs: 34,
        servings: 1,
        recorded_at: at(1, 12, 30),
        notes: "",
        factors: "",
      },
    ],
    meal_ratings: [
      {
        id: "r0",
        meal_id: "m1",
        stars: 5,
        enjoyed: true,
        easy: true,
        again: true,
      },
    ],
    caregiver_notes: [
      {
        id: "n0",
        text: "I’ll stop by this afternoon. Shall we make the salmon bowl together? — Sarah",
        recorded_at: at(0, 9),
        created_by: "Demo caregiver Sarah",
      },
    ],
    food_preferences: [
      { id: "f0", ...defaultPreferences, diabetes_type: "Type 2" },
    ],
    shopping_lists: [],
  };
}
