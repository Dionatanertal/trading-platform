import { describe, expect, it } from 'vitest';
import { instrument, priceAt, scenarioTime, type Symbol } from './market';
import { INITIAL_CAPITAL, initialSimulation, metrics, openResult, simulationReducer, type Simulation } from './simulation';

const order = (state: Simulation, side: 'buy' | 'sell', quantity: number, symbol: Symbol = 'WIN') =>
    simulationReducer(state, { type: 'order', symbol, side, quantity });
const step = (state: Simulation) => simulationReducer(state, { type: 'step' });

describe('contabilidade da carteira demonstrativa', () => {
    it('inicia vazia, pausada e sem taxa de acerto inventada', () => {
        const state = initialSimulation();
        expect(state.paused).toBe(true);
        expect(state.positions).toEqual([]);
        expect(metrics(state)).toMatchObject({ capital: INITIAL_CAPITAL, total: 0, closures: 0, winRate: null });
    });
    it('pondera preço médio ao aumentar e preserva estado anterior', () => {
        const initial = initialSimulation();
        const first = order(initial, 'buy', 2);
        const snapshot = structuredClone(first);
        const second = order(step(first), 'buy', 3);
        const p0 = priceAt('WIN', scenarioTime(0));
        const p1 = priceAt('WIN', scenarioTime(1));
        expect(second.positions[0]).toEqual({ symbol: 'WIN', quantity: 5, average: (p0 * 2 + p1 * 3) / 5 });
        expect(first).toEqual(snapshot);
        expect(initial.positions).toEqual([]);
        expect(second.orders.at(-1)?.price).toBe(p1);
        expect(second.realized).toBe(0);
    });
    for (const side of ['buy', 'sell'] as const) {
        it(`${side}: redução, inversão e zeragem realizam diferença × quantidade × multiplicador`, () => {
            const opening = order(initialSimulation(), side, 5);
            const later = step(opening);
            const opposite = side === 'buy' ? 'sell' : 'buy';
            const p0 = opening.positions[0].average;
            const p1 = priceAt('WIN', scenarioTime(1));
            const expected = (p1 - p0) * (side === 'buy' ? 1 : -1) * 0.2;
            const reduced = order(later, opposite, 2);
            expect(reduced.positions[0]).toMatchObject({ quantity: side === 'buy' ? 3 : -3, average: p0 });
            expect(reduced.realized).toBeCloseTo(expected * 2);
            const reversed = order(reduced, opposite, 5);
            expect(reversed.positions[0]).toMatchObject({ quantity: side === 'buy' ? -2 : 2, average: p1 });
            expect(reversed.realized).toBeCloseTo(expected * 5);
            expect(reversed.orders.at(-1)?.closedQuantity).toBe(3);
            const closed = simulationReducer(reversed, { type: 'close', symbol: 'WIN' });
            expect(closed.positions).toEqual([]);
            expect(closed.realized).toBeCloseTo(expected * 5);
            expect(metrics(closed).capital).toBeCloseTo(INITIAL_CAPITAL + expected * 5);
        });
    }
    it('marca todos os ativos no mesmo cenário sem interferência entre eles', () => {
        let state = order(initialSimulation(), 'buy', 2, 'WIN');
        state = order(state, 'sell', 3, 'WDO');
        state = step(state);
        const expected = state.positions.reduce((sum, position) => sum + (
            priceAt(position.symbol, scenarioTime(1)) - position.average
        ) * position.quantity * instrument(position.symbol).multiplier, 0);
        expect(metrics(state).unrealized).toBeCloseTo(expected);
        expect(openResult(state.positions[0], 0)).toBe(0);
        const closed = simulationReducer(state, { type: 'close', symbol: 'WIN' });
        expect(closed.positions.map((position) => position.symbol)).toEqual(['WDO']);
    });
    it('calcula taxa de acerto, fator e drawdown a partir das reduções', () => {
        const state = {
            ...initialSimulation(), realized: 50,
            orders: [
                { id: 1, symbol: 'WIN' as const, side: 'sell' as const, quantity: 1, price: 100, time: 0, realized: 100, closedQuantity: 1 },
                { id: 2, symbol: 'WIN' as const, side: 'buy' as const, quantity: 1, price: 100, time: 1, realized: -50, closedQuantity: 1 },
            ],
        };
        expect(metrics(state)).toMatchObject({ wins: 1, closures: 2, winRate: 50, grossProfit: 100, grossLoss: 50, drawdown: 50, equity: [100000, 100100, 100050] });
    });
});

describe('limites e isolamento', () => {
    for (const quantity of [0, -1, 1.5, 101, NaN, Infinity]) {
        it(`rejeita quantidade ${quantity} sem criar efeitos`, () => {
            const state = initialSimulation();
            const rejected = order(state, 'buy', quantity);
            expect(rejected.positions).toEqual([]);
            expect(rejected.orders).toEqual([]);
            expect(rejected.notice?.kind).toBe('error');
        });
    }
    it('rejeita exposição acima de 100 inclusive vendida, permite reduzir', () => {
        for (const side of ['buy', 'sell'] as const) {
            const full = order(initialSimulation(), side, 100);
            const rejected = order(full, side, 1);
            expect(rejected.orders).toHaveLength(1);
            expect(rejected.positions).toEqual(full.positions);
            expect(rejected.notice?.kind).toBe('error');
            expect(order(full, side === 'buy' ? 'sell' : 'buy', 1).orders).toHaveLength(2);
        }
    });
    it('limita 1000 ordens, não perde carteira e informa erro', () => {
        let state = initialSimulation();
        for (let index = 0; index < 1000; index++) state = order(state, index % 2 ? 'sell' : 'buy', 1);
        expect(state.orders).toHaveLength(1000);
        const rejected = order(state, 'buy', 1);
        expect(rejected.orders).toBe(state.orders);
        expect(rejected.notice?.kind).toBe('error');
    });
    it('zeragem inexistente é erro, reset limpa toda a sessão e pausa', () => {
        expect(simulationReducer(initialSimulation(), { type: 'close', symbol: 'WIN' }).notice?.kind).toBe('error');
        const active = simulationReducer(step(order(initialSimulation(), 'buy', 2)), { type: 'togglePlayback' });
        const reset = simulationReducer(active, { type: 'reset' });
        expect(reset).toMatchObject({ positions: [], orders: [], realized: 0, step: 0, paused: true });
    });
});
