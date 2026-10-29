export const assets = [
    { symbol: 'WIN', name: 'Mini índice', category: 'Índice · demo', base: 128400, scale: 480, tick: 5, multiplier: 0.2, color: '#818cf8' },
    { symbol: 'WDO', name: 'Mini dólar', category: 'Câmbio · demo', base: 5420, scale: 23, tick: 0.5, multiplier: 10, color: '#f0b86a' },
    { symbol: 'PETR4', name: 'Petrobras', category: 'Ação · demo', base: 37.5, scale: 0.65, tick: 0.01, multiplier: 1, color: '#31c8a4' },
    { symbol: 'VALE3', name: 'Vale', category: 'Ação · demo', base: 62.3, scale: 0.9, tick: 0.01, multiplier: 1, color: '#60a5fa' },
] as const;

export type Symbol = typeof assets[number]['symbol'];
export const periods = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '1d': 86400 } as const;
export type Period = keyof typeof periods;
export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export const SCENARIO_START = Date.UTC(2026, 0, 16, 17, 0) / 1000;
export const instrument = (symbol: Symbol) => assets.find((asset) => asset.symbol === symbol)!;

export function priceAt(symbol: Symbol, time: number): number {
    const asset = instrument(symbol);
    const phase = assets.findIndex((item) => item.symbol === symbol) * 1.7;
    const minute = (time - SCENARIO_START) / 60;
    const wave = Math.sin(minute / 37 + phase) * 0.7
        + Math.sin(minute / 9 + phase) * 0.23
        + Math.cos(minute / 3.8 + phase) * 0.08
        + Math.sin(minute / 700) * 1.2;
    return Number((Math.round((asset.base + wave * asset.scale) / asset.tick) * asset.tick).toFixed(2));
}

export function scenarioTime(step: number): number {
    return SCENARIO_START + step * 60;
}

export function candlesFor(symbol: Symbol, period: Period, step: number): Candle[] {
    const end = scenarioTime(step);
    const interval = periods[period];
    const lastBucket = Math.floor(end / interval) * interval;
    const asset = instrument(symbol);
    return Array.from({ length: 240 }, (_, index) => {
        const time = lastBucket - (239 - index) * interval;
        const closeTime = Math.min(time + interval - 1, end);
        const open = priceAt(symbol, time);
        const close = priceAt(symbol, closeTime);
        const samples = Array.from({ length: 17 }, (_, sample) =>
            priceAt(symbol, time + (closeTime - time) * sample / 16));
        const wick = asset.tick * (1 + Math.abs(Math.floor(time / interval)) % 4);
        return {
            time, open, close,
            high: Number((Math.max(...samples, open, close) + wick).toFixed(2)),
            low: Number((Math.min(...samples, open, close) - wick).toFixed(2)),
            volume: Math.round(500 + Math.abs(Math.sin(time / 137)) * 7500),
        };
    });
}

export interface IndicatorPoint { time: number; value: number }

export function sma(candles: Candle[], length: number): IndicatorPoint[] {
    if (!Number.isInteger(length) || length < 1) throw new Error('Período de SMA inválido.');
    let sum = 0;
    return candles.flatMap((candle, index) => {
        sum += candle.close;
        if (index >= length) sum -= candles[index - length].close;
        return index >= length - 1 ? [{ time: candle.time, value: sum / length }] : [];
    });
}

export function ema(candles: Candle[], length: number): IndicatorPoint[] {
    if (!Number.isInteger(length) || length < 1) throw new Error('Período de EMA inválido.');
    if (candles.length < length) return [];
    let value = candles.slice(0, length).reduce((sum, candle) => sum + candle.close, 0) / length;
    const result = [{ time: candles[length - 1].time, value }];
    for (let index = length; index < candles.length; index++) {
        value += (candles[index].close - value) * 2 / (length + 1);
        result.push({ time: candles[index].time, value });
    }
    return result;
}

export const number = (value: number, decimals = 2) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dateTime = (time: number) => new Date(time * 1000).toLocaleString('pt-BR', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});
