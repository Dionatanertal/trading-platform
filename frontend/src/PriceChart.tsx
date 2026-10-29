import { useEffect, useRef, useState } from 'react';
import {
    CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries,
    createChart, type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts';
import { dateTime, ema, number, sma, type Candle } from './market';

export interface Indicators { ema9: boolean; ema21: boolean; sma: boolean; volume: boolean }
interface ChartProps {
    candles: Candle[];
    identity: string;
    theme: 'dark' | 'light';
    indicators: Indicators;
    fit: number;
}
interface Series {
    candles: ISeriesApi<'Candlestick'>;
    ema9: ISeriesApi<'Line'>;
    ema21: ISeriesApi<'Line'>;
    sma: ISeriesApi<'Line'>;
    volume: ISeriesApi<'Histogram'>;
}
const timestamp = (time: number) => time as UTCTimestamp;

export default function PriceChart({ candles, identity, theme, indicators, fit }: ChartProps) {
    const container = useRef<HTMLDivElement>(null);
    const chart = useRef<IChartApi | null>(null);
    const series = useRef<Series | null>(null);
    const previousIdentity = useRef('');
    const [hovered, setHovered] = useState<Candle | null>(null);

    useEffect(() => {
        if (!container.current) return;
        const api = createChart(container.current, {
            autoSize: true,
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8491a8', fontFamily: 'system-ui, sans-serif', fontSize: 11 },
            grid: { vertLines: { color: '#8491a80d' }, horzLines: { color: '#8491a812' } },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.13, bottom: 0.27 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
            crosshair: { mode: CrosshairMode.Normal },
            localization: { locale: 'pt-BR', priceFormatter: (price: number) => number(price), timeFormatter: (time: number) => `${dateTime(time)} UTC` },
        });
        const candleSeries = api.addSeries(CandlestickSeries, {
            upColor: '#2ac7a0', downColor: '#f16c80', borderVisible: false,
            wickUpColor: '#2ac7a0', wickDownColor: '#f16c80',
        });
        const common = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
        const ema9 = api.addSeries(LineSeries, { ...common, color: '#e5b963', title: 'EMA 9' });
        const ema21 = api.addSeries(LineSeries, { ...common, color: '#8e8bf7', title: 'EMA 21' });
        const sma20 = api.addSeries(LineSeries, { ...common, color: '#56a9e9', title: 'SMA 20' });
        const volume = api.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' }, priceScaleId: 'volume',
            priceLineVisible: false, lastValueVisible: false,
        });
        volume.priceScale().applyOptions({ scaleMargins: { top: 0.83, bottom: 0 }, visible: false });
        chart.current = api;
        series.current = { candles: candleSeries, ema9, ema21, sma: sma20, volume };
        return () => { api.remove(); chart.current = null; series.current = null; };
    }, []);

    useEffect(() => {
        chart.current?.applyOptions({
            layout: { textColor: theme === 'dark' ? '#8491a8' : '#59677b' },
        });
    }, [theme]);

    useEffect(() => {
        if (!series.current || !chart.current) return;
        const lines = (values: ReturnType<typeof ema>) => values.map((point) => ({ ...point, time: timestamp(point.time) }));
        series.current.candles.setData(candles.map((candle) => ({ ...candle, time: timestamp(candle.time) })));
        series.current.ema9.setData(lines(ema(candles, 9)));
        series.current.ema21.setData(lines(ema(candles, 21)));
        series.current.sma.setData(lines(sma(candles, 20)));
        series.current.volume.setData(candles.map((candle) => ({
            time: timestamp(candle.time), value: candle.volume,
            color: candle.close >= candle.open ? '#2ac7a033' : '#f16c8033',
        })));
        if (previousIdentity.current !== identity) {
            chart.current.timeScale().setVisibleLogicalRange({ from: 125, to: 245 });
            previousIdentity.current = identity;
            setHovered(null);
        }
        const api = chart.current;
        const handler = (param: { time?: unknown }) => {
            setHovered(candles.find((candle) => candle.time === param.time) ?? null);
        };
        api.subscribeCrosshairMove(handler);
        return () => api.unsubscribeCrosshairMove(handler);
    }, [candles, identity]);

    useEffect(() => {
        for (const key of ['ema9', 'ema21', 'sma', 'volume'] as const) {
            series.current?.[key].applyOptions({ visible: indicators[key] });
        }
    }, [indicators]);

    useEffect(() => {
        if (fit > 0) chart.current?.timeScale().fitContent();
    }, [fit]);

    const current = hovered ?? candles[candles.length - 1];
    return <div className="chart-area">
        <div className="ohlc" aria-label="Resumo do candle">
            <span className="candle-time">{dateTime(current.time)} UTC</span>
            <span>A <b>{number(current.open)}</b></span>
            <span>M <b>{number(current.high)}</b></span>
            <span>m <b>{number(current.low)}</b></span>
            <span>F <b className={current.close >= current.open ? 'positive' : 'negative'}>{number(current.close)}</b></span>
            <span>Vol <b>{number(current.volume, 0)}</b></span>
        </div>
        <div ref={container} className="financial-chart" role="img"
            aria-label={`Gráfico de candles sintéticos de ${identity}. Zoom com rolagem, arraste para navegar. Último fechamento ${number(candles[candles.length - 1].close)}.`} />
        <div className="chart-footnote"><span>Dados 100% sintéticos · cenário didático fixo · UTC</span><span>Arraste para navegar · role para zoom</span></div>
    </div>;
}
