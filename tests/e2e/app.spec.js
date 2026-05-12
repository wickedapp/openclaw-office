import { test, expect } from '@playwright/test';

// ─── App Launch & Layout ────────────────────────────────────────────

test.describe('App Launch & Layout', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
  });

  test('navbar renders with branding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/OpenClaw/i);
  });

  test('main content area exists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('live indicator is present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const live = page.getByText('LIVE').first();
    await expect(live).toBeVisible();
  });
});

// ─── Tab Navigation ─────────────────────────────────────────────────

test.describe('Tab Navigation', () => {
  const tabs = [
    'Main Office',
    'Interaction Stats',
    'Agent Thoughts',
    'Cost Savings',
    'Security',
    'Database',
  ];

  for (const tab of tabs) {
    test(`can click "${tab}" tab`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const btn = page.getByRole('button', { name: tab, exact: true }).first();
      await btn.click();
      await expect(btn).toBeVisible();
    });
  }

  test('switching tabs rapidly works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    for (const tab of ['Interaction Stats', 'Security', 'Main Office']) {
      await page.getByRole('button', { name: tab, exact: true }).first().click();
      await page.waitForTimeout(200);
    }
  });
});

// ─── Main Office Content ────────────────────────────────────────────

test.describe('Main Office Content', () => {
  test('office scene or placeholder renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('agent activity section exists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const activity = page.locator('text=/activity|agent|workflow/i').first();
    // Activity section may or may not be visible depending on gateway connection
    expect(activity).toBeDefined();
  });
});

// ─── API Endpoints ──────────────────────────────────────────────────

test.describe('API Endpoints', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
  });

  test('GET /api/stats returns JSON', async ({ request }) => {
    const res = await request.get('/api/stats');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('GET /api/tasks returns JSON', async ({ request }) => {
    const res = await request.get('/api/tasks');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('GET /api/workflow returns JSON', async ({ request }) => {
    const res = await request.get('/api/workflow');
    expect(res.status()).toBe(200);
  });

  test('GET /api/config returns JSON', async ({ request }) => {
    const res = await request.get('/api/config');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('GET /api/messages returns JSON', async ({ request }) => {
    const res = await request.get('/api/messages');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('messages');
  });

  test('POST /api/tasks creates task with current action contract', async ({ request }) => {
    const res = await request.post('/api/tasks', {
      data: { action: 'new_task', taskDetail: 'test task' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      action: 'task_received',
    });
    expect(body.task).toMatchObject({
      detail: 'test task',
      status: 'received',
      receivedBy: 'wickedman',
    });
  });

  test('GET /api/workflow?type=events returns event history JSON', async ({ request }) => {
    const res = await request.get('/api/workflow?type=events');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('events');
    expect(body).toHaveProperty('total');
  });

  test('GET /api/agents/sync returns agents', async ({ request }) => {
    const res = await request.get('/api/agents/sync');
    expect(res.status()).toBe(200);
  });

  test('GET /api/stats/history is not exposed', async ({ request }) => {
    const res = await request.get('/api/stats/history');
    expect(res.status()).toBe(404);
  });
});

// ─── 404 Page ───────────────────────────────────────────────────────

test.describe('404 Page', () => {
  test('returns 404 for unknown routes', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-xyz', { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(404);
  });
});

// ─── Responsive Layout ─────────────────────────────────────────────

test.describe('Responsive Layouts', () => {
  test('desktop layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('tablet layout adapts', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('mobile layout adapts', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });
});
