import { test, expect } from "@playwright/test";
test("senior records glucose, plans a meal, rates it, and saves shopping list", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A good day starts with a little care.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Log glucose A quick check-in" })
    .click();
  await page
    .getByRole("combobox", { name: "Units", exact: true })
    .selectOption("mmol/L");
  await page.getByRole("spinbutton", { name: "Glucose reading" }).fill("6.5");
  await expect(
    page.getByText("Equivalent to approximately 117 mg/dL"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save glucose reading" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.locator(".vital-value").first()).toContainText("6.5");
  await page.goto("/meals");
  await page
    .getByRole("button", { name: "Lemon herb salmon bowl", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to meal plan" }).click();
  await expect(page.getByRole("status")).toContainText("meal plan");
  await page
    .getByRole("button", { name: "Lemon herb salmon bowl", exact: true })
    .click();
  await page.getByRole("button", { name: "I ate this meal" }).click();
  await page.getByRole("button", { name: "Save meal", exact: true }).click();
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Rate this meal", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save my rating" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto("/shopping");
  await page.getByRole("button", { name: "Generate shopping list" }).click();
  await expect(
    page.getByRole("heading", { name: "Produce", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Lemon", exact: true }).check();
  await page.getByRole("button", { name: "Save list", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Lemon", exact: true }),
  ).toBeChecked();
});
test("preferences exclude fish and accessibility persists on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preferences");
  await page.getByLabel("Allergies (comma separated)").fill("fish");
  await page.getByRole("button", { name: "Save my preferences" }).click();
  await page.goto("/meals");
  await expect(
    page.getByRole("button", { name: "Lemon herb salmon bowl", exact: true }),
  ).toHaveCount(0);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Lemon herb salmon bowl", exact: true }),
  ).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Larger text" }).check();
  await page.getByRole("checkbox", { name: "High contrast" }).check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Larger text" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "High contrast" }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("all pages render and private APIs require authentication", async ({
  page,
  request,
}) => {
  for (const route of [
    "/welcome",
    "/",
    "/glucose",
    "/blood-pressure",
    "/meals",
    "/recipe",
    "/history",
    "/shopping",
    "/trends",
    "/preferences",
    "/caregiver",
    "/notes",
    "/settings",
    "/day",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
  expect((await request.get("/api/data")).status()).toBe(401);
  expect(
    (
      await request.post("/api/data", { data: { table: "glucose_readings" } })
    ).status(),
  ).toBe(401);
  expect((await request.get("/api/caregiver")).status()).toBe(401);
  expect((await request.delete("/api/account")).status()).toBe(401);
  const meals = await request.post("/api/recommendations", {
    data: { allergies: ["fish"], dislikes: [], max_time: 30 },
  });
  expect(meals.status()).toBe(200);
  expect(
    (await meals.json()).recipes.some((r: any) => r.id === "salmon"),
  ).toBeFalsy();
});
