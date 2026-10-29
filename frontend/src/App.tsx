import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';
import {
    Activity, ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3,
    ChartCandlestick, Check, ChevronRight, CircleHelp, Crosshair, FlaskConical,
    Layers3, LayoutDashboard, Moon, Pause, Play, RotateCcw, Search, ShieldCheck,
    SkipForward, Sun, TrendingUp, Wallet, X,
} from 'lucide-react';
import PriceChart, { type Indicators } from './PriceChart';
import { assets, candlesFor, dateTime, instrument, money, number, periods, priceAt, scenarioTime, type Period, type Symbol } from './market';
import { INITIAL_CAPITAL, initialSimulation, metrics, openResult, simulationReducer, type Simulation, type Action } from './simulation';

type Dispatch = React.Dispatch<Action>;
type Tab = 'positions' | 'orders' | 'history';
const signClass = (value: number) => value < 0 ? 'negative' : value > 0 ? 'positive' : '';

function Logo({ small = false }: { small?: boolean }) {
    return <div className={`brand ${small ? 'small' : ''}`}><span className="brand-mark"><Activity size={23} strokeWidth={2.5} /></span>
        {!small && <span>vertex<span className="brand-dot">.</span><small>TRADING PLATFORM</small></span>}</div>;
}

function Metric({ label, value, note, positive, icon }: {
    label: string; value: string; note: string; positive?: boolean; icon: React.ReactNode;
}) {
    return <article className="metric-card"><div className="metric-label">{label}<span>{icon}</span></div>
        <strong className={positive === undefined ? '' : positive ? 'positive' : 'negative'}>{value}</strong><small>{note}</small></article>;
}

