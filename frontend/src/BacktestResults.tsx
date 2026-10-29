import { leanResult, resultError, usd, utc } from './leanResult';

export default function BacktestResults() {
    const result = leanResult;
    const error = resultError(result);
    if (error) return <section className="backtest panel" role="alert"><h1>Resultado indisponível</h1><p>{error} Nenhum resultado simulado será usado como substituto.</p></section>;
    const first = result.equity[0].value;
    const last = result.equity.at(-1)!.value;
    const min = Math.min(...result.equity.map((point) => point.value));
    const max = Math.max(...result.equity.map((point) => point.value));
    const range = Math.max(max - min, 1);
    const from = result.equity[0].time;
    const duration = result.equity.at(-1)!.time - from;
    const points = result.equity.map((point) =>
        `${30 + (point.time - from) / duration * 840},${220 - (point.value - min) / range * 160}`).join(' ');
    return <div className="backtest">
        <div className="page-heading"><div><span className="eyebrow">P03 · RESULTADO NATIVO DO MOTOR</span>
            <h1>Backtest LEAN</h1><p>Execução histórica pré-executada · somente leitura · não executa pelo navegador.</p></div></div>
        <section className="panel backtest-provenance" aria-label="Proveniência do backtest">
            <strong>{result.engine.name} {result.engine.version} · {result.status}</strong>
            <p>{result.strategy} · {result.dataset.symbol} / {result.dataset.market} · {result.dataset.resolution} · moeda USD</p>
            <p>07 a 11/10/2013 · compra e manutenção de SPY · capital inicial {usd(first)}.</p>
            <p>Fonte: {result.dataset.source}. Amostras históricas de teste, sem auditoria independente de qualidade/completude.</p>
            <p>Executado em {utc(Date.parse(result.execution.startedAtUtc) / 1000)}.
                {' '}{result.execution.dataPoints.toLocaleString('pt-BR')} pontos processados,
                {' '}{result.execution.succeededDataRequests} solicitações de dados atendidas,
                {' '}{result.execution.failedDataRequests} falhas.</p>
            <p>Não é cotação atual, B3, paper conectado ou ordem real. Estes resultados não pertencem à carteira sintética P02.</p>
        </section>
        <div className="dashboard-metrics">
            {[
                ['Patrimônio inicial · USD', usd(first)],
                ['Patrimônio final · USD', usd(last)],
                ['Retorno LEAN', result.statistics['Net Profit']],
                ['Drawdown LEAN', result.statistics.Drawdown],
            ].map(([label, value]) => <article className="metric-card" key={label}><div className="metric-label">{label}</div><strong>{value}</strong><small>Backtest histórico · sem promessa de retorno</small></article>)}
        </div>
        <section className="panel equity" aria-label="Patrimônio histórico LEAN">
            <div className="section-title"><h2>Curva de patrimônio · USD</h2><span className="micro-badge">{result.equity.length} AMOSTRAS LEAN</span></div>
            <svg className="equity-chart" viewBox="0 0 900 280" role="img"
                aria-label={`Curva de patrimônio LEAN em USD: ${usd(first)} até ${usd(last)}. Fechamentos das amostras nativas.`}>
                {[60, 140, 220].map((y) => <line key={y} x1="30" x2="870" y1={y} y2={y} stroke="currentColor" opacity=".1" />)}
                <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="2.5" />
                <text x="30" y="270">07/10/2013</text><text x="870" y="270" textAnchor="end">11/10/2013</text>
            </svg>
            <p className="chart-empty-note">Fechamento de cada candle de patrimônio produzido pelo LEAN; não são candles de preço SPY.</p>
        </section>
        <section className="panel" aria-label="Preenchimentos LEAN">
            <div className="section-title"><h2>Preenchimentos de backtest</h2><span className="micro-badge">SEM ORDENS REAIS</span></div>
            <div className="table-scroll"><table><thead><tr><th>Ordem</th><th>Ativo</th><th>Horário UTC</th><th>Compra</th><th>Preço USD</th><th>Taxa USD</th><th>Status LEAN</th></tr></thead>
                <tbody>{result.fills.map((fill) => <tr key={fill.orderId}><td>{fill.orderId}</td><td>{fill.symbol}</td><td>{utc(fill.time)}</td>
                    <td>{fill.quantity}</td><td>{usd(fill.price)}</td><td>{usd(fill.fee)}</td><td>{fill.status} · backtest</td></tr>)}</tbody></table></div>
            <p className="backtest-note">A posição permanece aberta ao final. Retorno inclui marcação a mercado; uma compra não é um trade encerrado nem comprovação de rentabilidade futura. Preço ajustado conforme modelo upstream.</p>
        </section>
        <details className="methodology"><summary>Estatísticas nativas, dados e rastreabilidade</summary>
            <p>Base do motor: <code>{result.engine.sourceCommit}</code>. IDs locais não identificam conta de corretora.</p>
            <div className="table-scroll"><table><thead><tr><th>Métrica LEAN</th><th>Valor nativo</th></tr></thead>
                <tbody>{Object.entries(result.statistics).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table></div>
            <p>Intervalo de apenas cinco pregões. Estatísticas anualizadas e taxas sobre operações encerradas não devem ser interpretadas como evidência de desempenho de estratégia.</p>
            <p>Arquivos originais e hashes em <code>p03/artifacts/first-run/</code>; contrato em <code>p03/README.md</code>. Nenhum dado bruto de mercado foi republicado por esta tela.</p>
            <dl className="backtest-hashes">{Object.entries(result.artifactHashes).map(([name, hash]) => <div key={name}><dt>{name}</dt><dd><code>{hash}</code></dd></div>)}</dl>
        </details>
    </div>;
}
