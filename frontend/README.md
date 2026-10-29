# Vertex · Terminal P02

Interface funcional independente do QuantConnect LEAN. **SIMULAÇÃO**: todos os preços, volumes, unidades, multiplicadores e resultados são fictícios. Não usa feed B3, corretora, conta, API, Supabase ou LEAN. Não é backtest nem paper trading homologado.

## Abrir sem instalar no seu computador

A versão pública poderá ser aberta no navegador pelo GitHub Pages **somente depois da aprovação e publicação manual** descritas abaixo. Este pacote não executa deploy nem fornece uma publicação antecipada.

Para inspecionar antes da publicação, um Codespace do GitHub pode executar o frontend e encaminhar a porta 5173 pela aba **Ports**. Os comandos abaixo rodam no ambiente GitHub, não exigem Node ou Docker no computador do usuário. Codespaces está sujeito à disponibilidade e à cota da conta; não é promessa de infraestrutura gratuita ilimitada.

```bash
cd frontend
npm ci
npm run dev
```

Abrir o endereço encaminhado com `/trading-platform/`. Sem credenciais ou configuração de serviços externos.

## Recursos e semântica

- Terminal e dashboard compartilham a carteira desta aba; tema claro/escuro e layout responsivo.
- WIN, WDO, PETR4 e VALE3; pesquisa, candles, cursor OHLC, zoom/arraste, enquadramento e períodos 1m/5m/15m/1h/1d.
- EMA 9 e EMA 21 iniciadas com SMA, SMA 20 e volume, todos com controles de visibilidade.
- Cenário determinístico iniciado em **16/01/2026, 17:00 UTC**, pausado por padrão. Avançar move um minuto sintético; reproduzir move um minuto a cada três segundos. Nenhum dado é cotação atual. O candle final pode estar em formação.
- Compra/venda a mercado fictício, execução integral imediata ao último fechamento sintético. Preço canônico comum aos períodos e à carteira; não há ordens pendentes ou cancelamento fictício.
- Posições compradas/vendidas, preço médio ponderado, redução, zeragem e inversão; resultado realizado e aberto; histórico de execuções de redução.
- Capital inicial R$ 100.000. Patrimônio = capital + realizado + aberto. Taxa de acerto considera execuções de redução, não trades completos ou estratégias. Curva/drawdown usam capital realizado; fator de lucro aparece somente com perda bruta diferente de zero.
- Quantidade inteira 1–100, posição absoluta máxima 100 por ativo, limite de 1.000 ordens por sessão. Limites e multiplicadores são **didáticos**, não regras B3 nem limites financeiros homologados.
- Sem taxas, slippage, margem, latência ou parciais. **Recarregar perde toda a sessão**. Reiniciar pede confirmação e limpa carteira, histórico, resultados e relógio.

## Fronteiras

| Arquivo | Responsabilidade |
|---|---|
| `src/market.ts` | Proveniência, cenário/candles determinísticos e indicadores puros |
| `src/simulation.ts` | Domínio local, validação, fills e métricas sem efeitos de rede |
| `src/PriceChart.tsx` | Adaptador visual Lightweight Charts e ciclo de vida do gráfico |
| `src/App.tsx` | Navegação, boleta, carteira e dashboard |
| `src/main.tsx` | Inicialização e fronteira visível de erro |

Uma futura integração deverá ter contrato próprio e API autorizada; não existe URL configurável, conexão direta ao motor ou seletor REAL. Não reutilizar estes controles locais como autorização server-side. Nenhuma operação é persistida em storage, banco ou serviço. A UI não contém telemetria, CDN, fontes ou feeds externos.

## Validação reproduzível no ambiente GitHub

Requer Node >=22.12 (workflow usa Node 24).

```bash
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Em runner Linux sem bibliotecas de navegador: `npx playwright install --with-deps chromium`. O E2E inicia e encerra o preview automaticamente em `127.0.0.1:4173/trading-platform/`; exige porta livre e build anterior. Testa desktop e viewport mobile em Chromium (não Safari nativo).

Para inspecionar o build: `npm run preview -- --port 4173`; abrir `/trading-platform/`. `dist/` não deve ser commitado. Evidências efetivamente executadas em [`P02-evidencias.txt`](../docs/evidence/P02-evidencias.txt).

## GitHub Pages — somente após aprovação

O workflow novo `.github/workflows/p02-pages.yml` **não possui push, PR ou agendamento**. Nenhum workflow existente foi modificado.

Após revisar e mesclar explicitamente o PR:

1. Em **Settings → Pages**, selecionar **GitHub Actions**. Confirmar que não há outra publicação Pages a preservar; Pages é um site por repositório, e este fluxo publica a raiz dele.
2. Em **Settings → Environments → github-pages**, restringir deploy à `master` e configurar revisão obrigatória, quando disponível. Essa configuração é manual pelo proprietário; não foi criada nesta entrega.
3. Em **Actions → P02 - Publicacao manual do terminal → Run workflow**, selecionar `master` e digitar **PUBLICAR_P02** para autorizar. Aprovar também o environment se configurado.
4. O workflow executa instalação, unitários, build/typecheck e E2E; só então publica `frontend/dist`. Ler o URL no job de deployment. O caminho esperado é `https://dionatanertal.github.io/trading-platform/`, **não validado/publicado neste pacote**.
5. Validar o commit publicado e repetir compra/avanço/zeragem, indicadores e navegação na versão pública antes de selar o pacote. Sem deploy não existe PASS de produção.

Workflow disparado em outra branch ou sem a confirmação exata não executa os jobs. O nome/repositório está fixado em `vite.config.ts`; alterar a hospedagem exige revisar a base e E2E. Não é necessário configurar secrets no frontend.

Rollback: antes de merge, rejeitar PR; após eventual publicação, reverter P02 por PR e retirar/desabilitar o site nas configurações pelo proprietário. Não alterar LEAN nem usar reset/force push.

## Licenças e atribuição

O LEAN e sua licença Apache-2.0 permanecem intactos na raiz. React, Vite, TypeScript, Lucide e Lightweight Charts são dependências identificadas no manifesto/lockfile, com suas licenças distribuídas nos pacotes npm. Lightweight Charts é software TradingView sob Apache-2.0; a UI mantém o logotipo padrão e a atribuição com link a [TradingView](https://www.tradingview.com/). Não há afiliação ou integração de feed TradingView.
