import { test, expect } from '@playwright/test'

// ── Trails page ──────────────────────────────────────────────────────────────

test.describe('Trails page', () => {
  test.describe('route accessibility', () => {
    test('renders with 200 and correct title', async ({ page }) => {
      const response = await page.goto('/trails')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Trails/)
    })

    test('shows "Trail Systems" h1', async ({ page }) => {
      await page.goto('/trails')
      await expect(
        page.getByRole('heading', { name: 'Trail Systems', level: 1 }),
      ).toBeVisible()
    })
  })

  test.describe('hero CTAs', () => {
    test('Trail Map button links to /trails/map', async ({ page }) => {
      await page.goto('/trails')
      const link = page.getByRole('link', { name: /Trail Map/i })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', '/trails/map')
    })

    test('Browse All button links to /trails/explore', async ({ page }) => {
      await page.goto('/trails')
      const link = page.getByRole('link', { name: /Browse All/i })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', '/trails/explore')
    })
  })

  test.describe('state-grouped layout', () => {
    test('shows state group headings with system counts', async ({ page }) => {
      await page.goto('/trails')
      // At least one state heading with "· N system(s)" format should appear
      // when the DB has trail systems
      const stateHeadings = page.locator('section h2')
      const count = await stateHeadings.count()
      if (count > 0) {
        // Each visible heading should include a count badge "· N system(s)"
        const firstHeading = stateHeadings.first()
        await expect(firstHeading).toContainText('·')
        await expect(firstHeading).toContainText(/\d+ system/)
      } else {
        // Empty state fallback is acceptable
        await expect(
          page.getByText('No trail systems available yet'),
        ).toBeVisible()
      }
    })

    test('does not show a flat unsectioned grid of all systems', async ({ page }) => {
      await page.goto('/trails')
      // The old design had a single h2 "Trail Systems" followed by a grid.
      // The new design has per-state section headings — confirm the old structure is gone.
      const oldHeading = page.getByRole('heading', { name: /^Trail Systems$/, level: 2 })
      await expect(oldHeading).not.toBeVisible()
    })

    test('no giant Mountain icon in hero', async ({ page }) => {
      await page.goto('/trails')
      // Old hero had a large Mountain icon; new compact hero does not
      // We verify by checking there is no h-12 w-12 icon wrapper div
      const bigIcon = page.locator('.h-12.w-12')
      await expect(bigIcon).not.toBeVisible()
    })
  })

  test.describe('navigation', () => {
    test('Trail Map link navigates to /trails/map', async ({ page }) => {
      await page.goto('/trails')
      await page.getByRole('link', { name: /Trail Map/i }).click()
      await expect(page).toHaveURL(/\/trails\/map/)
    })

    test('Browse All link navigates to /trails/explore', async ({ page }) => {
      await page.goto('/trails')
      await page.getByRole('link', { name: /Browse All/i }).click()
      await expect(page).toHaveURL(/\/trails\/explore/)
    })
  })
})

// ── Parks page ───────────────────────────────────────────────────────────────

test.describe('Parks page', () => {
  test.describe('route accessibility', () => {
    test('renders with 200 and correct title', async ({ page }) => {
      const response = await page.goto('/parks')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Parks/)
    })

    test('shows correct h1', async ({ page }) => {
      await page.goto('/parks')
      await expect(
        page.getByRole('heading', { name: /Skateparks, Pump Tracks/i, level: 1 }),
      ).toBeVisible()
    })
  })

  test.describe('content', () => {
    test('shows facility count in description', async ({ page }) => {
      await page.goto('/parks')
      // Description paragraph says "Browse N facilities across the US"
      await expect(
        page.locator('p').filter({ hasText: /Browse \d[\d,]* facilit/i }),
      ).toBeVisible()
    })

    test('shows state grid links when facilities exist', async ({ page }) => {
      await page.goto('/parks')
      const stateLinks = page.locator('a[href^="/parks/"]')
      const count = await stateLinks.count()
      if (count > 0) {
        // Each state card shows a facility count
        await expect(stateLinks.first()).toContainText(/facilit/)
      } else {
        await expect(
          page.getByText('No facilities synced yet'),
        ).toBeVisible()
      }
    })

    test('state links navigate to state page', async ({ page }) => {
      await page.goto('/parks')
      const stateLinks = page.locator('a[href^="/parks/"]')
      const count = await stateLinks.count()
      if (count > 0) {
        const href = await stateLinks.first().getAttribute('href')
        expect(href).toMatch(/^\/parks\/[a-z-]+$/)
      }
    })
  })
})

// ── Map layer toggle ─────────────────────────────────────────────────────────

test.describe('Map layer toggle', () => {
  // The layer toggle lives on /trails/map (UnifiedMap is used there, not /parks/map)
  const MAP_URL = '/trails/map'

  test.describe('route accessibility', () => {
    test('map page renders with 200', async ({ page }) => {
      const response = await page.goto(MAP_URL)
      // Some map pages may redirect; accept 200 or follow redirect
      expect([200, 301, 302]).toContain(response?.status())
    })
  })

  test.describe('layer toggle UI', () => {
    test('layer toggle panel is visible', async ({ page }) => {
      await page.goto(MAP_URL)
      // UnifiedMap is loaded with ssr:false — wait for the panel to appear in DOM
      // (longer timeout to account for dynamic import + dev-mode compilation)
      await expect(page.getByText('Layers')).toBeVisible({ timeout: 20000 })
    })

    test('layer buttons have aria-pressed attribute', async ({ page }) => {
      await page.goto(MAP_URL)
      // Wait for at least one toggle button to hydrate before counting
      const toggleButtons = page.locator('button[aria-pressed]')
      await toggleButtons.first().waitFor({ timeout: 20000 })
      const count = await toggleButtons.count()
      expect(count).toBeGreaterThan(0)
    })

    test('clicking a layer button toggles aria-pressed', async ({ page }) => {
      await page.goto(MAP_URL)
      // Wait for the toggle UI to be ready before interacting
      await page.locator('button[aria-pressed]').first().waitFor({ timeout: 20000 })

      const buttons = page.locator('button[aria-pressed]')
      const count = await buttons.count()
      if (count === 0) return // No toggle rendered, skip

      const btn = buttons.first()
      const initialState = await btn.getAttribute('aria-pressed')

      await btn.click()

      const newState = await btn.getAttribute('aria-pressed')
      // aria-pressed should have flipped
      expect(newState).not.toBe(initialState)
    })

    test('inactive layer buttons have strikethrough label', async ({ page }) => {
      await page.goto(MAP_URL)
      await page.locator('button[aria-pressed]').first().waitFor({ timeout: 20000 })

      const buttons = page.locator('button[aria-pressed="false"]')
      const count = await buttons.count()
      if (count === 0) return // All layers active, skip

      // The label span inside an inactive button should have line-through
      const labelSpan = buttons.first().locator('span').last()
      const style = await labelSpan.getAttribute('style')
      expect(style).toContain('line-through')
    })
  })
})
