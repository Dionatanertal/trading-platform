import { describe, expect, it } from 'vitest';
import { leanResult, resultError } from './leanResult';

describe('resultado LEAN offline', () => {
    it('mantém a saída nativa e a proveniência sem sintetizar dados', () => {
        expect(resultError(leanResult)).toBeNull();
        expect(leanResult.execution.dataPoints).toBe(3943);
        expect(leanResult.equity).toHaveLength(396);
        expect(leanResult.equity.at(-1)?.value).toBe(101691.9198);
        expect(leanResult.fills[0]).toMatchObject({ symbol: 'SPY', quantity: 688, fee: 3.44 });
    });

    it('rejeita execução incompleta sem fallback para a demo', () => {
        expect(resultError({ ...leanResult, status: 'Running' })).not.toBeNull();
        expect(resultError({ ...leanResult, schemaVersion: 2 })).not.toBeNull();
        expect(resultError({ ...leanResult, equity: [] })).not.toBeNull();
        expect(resultError({ ...leanResult, fills: [] })).not.toBeNull();
        expect(resultError({ ...leanResult, artifactHashes: {} })).not.toBeNull();
    });

    it('rejeita valores inválidos ou divergentes das estatísticas', () => {
        const wrong = structuredClone(leanResult);
        wrong.equity[0].value = NaN;
        expect(resultError(wrong)).not.toBeNull();
        wrong.equity[0].value = 100000;
        wrong.statistics['End Equity'] = '100000';
        expect(resultError(wrong)).not.toBeNull();
    });
});
