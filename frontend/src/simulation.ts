import { assets, instrument, priceAt, scenarioTime, type Symbol } from './market';

export const INITIAL_CAPITAL = 100_000;
export interface Position { symbol: Symbol; quantity: number; average: number }
export interface Order {
    id: number;
    symbol: Symbol;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    time: number;
    realized: number;
    closedQuantity: number;
}
export interface Simulation {
    positions: Position[];
    orders: Order[];
    realized: number;
    step: number;
    paused: boolean;
    notice: { kind: 'success' | 'error'; text: string } | null;
}
export type Action =
    | { type: 'order'; symbol: Symbol; side: 'buy' | 'sell'; quantity: number }
    | { type: 'close'; symbol: Symbol }
    | { type: 'step' }
    | { type: 'togglePlayback' }
    | { type: 'reset' };

export const initialSimulation = (): Simulation => ({
    positions: [], orders: [], realized: 0, step: 0, paused: true, notice: null,
});

function execute(state: Simulation, symbol: Symbol, side: 'buy' | 'sell', quantity: number): Simulation {
    const reject = (text: string): Simulation => ({ ...state, notice: { kind: 'error', text } });
    if (!assets.some((asset) => asset.symbol === symbol) || !['buy', 'sell'].includes(side)) {
        return reject('Ativo ou lado inválido para a simulação.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return reject('Informe uma quantidade inteira entre 1 e 100.');
    }
    if (state.orders.length >= 1000) return reject('Limite de 1.000 ordens da sessão atingido. Reinicie a simulação.');
    const current = state.positions.find((position) => position.symbol === symbol);
    const previous = current?.quantity ?? 0;
    const delta = quantity * (side === 'buy' ? 1 : -1);
    const next = previous + delta;
    if (Math.abs(next) > 100) return reject('Limite demonstrativo: posição máxima de 100 unidades por ativo.');
    const price = priceAt(symbol, scenarioTime(state.step));
    const reducing = previous !== 0 && Math.sign(previous) !== Math.sign(delta);
    const closedQuantity = reducing ? Math.min(Math.abs(previous), quantity) : 0;
    const realized = closedQuantity * (price - (current?.average ?? price))
        * Math.sign(previous) * instrument(symbol).multiplier;
    let average = price;
    if (current && !reducing) {
        average = (Math.abs(previous) * current.average + quantity * price) / Math.abs(next);
    } else if (current && reducing && Math.sign(next) === Math.sign(previous)) {
        average = current.average;
    }
    const positions = state.positions.filter((position) => position.symbol !== symbol);
    if (next !== 0) positions.push({ symbol, quantity: next, average });
    const id = state.orders.length + 1;
    return {
        ...state, positions,
        realized: state.realized + realized,
        orders: [...state.orders, {
            id, symbol, side, quantity, price, realized, closedQuantity, time: scenarioTime(state.step),
        }],
        notice: { kind: 'success', text: `Ordem simulada #${id}: ${side === 'buy' ? 'compra' : 'venda'} de ${quantity} ${symbol} executada no cenário.` },
    };
}

export function simulationReducer(state: Simulation, action: Action): Simulation {
    switch (action.type) {
        case 'order': return execute(state, action.symbol, action.side, action.quantity);
        case 'close': {
            const position = state.positions.find((item) => item.symbol === action.symbol);
            return position
                ? execute(state, position.symbol, position.quantity > 0 ? 'sell' : 'buy', Math.abs(position.quantity))
                : { ...state, notice: { kind: 'error', text: 'Não há posição neste ativo para zerar.' } };
        }
        case 'step': return { ...state, step: state.step + 1 };
        case 'togglePlayback': return { ...state, paused: !state.paused };
        case 'reset': return { ...initialSimulation(), notice: { kind: 'success', text: 'Simulação reiniciada. Carteira e histórico foram limpos.' } };
    }
}

export function openResult(position: Position, step: number): number {
    return (priceAt(position.symbol, scenarioTime(step)) - position.average)
        * position.quantity * instrument(position.symbol).multiplier;
}

export function metrics(state: Simulation) {
    const unrealized = state.positions.reduce((sum, position) => sum + openResult(position, state.step), 0);
    const closures = state.orders.filter((order) => order.closedQuantity > 0);
    const wins = closures.filter((order) => order.realized > 0).length;
    const grossProfit = closures.reduce((sum, order) => sum + Math.max(0, order.realized), 0);
    const grossLoss = -closures.reduce((sum, order) => sum + Math.min(0, order.realized), 0);
    let peak = INITIAL_CAPITAL;
    let capital = INITIAL_CAPITAL;
    let drawdown = 0;
    const equity = [capital, ...closures.map((order) => {
        capital += order.realized;
        peak = Math.max(peak, capital);
        drawdown = Math.max(drawdown, peak - capital);
        return capital;
    })];
    return {
        unrealized, equity, drawdown, grossProfit, grossLoss,
        total: state.realized + unrealized,
        capital: INITIAL_CAPITAL + state.realized + unrealized,
        closures: closures.length, wins, winRate: closures.length ? wins / closures.length * 100 : null,
    };
}
