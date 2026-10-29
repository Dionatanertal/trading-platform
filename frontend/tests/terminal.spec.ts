import { expect, test } from '@playwright/test';
import { money, number, priceAt, scenarioTime } from '../src/market';

test.beforeEach(async ({ page }) => {
    await page.goto('./');
});

test('gráfico, seleção, indicadores, zoom, tema e proveniência', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Terminal de trading', exact: true })).toBeVisible();
    await expect(page.getByText('ZERO ORDENS REAIS')).toBeAttached();
    const chart = page.getByRole('img', { name: /Gráfico de candles sintéticos/ });
    await expect(chart).toBeVisible();
    await expect(page.locator('.financial-chart canvas').first()).toBeVisible();
    await page.getByRole('button', { name: /WDO Mini dólar/ }).click();
    await expect(chart).toHaveAccessibleName(/WDO 5m/);
    await page.getByRole('button', { name: '15m', exact: true }).click();
    await expect(chart).toHaveAccessibleName(/WDO 15m/);
    const chartCanvas = page.locator('.financial-chart canvas').first();
    for (const name of ['EMA 9', 'EMA 21', 'SMA 20', 'Volume']) {
        const before = await chartCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
        const checkbox = page.getByRole('checkbox', { name, exact: true });
        const checked = await checkbox.isChecked();
        await checkbox.setChecked(!checked);
        await expect(checkbox).toBeChecked({ checked: !checked });
        await expect.poll(() => chartCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(before);
    }
    await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
    await chart.hover();
    await page.mouse.wheel(0, -300);
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('searchbox', { name: 'Buscar ativo' }).fill('inexistente');
    await expect(page.getByText('Nenhum ativo encontrado.')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Buscar ativo' }).fill('petr');
    await page.getByRole('button', { name: /PETR4 Petrobras/ }).click();
    await expect(chart).toHaveAccessibleName(/PETR4/);
});

test('compra, marcação, redução, inversão, zeragem e dashboard compartilham contabilidade', async ({ page }) => {
    const ticket = page.getByRole('complementary', { name: 'Enviar ordem simulada' });
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('5');
    await ticket.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    const p0 = priceAt('WIN', scenarioTime(0));
    const p1 = priceAt('WIN', scenarioTime(1));
    await expect(page.getByRole('row', { name: /WIN Comprado 5/ })).toBeVisible();
    await page.getByRole('button', { name: 'Avançar um minuto sintético' }).click();
    const expected = (p1 - p0) * 5 * 0.2;
    await expect(page.getByTestId('terminal-capital')).toHaveText(money(100000 + expected));
    await ticket.getByRole('button', { name: 'Vender', exact: true }).click();
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('2');
    await ticket.getByRole('button', { name: 'Vender WIN · simulado' }).click();
    await expect(page.getByRole('row', { name: /WIN Comprado 3/ })).toBeVisible();
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('5');
    await ticket.getByRole('button', { name: 'Vender WIN · simulado' }).click();
    await expect(page.getByRole('row', { name: /WIN Vendido 2/ })).toBeVisible();
    await page.getByRole('button', { name: 'Zerar WIN' }).click();
    await expect(page.getByText('Sua próxima ideia começa aqui')).toBeVisible();
    await page.getByRole('tab', { name: /Ordens/ }).click();
    await expect(page.getByRole('cell', { name: 'Executada · simulação' })).toHaveCount(4);
    await page.getByRole('tab', { name: /Histórico/ }).click();
    await expect(page.getByRole('tabpanel').getByRole('table').getByRole('row')).toHaveCount(4);
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    const cards = page.locator('.metric-card');
    await expect(cards.nth(0)).toContainText(money(100000 + expected));
    await expect(cards.nth(1)).toContainText(money(expected));
    await expect(cards.nth(2)).toContainText('66,7%');
    await expect(cards.nth(3)).toContainText('04');
    await expect(page.getByRole('img', { name: /Curva de capital realizado/ })).toBeVisible();
    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    await expect(page.getByTestId('terminal-capital')).toHaveText(money(100000 + expected));
});

test('validação, reprodução, confirmação de reset e reload', async ({ page }) => {
    const ticket = page.getByRole('complementary', { name: 'Enviar ordem simulada' });
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('1.5');
    await ticket.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await expect(page.getByRole('alert')).toHaveText('Informe uma quantidade inteira entre 1 e 100.');
    await expect(page.getByText('Sua próxima ideia começa aqui')).toBeVisible();
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('100');
    await ticket.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await ticket.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await expect(page.getByRole('alert')).toContainText('posição máxima de 100');
    await page.getByRole('button', { name: 'Reproduzir cenário' }).click();
    await expect(page.getByRole('button', { name: 'Pausar cenário' })).toBeVisible();
    await expect.poll(async () => page.getByTestId('terminal-capital').textContent()).not.toBe(money(100000));
    await page.getByRole('button', { name: 'Pausar cenário' }).click();
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: /Reiniciar/ }).click();
    await expect(page.getByRole('row', { name: /WIN Comprado 100/ })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Reiniciar/ }).click();
    await expect(page.getByText('Sua próxima ideia começa aqui')).toBeVisible();
    await expect(page.getByTestId('terminal-capital')).toHaveText(money(100000));
    await ticket.getByRole('spinbutton', { name: /Quantidade/ }).fill('1');
    await ticket.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await page.reload();
    await expect(page.getByText('Sua próxima ideia começa aqui')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reproduzir cenário' })).toBeVisible();
});

test('sem erros JS, chamadas externas, endpoints de execução ou overflow', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const external: string[] = [];
    const mutations: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('request', (request) => {
        if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
        if (request.method() !== 'GET') mutations.push(request.url());
    });
    await page.reload();
    await page.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await page.getByRole('button', { name: 'Avançar um minuto sintético' }).click();
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.locator('.dashboard')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(external).toEqual([]);
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
});

test('todos os períodos preservam o preço de execução e mudança de ativo preserva carteira', async ({ page }) => {
    await page.getByRole('button', { name: 'Comprar WIN · simulado' }).click();
    await page.getByRole('button', { name: 'Avançar um minuto sintético' }).click();
    for (const period of ['1m', '5m', '15m', '1h', '1d']) {
        await page.getByRole('button', { name: period, exact: true }).click();
        await expect(page.getByRole('img', { name: /Gráfico de candles sintéticos/ })).toHaveAccessibleName(
            `Gráfico de candles sintéticos de WIN ${period}. Zoom com rolagem, arraste para navegar. Último fechamento ${number(priceAt('WIN', scenarioTime(1)))}.`);
    }
    await page.getByRole('button', { name: 'VALE3 Vale', exact: true }).click();
    await page.getByRole('button', { name: 'Comprar VALE3 · simulado' }).click();
    await expect(page.getByRole('row', { name: /WIN Comprado 1/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /VALE3 Comprado 1/ })).toBeVisible();
});

test('layout cabe em telas pequenas, tablets e desktops largos', async ({ page }) => {
    for (const width of [360, 650, 768, 1024, 1280, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.getByRole('img', { name: /Gráfico de candles sintéticos/ })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const toolbar = page.locator('.chart-toolbar');
        expect(await toolbar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
});