function Portfolio({ state, dispatch, tab, setTab }: {
    state: Simulation; dispatch: Dispatch; tab: Tab; setTab: (tab: Tab) => void;
}) {
    const summary = metrics(state);
    const shownOrders = tab === 'history' ? state.orders.filter((order) => order.closedQuantity > 0) : state.orders;
    return <section className="portfolio panel" aria-label="Carteira simulada">
        <div className="portfolio-heading">
            <div className="tabs" role="tablist" aria-label="Dados da carteira">
                {([
                    ['positions', 'Posições', state.positions.length],
                    ['orders', 'Ordens', state.orders.length],
                    ['history', 'Histórico', state.orders.filter((order) => order.closedQuantity > 0).length],
                ] as const).map(([key, label, count]) => <button key={key} role="tab" id={`tab-${key}`}
                    aria-selected={tab === key} aria-controls="portfolio-content" onClick={() => setTab(key)}>
                    {label} <span className="count">{count}</span></button>)}
            </div>
            <span className="portfolio-result">Resultado aberto <b className={signClass(summary.unrealized)}>{money(summary.unrealized)}</b></span>
        </div>
        <div className="table-scroll" id="portfolio-content" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
            {tab === 'positions' ? state.positions.length === 0
                ? <Empty icon={<Layers3 size={27} />} title="Sua próxima ideia começa aqui" text="Envie uma ordem simulada para acompanhar posições e resultados." />
                : <table><thead><tr><th>Ativo</th><th>Lado</th><th>Qtd.</th><th>Preço médio</th><th>Preço sintético</th><th>Resultado aberto</th><th>Ação</th></tr></thead>
                    <tbody>{state.positions.map((position) => <tr key={position.symbol}>
                        <td><b>{position.symbol}</b></td><td><span className={`side-tag ${position.quantity > 0 ? 'positive' : 'negative'}`}>{position.quantity > 0 ? 'Comprado' : 'Vendido'}</span></td>
                        <td>{Math.abs(position.quantity)}</td><td>{number(position.average)}</td>
                        <td>{number(priceAt(position.symbol, scenarioTime(state.step)))}</td>
                        <td className={signClass(openResult(position, state.step))}>{money(openResult(position, state.step))}</td>
                        <td><button className="close-position" onClick={() => dispatch({ type: 'close', symbol: position.symbol })}>Zerar {position.symbol} <X size={12} /></button></td>
                    </tr>)}</tbody></table>
                : shownOrders.length === 0
                    ? <Empty icon={<ArrowDownLeft size={27} />} title={tab === 'history' ? 'Nenhum resultado realizado' : 'Nenhuma ordem simulada'} text={tab === 'history' ? 'Reduza ou zere uma posição para realizar seu resultado.' : 'As execuções da sessão aparecerão aqui. Nenhuma ordem será enviada ao mercado.'} />
                    : <table><thead><tr><th>Ordem / cenário UTC</th><th>Ativo</th><th>Lado</th><th>Qtd.</th><th>Preço</th><th>{tab === 'history' ? 'Resultado realizado' : 'Status'}</th></tr></thead>
                        <tbody>{[...shownOrders].reverse().map((order) => <tr key={order.id}>
                            <td><b>#{String(order.id).padStart(4, '0')}</b><small className="cell-sub">{dateTime(order.time)}</small></td>
                            <td><b>{order.symbol}</b></td><td className={order.side === 'buy' ? 'positive' : 'negative'}>{order.side === 'buy' ? 'Compra' : 'Venda'}</td>
                            <td>{order.quantity}</td><td>{number(order.price)}</td>
                            <td>{tab === 'history' ? <span className={signClass(order.realized)}>{money(order.realized)}</span> : <span className="filled"><Check size={12} /> Executada · simulação</span>}</td>
                        </tr>)}</tbody></table>}
        </div>
        <div className="portfolio-footer"><ShieldCheck size={12} /> Somente nesta aba · recarregar limpa a sessão <span>Sem custos ou slippage</span></div>
    </section>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return <div className="empty"><span className="empty-icon">{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}

function Ticket({ state, symbol, dispatch }: { state: Simulation; symbol: Symbol; dispatch: Dispatch }) {
    const [quantity, setQuantity] = useState('1');
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const asset = instrument(symbol);
    const price = priceAt(symbol, scenarioTime(state.step));
    const position = state.positions.find((item) => item.symbol === symbol);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        dispatch({ type: 'order', symbol, side, quantity: quantity.trim() === '' ? NaN : Number(quantity) });
    };
    return <aside className="ticket panel" aria-label="Enviar ordem simulada">
        <div className="section-title"><h2>Boleta de simulação</h2><FlaskConical size={16} /></div>
        <div className="ticket-symbol"><span className="asset-icon" style={{ '--asset-color': asset.color } as React.CSSProperties}>{symbol.slice(0, 1)}</span>
            <div><strong>{symbol}</strong><small>{asset.name}</small></div><span className="micro-badge">DEMO</span></div>
        <form onSubmit={submit} noValidate>
            <div className="side-select" role="group" aria-label="Lado da ordem">
                <button type="button" className={side === 'buy' ? 'selected-buy' : ''} aria-pressed={side === 'buy'} onClick={() => setSide('buy')}>Comprar</button>
                <button type="button" className={side === 'sell' ? 'selected-sell' : ''} aria-pressed={side === 'sell'} onClick={() => setSide('sell')}>Vender</button>
            </div>
            <div className="field"><label htmlFor="order-type">Tipo de ordem</label><div id="order-type" className="readonly-field"><span>A mercado sintético</span><span className="field-note">Imediata</span></div></div>
            <div className="field"><label htmlFor="quantity">Quantidade <small>1 a 100 unidades demo</small></label>
                <div className="quantity-input"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity(String(Math.max(1, (Number(quantity) || 1) - 1)))}>−</button>
                    <input id="quantity" inputMode="numeric" type="number" min="1" max="100" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                    <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity(String(Math.min(100, (Number(quantity) || 0) + 1)))}>+</button></div>
                <div className="quick-quantities">{[1, 5, 10, 25].map((value) => <button key={value} type="button" className={quantity === String(value) ? 'active' : ''} onClick={() => setQuantity(String(value))}>{value}</button>)}</div>
            </div>
            <div className="order-summary"><span>Preço de execução sintético <b>{number(price)}</b></span>
                <span>Multiplicador didático <b>{number(asset.multiplier)} / ponto</b></span>
                <span>Posição atual <b>{position ? `${Math.abs(position.quantity)} ${position.quantity > 0 ? 'comprada(s)' : 'vendida(s)'}` : 'Sem posição'}</b></span></div>
            <button type="submit" className={`submit-order ${side}`}>{side === 'buy' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}{side === 'buy' ? 'Comprar' : 'Vender'} {symbol} · simulado</button>
            <p className="ticket-disclaimer"><ShieldCheck size={13} /> Nenhuma ordem real. Execução fictícia no último preço sintético do cenário.</p>
        </form>
        <div role={state.notice?.kind === 'error' ? 'alert' : 'status'} className={`order-notice ${state.notice?.kind ?? ''}`} aria-live="polite">
            {state.notice?.text ?? 'Ambiente pronto para explorar. Seu capital é fictício.'}
        </div>
        <div className="session-card"><div><span className="status-dot" /> Sessão demonstrativa</div><dl>
            <div><dt>Motor LEAN</dt><dd>Não conectado</dd></div><div><dt>Fonte dos dados</dt><dd>Sintética local</dd></div>
            <div><dt>Capital inicial</dt><dd>{money(INITIAL_CAPITAL)}</dd></div>
        </dl></div>
    </aside>;
}

