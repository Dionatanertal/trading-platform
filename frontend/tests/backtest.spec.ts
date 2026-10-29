import { expect, test } from '@playwright/test';
import { leanResult, usd } from '../src/leanResult';

test('resultado LEAN nativo é somente leitura e isolado da carteira P02', async ({ page }) => {
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
        if (request.method() !== 'GET' || !request.url().startsWith('http://127.0.0.1:4173/')) requests.push(request.url());
    });
    await page.goto('./');
    await page.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await page.getByRole('button', { name: 'Backtest LEAN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Backtest LEAN', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Proveniência do backtest' })).toContainText('Completed');
    await expect(page.getByText('Execução histórica pré-executada', { exact: false })).toBeVisible();
    await expect(page.locator('.backtest .metric-card').nth(1)).toContainText(usd(leanResult.equity.at(-1)!.value));
    await expect(page.getByRole('img', { name: /Curva de patrimônio LEAN em USD/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Preenchimentos LEAN' })).toContainText('688');
    await expect(page.getByRole('region', { name: 'Preenchimentos LEAN' })).toContainText('filled · backtest');
    await expect(page.getByRole('complementary', { name: 'Enviar ordem simulada' })).toHaveCount(0);
    await page.getByText('Estatísticas nativas, dados e rastreabilidade', { exact: true }).click();
    await expect(page.getByText(leanResult.artifactHashes['p03-spy.json'], { exact: true })).toBeVisible();
    for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const layout = await page.evaluate(() => ({
            width: window.innerWidth,
            scroll: document.documentElement.scrollWidth,
            outside: [...document.querySelectorAll('.backtest *')].filter((element) =>
                element.getBoundingClientRect().right > window.innerWidth).map((element) => element.className || element.tagName),
        }));
        expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
    }
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    await expect(page.getByRole('row', { name: /WIN Comprado 1/ })).toBeVisible();
    await expect(page.getByText('Motor LEAN', { exact: true })).toBeVisible();
    await expect(page.getByText('Não conectado', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
});
