import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const appUrl = process.env.FIRE_APP_URL || 'http://127.0.0.1:5162';
const fixturePath = process.env.FIRE_FIXTURE_PATH
  ? path.resolve(repoRoot, process.env.FIRE_FIXTURE_PATH)
  : path.join(repoRoot, 'tools', 'fixtures', 'fire-plan-demo.json');

function getAppOrigin() {
  try {
    return new URL(appUrl).origin;
  } catch {
    throw new Error(`FIRE_APP_URL must be an absolute URL. Received: ${appUrl}`);
  }
}

const screenshots = [
  {
    tab: 'accumulation',
    selector: '#accumulation-overview-container',
    output: path.join(repoRoot, 'docs', 'images', 'fire-accumulation-portfolio.jpg')
  },
  {
    tab: 'rsu',
    selector: '#content-rsu',
    output: path.join(repoRoot, 'docs', 'images', 'fire-rsu.jpg')
  },
  {
    tab: 'expenses',
    selector: '#content-expenses',
    output: path.join(repoRoot, 'docs', 'images', 'fire-planned-expenses.jpg')
  },
  {
    tab: 'retirement',
    selector: '#retirement-enabled-content',
    output: path.join(repoRoot, 'docs', 'images', 'fire-retirement-portfolio.jpg')
  },
  {
    tab: 'results',
    selector: '#content-results',
    output: path.join(repoRoot, 'docs', 'images', 'fire-results.jpg')
  },
  {
    tab: 'money-flow',
    selector: '#content-money-flow',
    output: path.join(repoRoot, 'docs', 'images', 'fire-money-flow.jpg')
  }
];

async function isAppReady() {
  try {
    const response = await fetch(getAppOrigin());
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApp(timeoutMs = 120000) {
  const start = Date.now();
  const appOrigin = getAppOrigin();

  while (Date.now() - start < timeoutMs) {
    if (await isAppReady()) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(`Application did not become ready at ${appOrigin} within ${timeoutMs}ms`);
}

function startApp() {
  const appOrigin = getAppOrigin();
  const child = spawn(
    'dotnet',
    ['run', '--project', path.join(repoRoot, 'FirePlanningTool.csproj'), '--urls', appOrigin],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        ASPNETCORE_URLS: appOrigin
      }
    }
  );

  return child;
}

async function stopApp(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    sleep(5000)
  ]);

  if (child.exitCode === null && !child.killed) {
    child.kill('SIGKILL');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      sleep(5000)
    ]);
  }
}

async function loadDemoPlan(page, fixture) {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.fireApp?.loadPlanFromData === 'function');

  await page.evaluate(async (plan) => {
    await window.fireApp.loadPlanFromData(plan);
  }, fixture);

  await page.waitForFunction(() => window.fireApp?.getState?.().lastCalculationResult !== null);
  await page.waitForTimeout(1000);
}

async function captureScreenshots(page) {
  for (const screenshot of screenshots) {
    await page.evaluate((tab) => {
      window.fireApp.switchTab(tab);
      window.scrollTo(0, 0);
    }, screenshot.tab);

    const locator = page.locator(screenshot.selector);
    await locator.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: screenshot.output,
      fullPage: true,
      type: 'jpeg',
      quality: 90
    });
  }
}

async function main() {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const appOrigin = getAppOrigin();

  let startedApp = null;
  if (!(await isAppReady())) {
    console.log(`Starting app at ${appOrigin}...`);
    startedApp = startApp();
    await waitForApp();
  } else {
    console.log(`Using existing app at ${appUrl}`);
  }

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1800 },
      deviceScaleFactor: 1
    });

    await loadDemoPlan(page, fixture);
    await captureScreenshots(page);

    console.log('Documentation screenshots regenerated successfully.');
  } finally {
    await browser.close();
    await stopApp(startedApp);
  }
}

main().catch(error => {
  console.error('Failed to regenerate documentation screenshots:', error);
  process.exitCode = 1;
});