function Dashboard({ state }: { state: Simulation }) {
    const result = metrics(state);
    const min = Math.min(...result.equity);
    const max = Math.max(...result.equity);
    const range = Math.max(max - min, 1);
    const points = result.equity.map((value, index) =>
        `${30 + index / Math.max(result.equity.length - 1, 1) * 840},${220 - (value - min) / range * 160}`).join(' ');
    return <div className="dashboard">
        <div className="page-heading"><div><span className="eyebrow">VISÃO GERAL DA SESSÃO</span><h1>Cada operação, uma perspectiva.</h1><p>Explore seus resultados. Aqui, o único risco é deixar de aprender.</p></div><span className="simulation-pill"><FlaskConical size={14} /> SIMULAÇÃO</span></div>
        <div className="dashboard-metrics">
            <Metric label="Patrimônio simulado" value={money(result.capital)} note="Capital + resultado realizado e aberto" icon={<Wallet size={17} />} />
            <Metric label="Resultado total" value={money(result.total)} note={`${number(result.total / INITIAL_CAPITAL * 100)}% sobre o capital fictício`} positive={result.total >= 0} icon={<TrendingUp size={17} />} />
            <Metric label="Taxa de acerto" value={result.winRate === null ? '—' : `${number(result.winRate, 1)}%`} note={`${result.wins} de ${result.closures} execuções de redução com lucro`} icon={<Crosshair size={17} />} />
            <Metric label="Ordens executadas" value={String(state.orders.length).padStart(2, '0')} note={`${state.positions.length} posições abertas nesta sessão`} icon={<Layers3 size={17} />} />
        </div>
        <div className="dashboard-grid">
            <section className="equity panel"><div className="section-title"><div><h2>Evolução do capital realizado</h2><p>Somente resultados de posições reduzidas ou encerradas</p></div><span className="micro-badge">ESTA SESSÃO</span></div>
                <div className="equity-value"><strong className={signClass(state.realized)}>{money(INITIAL_CAPITAL + state.realized)}</strong><span>Capital realizado fictício</span></div>
                <svg className="equity-chart" viewBox="0 0 900 280" role="img" aria-label={`Curva de capital realizado. Inicial ${money(INITIAL_CAPITAL)}, atual ${money(INITIAL_CAPITAL + state.realized)}.`}>
                    <defs><linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2ac7a0" stopOpacity=".22" /><stop offset="100%" stopColor="#2ac7a0" stopOpacity="0" /></linearGradient></defs>
                    {[60, 140, 220].map((y) => <line key={y} x1="30" x2="870" y1={y} y2={y} stroke="currentColor" opacity=".1" strokeDasharray="4 6" />)}
                    <polygon points={`30,250 ${points} ${result.equity.length > 1 ? '870' : '30'},250`} fill="url(#equity-gradient)" />
                    <polyline points={result.equity.length === 1 ? '30,220 870,220' : points} fill="none" stroke="#2ac7a0" strokeWidth="2.5" strokeLinejoin="round" />
                    <text x="30" y="273">Início · {money(INITIAL_CAPITAL)}</text><text x="870" y="273" textAnchor="end">{result.closures} reduções</text>
                </svg>
                {!result.closures && <p className="chart-empty-note">Ainda sem resultados realizados. A curva evolui ao reduzir posições.</p>}
            </section>
            <section className="statistics panel"><div className="section-title"><h2>Raio-X operacional</h2><BarChart3 size={17} /></div>
                <dl><div><dt>Lucro bruto realizado</dt><dd className="positive">{money(result.grossProfit)}</dd></div>
                    <div><dt>Perda bruta realizada</dt><dd className="negative">{money(-result.grossLoss)}</dd></div>
                    <div><dt>Resultado realizado líquido*</dt><dd className={signClass(state.realized)}>{money(state.realized)}</dd></div>
                    <div><dt>Resultado em aberto</dt><dd className={signClass(result.unrealized)}>{money(result.unrealized)}</dd></div>
                    <div><dt>Drawdown realizado máximo</dt><dd>{money(result.drawdown)}</dd></div>
                    <div><dt>Fator de lucro</dt><dd>{result.grossLoss > 0 ? number(result.grossProfit / result.grossLoss) : '—'}</dd></div>
                </dl><p>*Sem taxas ou slippage. Métricas didáticas desta aba, não resultados LEAN nem promessa de retorno.</p>
            </section>
        </div>
        <section className="exposure panel"><div className="section-title"><h2>Exposição por ativo</h2><span className="muted">Unidades e multiplicadores didáticos</span></div>
            <div className="exposure-grid">{assets.map((asset) => {
                const position = state.positions.find((item) => item.symbol === asset.symbol);
                return <article key={asset.symbol}><div><span className="asset-icon" style={{ '--asset-color': asset.color } as React.CSSProperties}>{asset.symbol[0]}</span><b>{asset.symbol}</b><span className="muted">{position ? `${position.quantity > 0 ? '+' : ''}${position.quantity} un.` : 'Sem posição'}</span></div>
                    <strong className={position ? signClass(openResult(position, state.step)) : ''}>{money(position ? openResult(position, state.step) : 0)}</strong><small>Resultado aberto simulado</small></article>;
            })}</div>
        </section>
    </div>;
}

