import nativeResult from '../../p03/artifacts/first-run/dashboard.json' with { type: 'json' };

export interface LeanResult {
    schemaVersion: number;
    runId: string;
    status: string;
    strategy: string;
    engine: { name: string; version: string; sourceCommit: string };
    execution: {
        startedAtUtc: string; finishedAtUtc: string; exitCode: number;
        dataPoints: number; succeededDataRequests: number; failedDataRequests: number;
    };
    dataset: {
        symbol: string; market: string; resolution: string; start: string; end: string;
        currency: string; source: string; notice: string; inputs: Record<string, string>;
    };
    statistics: Record<string, string>;
    equity: { time: number; value: number }[];
    fills: {
        orderId: number; symbol: string; status: string; time: number;
        quantity: number; price: number; fee: number; currency: string;
    }[];
    artifactHashes: Record<string, string>;
}

export const leanResult: LeanResult = nativeResult;
export const usd = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value);
export const utc = (value: number) => new Date(value * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');

export function resultError(result: LeanResult): string | null {
    if (result.schemaVersion !== 1 || result.status !== 'Completed' || result.execution.exitCode !== 0
        || result.execution.dataPoints <= 0 || result.execution.failedDataRequests !== 0) {
        return 'Resultado LEAN incompleto ou sem término comprovado.';
    }
    if (result.dataset.currency !== 'USD' || result.equity.length < 2
        || result.equity.some((point, index) => !Number.isFinite(point.time) || !Number.isFinite(point.value)
            || (index > 0 && point.time <= result.equity[index - 1].time))
        || !Number.isFinite(Number(result.statistics['Start Equity']))
        || Math.abs(result.equity[0].value - Number(result.statistics['Start Equity'])) >= 0.01
        || !Number.isFinite(Number(result.statistics['End Equity']))
        || Math.abs(result.equity.at(-1)!.value - Number(result.statistics['End Equity'])) >= 0.01
        || result.fills.length === 0 || result.fills.some((fill) => fill.status !== 'filled')) {
        return 'Curva, moeda ou preenchimentos LEAN inválidos.';
    }
    if (!result.artifactHashes['p03-spy.json'] || !result.dataset.inputs['Data/equity/usa/hour/spy.zip']
        || !Object.values(result.artifactHashes).every((hash) => /^[a-f0-9]{64}$/.test(hash))) {
        return 'Proveniência dos artefatos LEAN ausente ou inválida.';
    }
    return null;
}
