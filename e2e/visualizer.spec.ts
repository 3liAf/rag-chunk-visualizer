import { test, expect } from '@playwright/test';

test.describe('RAG Chunk Visualizer E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('loads interface with proper branding and initial state', async ({ page }) => {
    await expect(page).toHaveTitle(/RAG Chunk Visualizer & Overlap Inspector/);
    
    // Branding links
    const brandLink = page.getByRole('link', { name: /Made with AstraMeld/i });
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute('href', 'https://astrameld.com');

    // Metrics are populated
    const metricChunks = page.locator('#metric-chunks');
    await expect(metricChunks).toBeVisible();
    const count = await metricChunks.textContent();
    expect(Number(count)).toBeGreaterThan(0);

    const metricTokens = page.locator('#metric-tokens');
    const tokenCount = await metricTokens.textContent();
    expect(Number(tokenCount)).toBeGreaterThan(0);
  });

  test('switches splitting strategies reactively', async ({ page }) => {
    // Switch to Sentence-aware
    const sentenceBtn = page.getByRole('button', { name: /Sentence-Aware/i });
    await sentenceBtn.click();
    await expect(sentenceBtn).toHaveClass(/active/);

    // Switch to Markdown
    const markdownBtn = page.getByRole('button', { name: /Markdown Header Aware/i });
    await markdownBtn.click();
    await expect(markdownBtn).toHaveClass(/active/);

    // Switch to Fixed
    const fixedBtn = page.getByRole('button', { name: /Fixed Sliding Window/i });
    await fixedBtn.click();
    await expect(fixedBtn).toHaveClass(/active/);

    // Verify chunk cards exist
    const cards = page.locator('.chunk-card');
    await expect(cards.first()).toBeVisible();
  });

  test('adjusts chunk size and overlap sliders', async ({ page }) => {
    const sizeSlider = page.locator('#chunk-size');
    await sizeSlider.fill('500');
    await sizeSlider.dispatchEvent('input');

    const sizeVal = page.locator('#chunk-size-val');
    await expect(sizeVal).toHaveText('500 chars');

    const overlapSlider = page.locator('#chunk-overlap');
    await overlapSlider.fill('100');
    await overlapSlider.dispatchEvent('input');

    const overlapVal = page.locator('#chunk-overlap-val');
    await expect(overlapVal).toHaveText('100 chars');
  });

  test('loads different benchmark sample documents', async ({ page }) => {
    const sampleSelect = page.locator('#sample-select');
    await sampleSelect.selectOption('legal-contract');

    const textarea = page.locator('#input-text');
    await expect(textarea).toHaveValue(/DATA PROCESSING ADDENDUM/);

    const metricChunks = page.locator('#metric-chunks');
    const count = await metricChunks.textContent();
    expect(Number(count)).toBeGreaterThan(0);
  });

  test('opens export pipeline modal and switches tabs', async ({ page }) => {
    const exportBtn = page.locator('#open-export-btn');
    await exportBtn.click();

    const modal = page.locator('#export-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Check LangChain tab code
    const codeBlock = page.locator('#export-code-block');
    await expect(codeBlock).toContainText('RecursiveCharacterTextSplitter');
    await expect(codeBlock).toContainText('astrameld.com');

    // Switch to LlamaIndex tab
    const llamaTab = page.locator('.export-tab-btn[data-tab="llamaindex"]');
    await llamaTab.click();
    await expect(codeBlock).toContainText('llama_index');

    // Switch to JSON tab
    const jsonTab = page.locator('.export-tab-btn[data-tab="json"]');
    await jsonTab.click();
    await expect(codeBlock).toContainText('"generator": "RAG Chunk Visualizer & Overlap Inspector"');

    // Close modal
    const closeBtn = page.locator('#close-export-btn');
    await closeBtn.click();
    await expect(modal).toHaveClass(/hidden/);
  });
});