export default function App() {
    const [state, dispatch] = useReducer(simulationReducer, undefined, initialSimulation);
    const [page, setPage] = useState<'terminal' | 'dashboard'>('terminal');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [symbol, setSymbol] = useState<Symbol>('WIN');
    const [period, setPeriod] = useState<Period>('5m');
    const [search, setSearch] = useState('');
    const [indicators, setIndicators] = useState<Indicators>({ ema9: true, ema21: true, sma: false, volume: true });
    const [tab, setTab] = useState<Tab>('positions');
    const [fit, setFit] = useState(0);
    const candles = useMemo(() => candlesFor(symbol, period, state.step), [symbol, period, state.step]);
    const summary = metrics(state);
    const asset = instrument(symbol);
    const current = priceAt(symbol, scenarioTime(state.step));
    const previous = priceAt(symbol, scenarioTime(state.step) - 86400);
    const change = (current - previous) / previous * 100;
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    useEffect(() => {
        if (state.paused) return;
        const timer = window.setInterval(() => dispatch({ type: 'step' }), 3000);
        return () => window.clearInterval(timer);
    }, [state.paused]);
    const reset = () => {
        if (window.confirm('Reiniciar a simulação? Todas as posições, ordens e resultados desta aba serão apagados.')) dispatch({ type: 'reset' });
    };

    return <div className="app-shell">
        <a className="skip-link" href="#main">Pular para o conteúdo</a>
        <aside className="rail" aria-label="Navegação principal"><Logo small />
            <nav><button title="Terminal" aria-label="Terminal" aria-current={page === 'terminal' ? 'page' : undefined} onClick={() => setPage('terminal')}><ChartCandlestick size={22} /><span>Terminal</span></button>
                <button title="Dashboard" aria-label="Dashboard" aria-current={page === 'dashboard' ? 'page' : undefined} onClick={() => setPage('dashboard')}><LayoutDashboard size={21} /><span>Dashboard</span></button></nav>
            <div className="rail-bottom"><span className="rail-version">P02</span><span className="avatar">VX</span></div>
        </aside>
        <div className="workspace">
            <header className="topbar"><Logo /><div className="breadcrumb">Workspace <ChevronRight size={13} /><b>{page === 'terminal' ? 'Terminal de trading' : 'Dashboard'}</b></div>
                <div className="topbar-actions"><span className="simulation-pill"><span className="status-dot" /> SIMULAÇÃO</span>
                    <button className="icon-button" aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title="Alternar tema" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
                    <button className="reset-button" aria-label="Reiniciar simulação" onClick={reset}><RotateCcw size={14} /><span>Reiniciar</span></button></div></header>
            <div className="safety-banner"><ShieldCheck size={14} /><span><b>Ambiente de simulação.</b> Dados sintéticos, capital fictício e ordens exclusivamente simuladas. Sem conexão com B3, corretora ou LEAN.</span><span className="banner-tag">ZERO ORDENS REAIS</span></div>
            <main id="main">
                {page === 'terminal' ? <>
                    <div className="terminal-heading"><div><span className="eyebrow">SEU MERCADO. SEU RITMO.</span><h1>Terminal de trading<span className="heading-dot" /></h1></div>
                        <div className="scenario-clock"><span className="clock-label">CENÁRIO SINTÉTICO · UTC</span><b>{dateTime(scenarioTime(state.step))}</b></div></div>
                    <div className="summary-strip"><span><Wallet size={15} /> Patrimônio <b data-testid="terminal-capital">{money(summary.capital)}</b></span><i /><span>Resultado total <b className={signClass(summary.total)}>{money(summary.total)}</b></span><i /><span>Realizado <b className={signClass(state.realized)}>{money(state.realized)}</b></span><span className="summary-right"><span className="status-dot" /> {state.paused ? 'Cenário pausado' : 'Reprodução sintética'}</span></div>
                    <div className="terminal-grid">
                        <aside className="watchlist panel" aria-label="Lista de ativos">
                            <div className="section-title"><h2>Lista de ativos</h2><span className="count">04</span></div>
                            <label className="search-field"><Search size={14} /><input type="search" aria-label="Buscar ativo" placeholder="Buscar ativo..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌕</kbd></label>
                            <div className="watchlist-labels"><span>ATIVO</span><span>PREÇO / VAR. 24H*</span></div>
                            <div className="asset-list">{assets.filter((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(search.toLowerCase())).map((item) => {
                                const price = priceAt(item.symbol, scenarioTime(state.step));
                                const delta = (price / priceAt(item.symbol, scenarioTime(state.step) - 86400) - 1) * 100;
                                return <button key={item.symbol} aria-label={`${item.symbol} ${item.name}`} aria-pressed={symbol === item.symbol} className={`asset-row ${symbol === item.symbol ? 'selected' : ''}`} onClick={() => setSymbol(item.symbol)}>
                                    <span className="asset-icon" style={{ '--asset-color': item.color } as React.CSSProperties}>{item.symbol[0]}</span>
                                    <span className="asset-name"><b>{item.symbol}</b><small>{item.name}</small></span>
                                    <span className="asset-price"><b>{number(price, item.symbol === 'WIN' ? 0 : 2)}</b><small className={signClass(delta)}>{delta >= 0 ? '+' : ''}{number(delta)}%</small></span>
                                </button>;
                            })}</div>
                            {!assets.some((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(search.toLowerCase())) && <p className="no-assets">Nenhum ativo encontrado.</p>}
                            <p className="watchlist-note">*Variação sintética em 24h de cenário. Não representa o mercado brasileiro.</p>
                            <div className="watchlist-bottom"><div className="data-orbit"><Activity size={28} /></div><strong>Explore sem risco financeiro.</strong><p>Teste suas ideias em um ambiente feito para aprender.</p><span><FlaskConical size={12} /> 100% sintético</span></div>
                        </aside>
                        <section className="chart-panel panel" aria-label="Análise gráfica">
                            <div className="chart-heading"><div className="chart-symbol"><span className="asset-icon" style={{ '--asset-color': asset.color } as React.CSSProperties}>{symbol[0]}</span><div><h2>{symbol} <span>{asset.name}</span></h2><small>{asset.category} <span>·</span> Preço sintético</small></div></div>
                                <div className="chart-price"><strong>{number(current, symbol === 'WIN' ? 0 : 2)}</strong><span className={signClass(change)}>{change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{number(change)}% <small>24h demo</small></span></div></div>
                            <div className="chart-toolbar"><div className="periods" role="group" aria-label="Período do gráfico">{(Object.keys(periods) as Period[]).map((value) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div>
                                <span className="toolbar-divider" /><button className="fit-button" onClick={() => setFit((value) => value + 1)}><Crosshair size={14} /> Ajustar</button>
                                <div className="playback"><button aria-label={state.paused ? 'Reproduzir cenário' : 'Pausar cenário'} title={state.paused ? 'Avançar cenário a cada 3 segundos' : 'Pausar cenário'} onClick={() => dispatch({ type: 'togglePlayback' })}>{state.paused ? <Play size={14} /> : <Pause size={14} />}</button><button aria-label="Avançar um minuto sintético" title="Avançar um minuto sintético" onClick={() => dispatch({ type: 'step' })}><SkipForward size={15} /></button></div></div>
                            <div className="indicator-controls" role="group" aria-label="Indicadores">{([
                                ['ema9', 'EMA 9', '#e5b963'], ['ema21', 'EMA 21', '#8e8bf7'], ['sma', 'SMA 20', '#56a9e9'], ['volume', 'Volume', '#6b869e'],
                            ] as const).map(([key, label, color]) => <label key={key}><input type="checkbox" checked={indicators[key]} onChange={() => setIndicators((current) => ({ ...current, [key]: !current[key] }))} /><span className="indicator-dot" style={{ background: color }} />{label}</label>)}</div>
                            <PriceChart candles={candles} identity={`${symbol} ${period}`} theme={theme} indicators={indicators} fit={fit} />
                        </section>
                        <Ticket state={state} symbol={symbol} dispatch={dispatch} />
                        <Portfolio state={state} dispatch={dispatch} tab={tab} setTab={setTab} />
                    </div>
                </> : <Dashboard state={state} />}
                <details className="methodology"><summary><CircleHelp size={14} /> Como funciona esta simulação?</summary><p>Candles gerados por funções determinísticas, sem feed externo. O relógio começa em 16/01/2026 às 17:00 UTC e só avança com seus controles. Cada passo representa um minuto sintético; o último candle de cada período pode estar em formação. Indicadores: EMA 9 e 21 com semente SMA, SMA 20 e volume fictício.</p><p>Ordens a mercado são preenchidas integralmente ao preço sintético visível, sem latência, taxas, margem ou slippage. Multiplicadores são convenções didáticas, não regras B3. Máximo de 100 unidades por ativo e 1.000 ordens por sessão. Posições, métricas e histórico existem apenas nesta aba e são apagados ao recarregar. Não é backtest, recomendação ou paper trading integrado ao LEAN.</p><p>TradingView Lightweight Charts™<br />Copyright (с) 2025 TradingView, Inc. <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">https://www.tradingview.com/</a></p></details>
            </main>
            <footer className="app-footer"><span><span className="status-dot" /> Ambiente isolado <i /> P02 · v0.2.0</span><span>Gráficos: <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a><i /> Motor futuro: QuantConnect LEAN · Apache-2.0 <ArrowRight size={11} /></span></footer>
        </div>
    </div>;
}
