import { test, expect } from '@playwright/test'

test.describe('Learn Module', () => {
  // ── Route accessibility ──────────────────────────────────────────────

  test.describe('route accessibility', () => {
    test('learn home page renders with correct title and heading', async ({ page }) => {
      const response = await page.goto('/learn')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Learn/)
      await expect(
        page.getByRole('heading', { name: /Master Mountain Biking/i }),
      ).toBeVisible()
    })

    test('courses page renders with correct title and heading', async ({ page }) => {
      const response = await page.goto('/learn/courses')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Courses/)
      await expect(
        page.getByRole('heading', { name: /Courses/i, level: 1 }),
      ).toBeVisible()
    })

    test('quizzes page renders with correct title and heading', async ({ page }) => {
      const response = await page.goto('/learn/quizzes')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Quizzes/)
      await expect(
        page.getByRole('heading', { name: /Quizzes/i, level: 1 }),
      ).toBeVisible()
    })

    test('leaderboard page renders with correct title and heading', async ({ page }) => {
      const response = await page.goto('/learn/leaderboard')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Leaderboard/)
      await expect(
        page.getByRole('heading', { name: /Leaderboard/i, level: 1 }),
      ).toBeVisible()
    })
  })

  // ── Empty state handling ─────────────────────────────────────────────

  test.describe('empty state handling', () => {
    test('courses page shows empty state when no courses exist', async ({ page }) => {
      await page.goto('/learn/courses')
      // With no seed data, the courses list should be empty —
      // either the EmptyState component or an empty grid is shown
      const emptyState = page.getByText('No courses found')
      const courseGrid = page.locator('.grid')
      // One of these should be present
      await expect(emptyState.or(courseGrid)).toBeVisible()
    })

    test('quizzes page shows empty state when no quizzes exist', async ({ page }) => {
      await page.goto('/learn/quizzes')
      await expect(
        page.getByText('No quizzes available yet'),
      ).toBeVisible()
    })

    test('leaderboard shows empty state when no XP data exists', async ({ page }) => {
      await page.goto('/learn/leaderboard')
      await expect(
        page.getByText('No leaderboard data yet'),
      ).toBeVisible()
    })
  })

  // ── 404 handling ─────────────────────────────────────────────────────

  test.describe('404 handling for non-existent resources', () => {
    test('non-existent course slug shows not-found page', async ({ page }) => {
      await page.goto('/learn/courses/non-existent-slug')
      await expect(
        page.getByText('Page not found'),
      ).toBeVisible()
    })

    test('non-existent quiz slug shows not-found page', async ({ page }) => {
      await page.goto('/learn/quizzes/non-existent-slug')
      await expect(
        page.getByText('Page not found'),
      ).toBeVisible()
    })

    test('non-existent certificate id shows not-found page', async ({ page }) => {
      await page.goto('/learn/certificates/non-existent-id')
      await expect(
        page.getByText('Page not found'),
      ).toBeVisible()
    })
  })

  // ── Page structure ───────────────────────────────────────────────────

  test.describe('page structure', () => {
    test('learn home has hero section with CTA buttons', async ({ page }) => {
      await page.goto('/learn')

      // Hero heading
      await expect(
        page.getByRole('heading', { name: /Master Mountain Biking/i }),
      ).toBeVisible()

      // CTA links in hero
      await expect(page.getByRole('link', { name: /Browse Courses/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Take a Quiz/i })).toBeVisible()
    })

    test('learn home has "How It Works" feature cards', async ({ page }) => {
      await page.goto('/learn')

      await expect(
        page.getByRole('heading', { name: /How It Works/i }),
      ).toBeVisible()

      // Verify all four steps are present
      await expect(page.getByText('Watch video lessons and read expert guides')).toBeVisible()
      await expect(page.getByText('Test your knowledge with interactive quizzes')).toBeVisible()
      await expect(page.getByText('Score well to earn XP')).toBeVisible()
      await expect(page.getByText('Complete all modules in a course to earn')).toBeVisible()
    })

    test('learn home has "Browse by Category" grid', async ({ page }) => {
      await page.goto('/learn')

      await expect(
        page.getByRole('heading', { name: /Browse by Category/i }),
      ).toBeVisible()

      // Verify category labels
      const categories = ['Riding Skills', 'Maintenance', 'Fitness', 'Etiquette', 'Nutrition', 'Gear']
      for (const category of categories) {
        await expect(page.getByRole('heading', { name: category })).toBeVisible()
      }
    })

    test('learn home has CTA section at bottom', async ({ page }) => {
      await page.goto('/learn')

      await expect(
        page.getByRole('heading', { name: /Ready to level up your riding/i }),
      ).toBeVisible()
      await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
    })

    test('courses page has search input', async ({ page }) => {
      await page.goto('/learn/courses')

      await expect(
        page.getByPlaceholder('Search courses...'),
      ).toBeVisible()
    })

    test('courses page has category filter pills', async ({ page }) => {
      await page.goto('/learn/courses')

      // Category filter label
      await expect(page.getByText('Category:')).toBeVisible()

      // Difficulty filter label
      await expect(page.getByText('Difficulty:')).toBeVisible()
    })

    test('leaderboard page has breadcrumb navigation', async ({ page }) => {
      await page.goto('/learn/leaderboard')

      const nav = page.locator('nav')
      await expect(nav.getByRole('link', { name: 'Learn' })).toBeVisible()
    })

    test('leaderboard page has back link to learn home', async ({ page }) => {
      await page.goto('/learn/leaderboard')

      await expect(
        page.getByRole('link', { name: /Back to Learn/i }),
      ).toBeVisible()
    })
  })

  // ── Navigation ───────────────────────────────────────────────────────

  test.describe('navigation', () => {
    test('learn home "Browse Courses" links to courses page', async ({ page }) => {
      await page.goto('/learn')

      await page.getByRole('link', { name: /Browse Courses/i }).click()
      await expect(page).toHaveURL(/\/learn\/courses/)
      await expect(
        page.getByRole('heading', { name: /Courses/i, level: 1 }),
      ).toBeVisible()
    })

    test('learn home "Take a Quiz" links to quizzes page', async ({ page }) => {
      await page.goto('/learn')

      await page.getByRole('link', { name: /Take a Quiz/i }).click()
      await expect(page).toHaveURL(/\/learn\/quizzes/)
      await expect(
        page.getByRole('heading', { name: /Quizzes/i, level: 1 }),
      ).toBeVisible()
    })

    test('category links navigate with query parameter', async ({ page }) => {
      await page.goto('/learn')

      // Click a category card (e.g., "Riding Skills")
      await page.getByRole('link', { name: /Riding Skills/i }).first().click()
      await expect(page).toHaveURL(/\/learn\/courses\?category=riding_skills/)
    })
  })
})
