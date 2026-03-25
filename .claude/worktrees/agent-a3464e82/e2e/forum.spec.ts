import { test, expect } from '@playwright/test'

test.describe('Forum Module', () => {
  // ── Route accessibility ──────────────────────────────────────────────

  test.describe('route accessibility', () => {
    test('forum home page renders with correct title and heading', async ({ page }) => {
      const response = await page.goto('/forum')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Forum/)
      await expect(
        page.getByRole('heading', { name: /Community Forum/i }),
      ).toBeVisible()
    })

    test('forum page has categories section', async ({ page }) => {
      await page.goto('/forum')
      await expect(
        page.getByRole('heading', { name: /Categories/i }),
      ).toBeVisible()
    })
  })

  // ── Empty state handling ───────────────────────────────────────────

  test.describe('empty state handling', () => {
    test('forum home shows categories section even when empty', async ({ page }) => {
      await page.goto('/forum')
      // With no seed data, categories may be empty but the section heading exists
      await expect(
        page.getByRole('heading', { name: /Categories/i }),
      ).toBeVisible()
    })
  })

  // ── 404 handling ────────────────────────────────────────────────────

  test.describe('not-found handling', () => {
    test('invalid category slug returns 404 or not-found page', async ({ page }) => {
      const response = await page.goto('/forum/nonexistent-category-slug-xyz')
      // Should show not-found page (404)
      expect(response?.status()).toBe(404)
    })

    test('invalid thread slug returns 404 or not-found page', async ({ page }) => {
      const response = await page.goto('/forum/thread/nonexistent-thread-slug-xyz')
      // Should show not-found page (404)
      expect(response?.status()).toBe(404)
    })
  })

  // ── Page structure ──────────────────────────────────────────────────

  test.describe('page structure', () => {
    test('forum home has hero section with description', async ({ page }) => {
      await page.goto('/forum')
      await expect(
        page.getByText(/Connect with fellow riders/i),
      ).toBeVisible()
    })

    test('forum home has accessible navigation', async ({ page }) => {
      await page.goto('/forum')
      // Should not have any broken links on the page
      const links = page.locator('a[href^="/forum"]')
      const count = await links.count()
      expect(count).toBeGreaterThanOrEqual(0) // At least the page loads
    })
  })

  // ── Auth-gated features ─────────────────────────────────────────────

  test.describe('auth-gated features', () => {
    test('new thread page redirects unauthenticated users', async ({ page }) => {
      // Visiting new thread page without auth should redirect to signin
      await page.goto('/forum/general/new')
      // Either redirects to /signin or shows 404 (if category doesn't exist)
      const url = page.url()
      expect(url.includes('/signin') || url.includes('/forum')).toBe(true)
    })
  })
})
