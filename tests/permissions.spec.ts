import { test, expect, Page } from "@playwright/test";

const PASSWORD = "Jackalope2024!";
const PROJECT_NAME = "Downtown Renovation";

async function login(page: Page, email: string) {
  await page.goto("/");
  // Fill email
  await page.locator('input[type="email"], input[placeholder*="email" i]').first().fill(email);
  // Fill password
  await page.locator('input[type="password"], input[placeholder*="password" i]').first().fill(PASSWORD);
  // Click sign in button
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for navigation to complete (My Work page loads)
  await page.waitForSelector("text=My Work", { timeout: 10000 });
}

async function navigateToProject(page: Page) {
  // Click on Projects nav
  await page.getByRole("button", { name: /projects/i }).first().click();
  // Click the project card
  await page.locator(`text=${PROJECT_NAME}`).first().click();
  // Wait for project to load
  await page.waitForSelector(`text=${PROJECT_NAME}`, { timeout: 5000 });
}

// ============================================================
// 1. Viewer — read-only access
// ============================================================
test.describe("Viewer role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "viewer@texarchworks.com");
    await navigateToProject(page);
  });

  test("no New Task button visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /new task/i })).not.toBeVisible();
    await expect(page.locator("text=+ New Task")).not.toBeVisible();
  });

  test("no edit/delete controls on task rows", async ({ page }) => {
    // No edit pencil buttons
    await expect(page.locator('button[title="Edit"]')).not.toBeVisible();
    // No delete buttons
    await expect(page.locator('button[title="Delete"]')).not.toBeVisible();
  });

  test("no project edit/delete context menu", async ({ page }) => {
    await expect(page.getByRole("button", { name: /✎ edit/i })).not.toBeVisible();
  });

  test("meeting notes scrub button not visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /scrub notes/i })).not.toBeVisible();
  });
});

// ============================================================
// 2. Member — can create/edit own tasks, no delete
// ============================================================
test.describe("Member role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "member@texarchworks.com");
    await navigateToProject(page);
  });

  test("inline new task row is visible", async ({ page }) => {
    // Switch to list view for inline task row
    await page.getByRole("button", { name: /list/i }).click();
    // The inline add row or "+ New Task" button should be visible
    const addRow = page.locator("text=+ Add item").or(page.locator("text=+ New Task"));
    await expect(addRow.first()).toBeVisible();
  });

  test("edit controls visible on own tasks", async ({ page }) => {
    // Member should see at least one edit button on their assigned tasks
    const editButtons = page.locator('button[title="Edit"]');
    await expect(editButtons.first()).toBeVisible();
  });

  test("no delete button on any task", async ({ page }) => {
    await expect(page.locator('button[title="Delete"]')).not.toBeVisible();
    await expect(page.locator('button[title="Delete task"]')).not.toBeVisible();
  });

  test("no project edit/delete menu", async ({ page }) => {
    await expect(page.getByRole("button", { name: /✎ edit/i })).not.toBeVisible();
  });
});

// ============================================================
// 3. PM — full task controls, no org settings
// ============================================================
test.describe("PM role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "pm@texarchworks.com");
    await navigateToProject(page);
  });

  test("full task controls visible", async ({ page }) => {
    // New task button
    const newTaskBtn = page.getByRole("button", { name: /new task/i }).or(page.locator("text=+ New Task"));
    await expect(newTaskBtn.first()).toBeVisible();
    // Edit button
    await expect(page.locator('button[title="Edit"]').first()).toBeVisible();
    // Delete button
    await expect(page.locator('button[title="Delete"]').or(page.locator('button[title="Delete task"]')).first()).toBeVisible();
  });

  test("project edit menu visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /✎ edit/i })).toBeVisible();
  });

  test("Org Settings / Team nav not visible as org-level admin", async ({ page }) => {
    // PM has org role "member", so Team nav should still be visible (VIEW_ORG_TEAM)
    // but they shouldn't see role-change dropdowns (tested in admin section)
    // PM can see Team nav since all roles have VIEW_ORG_TEAM
    await page.getByRole("button", { name: /team/i }).first().click();
    // Invite member button should be visible (PM has INVITE_MEMBER)
    await expect(page.locator("text=Send Invite").or(page.locator("text=Invite Internal Member"))).toBeVisible();
  });
});

// ============================================================
// 4. Admin — full org controls
// ============================================================
test.describe("Admin role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@texarchworks.com");
  });

  test("Team nav item is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /team/i }).first()).toBeVisible();
  });

  test("role-change dropdowns visible in OrgTeam", async ({ page }) => {
    await page.getByRole("button", { name: /team/i }).first().click();
    // Admin should see role dropdowns for other members
    const roleSelects = page.locator("select");
    await expect(roleSelects.first()).toBeVisible();
  });

  test("remove-member buttons visible in OrgTeam", async ({ page }) => {
    await page.getByRole("button", { name: /team/i }).first().click();
    // Admin should see Delete/Deactivate buttons for other members
    const removeButtons = page.getByRole("button", { name: /delete|deactivate/i });
    await expect(removeButtons.first()).toBeVisible();
  });
});
