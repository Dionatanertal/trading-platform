import { describe, expect, it } from 'vitest';
import { assets, candlesFor, ema, periods, priceAt, scenarioTime, sma, type Candle } from './market';

describe('proveniência e consistência do cenário sintético', () => {
    for (const asset of assets) {
        for (const period of Object.keys(periods) as (keyof typeof periods)[]) {
            it(`${asset.symbol} ${period}: 240 candles válidos, determinísticos e fechamento canônico`, () => {
                const candles = candlesFor(asset.symbol, period, 11);
                expect(candles).toHaveLength(240);
                expect(candles).toEqual(candlesFor(asset.symbol, period, 11));
                candles.forEach((candle, index) => {
                    expect(candle.low).toBeLessThanOrEqual(Math.min(candle.open, candle.close));
                    expect(candle.high).toBeGreaterThanOrEqual(Math.max(candle.open, candle.close));
                    expect(candle.volume).toBeGreaterThan(0);
                    expect(candle.low).toBeGreaterThan(0);
                    expect(candle.time).toBeLessThanOrEqual(scenarioTime(11));
                    if (index) expect(candle.time - candles[index - 1].time).toBe(periods[period]);
                });
                expect(candles.at(-1)?.close).toBe(priceAt(asset.symbol, scenarioTime(11)));
            });
        }
    }
    it('mantém candles fechados estáveis ao avançar o cenário e mudar de janela', () => {
        const before = candlesFor('WIN', '5m', 4);
        const after = candlesFor('WIN', '5m', 5);
        for (const candle of before.slice(1, -1)) expect(after.find((item) => item.time === candle.time)).toEqual(candle);
        expect(candlesFor('WIN', '1d', 0).at(-1)?.close).toBe(candlesFor('WIN', '1m', 0).at(-1)?.close);
    });
});

describe('indicadores financeiros', () => {
    const data: Candle[] = [1, 2, 3, 4, 8].map((close, time) => ({ time, close, open: close, high: close, low: close, volume: 1 }));
    it('SMA utiliza somente o período cheio e média móvel exata', () => {
        expect(sma(data, 3)).toEqual([{ time: 2, value: 2 }, { time: 3, value: 3 }, { time: 4, value: 5 }]);
        expect(sma(data, 10)).toEqual([]);
    });
    it('EMA inicia na SMA e aplica alfa 2/(n+1)', () => {
        expect(ema(data, 3)).toEqual([{ time: 2, value: 2 }, { time: 3, value: 3 }, { time: 4, value: 5.5 }]);
        expect(ema(data, 10)).toEqual([]);
        expect(ema(data, 1).map((item) => item.value)).toEqual([1, 2, 3, 4, 8]);
    });
    it('rejeita período inválido explicitamente e não altera candles', () => {
        const snapshot = structuredClone(data);
        expect(() => sma(data, 0)).toThrow();
        expect(() => ema(data, 1.5)).toThrow();
        sma(data, 3); ema(data, 3);
        expect(data).toEqual(snapshot);
    });
});
