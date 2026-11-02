import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMg,
  toMmol,
  canAccess,
  linkMeal,
  patterns,
  suitable,
  consolidate,
  schemas,
} from "../lib/domain";
import { recipes } from "../lib/demo";
const meal = {
  id: "m",
  name: "Rice bowl",
  recorded_at: "2026-10-01T12:00:00Z",
  carbs: 40,
  servings: 1,
};
const readings = [
  {
    id: "pre",
    value: 110,
    unit: "mg/dL",
    context: "before meal",
    recorded_at: "2026-10-01T11:45:00Z",
  },
  {
    id: "post",
    value: 8.3,
    unit: "mmol/L",
    context: "after meal",
    recorded_at: "2026-10-01T14:00:00Z",
    meal_id: "m",
  },
];
test("conversion rounds correctly and preserves mg/dL", () => {
  assert.equal(toMg(6.5, "mmol/L"), 117);
  assert.equal(toMmol(180), 10);
  assert.equal(toMg(118, "mg/dL"), 118);
});
test("authorization requires accepted, unrevoked consent and write grant", () => {
  const g = {
    caregiver_id: "c",
    senior_id: "s",
    accepted: true,
    revoked: false,
    can_write: false,
  };
  assert.ok(canAccess("s", "s", []));
  assert.ok(canAccess("c", "s", [g]));
  assert.ok(!canAccess("c", "s", [g], true));
  assert.ok(!canAccess("c", "s", [{ ...g, revoked: true }]));
  assert.ok(!canAccess("c", "s", [{ ...g, accepted: false }]));
  assert.ok(!canAccess("stranger", "s", [g]));
});
test("meal linking compares only timed pre and post readings, converting units", () => {
  assert.equal(linkMeal(meal, readings)?.delta, 40);
  assert.equal(linkMeal(meal, readings)?.minutes, 120);
  assert.equal(linkMeal(meal, [readings[0]]), null);
  assert.equal(
    linkMeal(meal, [readings[0], { ...readings[1], meal_id: "other" }]),
    null,
  );
  assert.equal(
    linkMeal(meal, [
      readings[0],
      { ...readings[1], recorded_at: "2026-10-01T16:00:00Z" },
    ]),
    null,
  );
});
test("one or two meals never create a pattern; missing pairs do not count", () => {
  assert.equal(patterns([meal], readings).length, 0);
  assert.equal(patterns([meal, { ...meal, id: "m2" }], readings).length, 0);
  assert.equal(patterns([meal, meal, meal], []).length, 0);
});
test("three separate paired meals generate descriptive evidence", () => {
  const meals = [0, 1, 2].map((i) => ({
    ...meal,
    id: "m" + i,
    recorded_at: `2026-10-0${i + 1}T12:00:00Z`,
  }));
  const rs = meals.flatMap((m, i) =>
    readings.map((r) => ({
      ...r,
      id: r.id + i,
      meal_id: r.context === "after meal" ? m.id : undefined,
      recorded_at: r.recorded_at.replace("10-01", `10-0${i + 1}`),
    })),
  );
  const result = patterns(meals, rs);
  assert.equal(result.length, 1);
  assert.equal(result[0].count, 3);
  assert.equal(result[0].average, 40);
});
test("allergy matching is case insensitive and takes priority", () => {
  assert.equal(suitable(recipes[0], ["FISH"]), false);
  assert.equal(suitable(recipes[1], ["milk"]), false);
  assert.equal(suitable(recipes[2], [], ["broccoli"]), false);
  assert.equal(suitable(recipes[2], ["milk"]), true);
});
test("shopping combines same ingredient and scales servings", () => {
  const list = consolidate([
    { recipe: recipes[0], servings: 2 },
    { recipe: recipes[2], servings: 1 },
  ]);
  assert.equal(list.find((i) => i.name === "Broccoli")?.quantity, 3);
  assert.equal(list.find((i) => i.name === "Salmon")?.quantity, 240);
});
test("input validation rejects invalid vitals and contexts", () => {
  assert.equal(
    schemas.glucose_readings.safeParse({
      value: -1,
      unit: "mg/dL",
      context: "fasting",
      recorded_at: meal.recorded_at,
    }).success,
    false,
  );
  assert.equal(
    schemas.blood_pressure_readings.safeParse({
      systolic: 70,
      diastolic: 100,
      pulse: 72,
      recorded_at: meal.recorded_at,
    }).success,
    false,
  );
});
test("duplicate meals or reused evidence do not create three observations", () => {
  assert.equal(patterns([meal, meal, meal], readings).length, 0);
  assert.equal(
    patterns(
      [meal, { ...meal, id: "m2" }, { ...meal, id: "m3" }],
      readings.map((r) => ({ ...r, meal_id: undefined })),
    ).length,
    0,
  );
});
