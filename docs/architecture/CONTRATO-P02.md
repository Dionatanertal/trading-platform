# P02 — Terminal visual de simulação

**Autorização:** solicitação explícita do proprietário nesta sessão, que aprova P01 como base e redefine P02 como primeira interface funcional. Risco **R2 — risco médio**, classificação e definição fornecidas pelo proprietário: interface com estados interativos, gráficos, indicadores e operações exclusivamente simuladas. Não implica consulta aos protocolos privados.

## Baseline e ambiente

- Projeto: `Dionatanertal/trading-platform`; base `master`, HEAD `d940ba291dfee1b6129b13ff086e2e2a265e0fcc`; worktree inicialmente limpo.
- Branch exclusiva: `feature/p02-trading-terminal`. Node/npm no ambiente GitHub; sem Docker.
- Arquitetura recuperada: P01; LEAN existente, frontend/API/runner próprios ainda não implementados no baseline.
- Problema: não há interface navegável. Este pacote entrega uma demonstração de produto, não execução PAPER pelo LEAN nem backtest.

## Escopo e fronteiras

Frontend isolado em `frontend/`: React, TypeScript, Vite, Lightweight Charts; domínio puro de simulação, dados sintéticos e componentes separados. Adicionar somente um workflow manual próprio de Pages, documentação, testes e evidência TXT. Preservar todos os arquivos LEAN, licença, atribuições e workflows existentes.

Fora do escopo: API, autenticação, tenants, rede financeira, feed B3, corretora, conta, LEAN/runner, backtest, Supabase, SQL, persistência de operações, credenciais, ordens reais, merge e deploy. Não implementar endpoints conceituais P01 como se estivessem disponíveis. A futura API deverá substituir a fronteira de simulação em pacote contratado, não trocar uma URL para habilitar operação real.

## Domínio, dados e fluxo

1. Gerador determinístico fornece 240 candles por ativo/período (1m, 5m, 15m, 1h, 1d), em cenário fixo identificado, sem data/hora de mercado corrente. WIN, WDO, PETR4 e VALE3 são referências visuais; preços, volumes, multiplicadores e unidades são convenções da demonstração, não especificação B3.
2. EMA 9/21 e SMA 20 calculadas sobre fechamento; volume sintético separado. Seleção de ativo/período e controles alteram o gráfico. Cursor mostra OHLC; zoom/pan nativos e ajuste de enquadramento.
3. Relógio de cenário avança uma barra sintética por passo ou a cada 3 segundos quando reproduzido; pausa é padrão. Nenhuma alegação de tempo real. O mesmo índice de cenário marca a carteira em todos os ativos.
4. Ordem de demonstração `{id, symbol, side, quantity, price, scenarioTime}` executa integralmente no último fechamento sintético visível, síncrona e atomicamente no reducer. Apenas ordens a mercado; sem fila/cancelamento fictícios, slippage, custos, garantias ou execução parcial.
5. Posição líquida por ativo; compra/venda pode abrir, aumentar, reduzir, fechar ou inverter posição. Preço médio ponderado ao aumentar; resultado realizado ao reduzir; preço de abertura remanescente na inversão é o fill. Resultado aberto = diferença entre preço atual e médio × posição assinada × multiplicador didático.
6. Capital demonstrativo inicial R$ 100.000; patrimônio = capital + realizado + aberto. Não é saldo disponível nem limite financeiro. Métricas derivadas apenas das operações desta aba; taxa de acerto conta fills que reduzem exposição, não estratégias/backtests.
7. Quantidade inteira entre 1 e 100, exposição máxima absoluta 100 unidades por ativo e 1.000 ordens por sessão. Validações síncronas no domínio, sem rede; erros explícitos na UI. Esses limites são didáticos, não controles homologados P01.

## Estado, erros, segurança e UX

Estado de ordens/posições/eventos somente em memória por aba, perdido ao recarregar. Reinício exige confirmação e limpa carteira, histórico e relógio. Nenhum armazenamento financeiro no browser, serviço ou banco. Reducer serializa ações e retorna imutavelmente; rejeição não altera carteira. Sem retry, despacho, concorrência distribuída ou promessa de idempotência server-side.

Sem modo REAL ou caminho de rede para ordens. Sem segredos, fontes externas de cotação, telemetria, CDN de assets ou fontes remotas. Avisos permanentes de SIMULAÇÃO e proveniência; operações rotuladas simuladas, LEAN não conectado. Erro de renderização visível com recarregamento explícito; sem sucesso fictício. Erros de validação acessíveis; gráficos com resumo textual e tabelas de carteira.

UI responsiva: navegação Terminal/Dashboard, lista pesquisável, gráfico, ticket de operação, posições/ordens/histórico, resultados, tema claro/escuro. Botões com nomes acessíveis, foco visível, labels, regiões de status, conteúdo vazio honesto; sem botões decorativos fingindo recursos. Dashboard compartilha a mesma fonte de verdade. Atribuir Lightweight Charts/TradingView e LEAN sem sugerir integração operacional.

## Publicação controlada

Workflow novo `.github/workflows/p02-pages.yml`, exclusivamente `workflow_dispatch`, com confirmação explícita, branch `master` e environment `github-pages`. Nenhum gatilho push/PR/schedule e nenhuma execução nesta entrega. Build do frontend com base `/trading-platform/`; testes antes de empacotar. O proprietário deve configurar Pages como GitHub Actions e, preferencialmente, revisão obrigatória do environment após aprovar/mesclar o PR. Até autorização e execução bem-sucedida não há URL pública validada nem promoção.

## Plano, testes e aceite

Ordem: contrato → isolamento → domínio/dados → UI/gráfico → workflow manual → testes → preflight → evidência/nota → commit/push/PR autorizados na solicitação. Sem merge.

Aceite verificável: build/typecheck; testes unitários de OHLC/indicadores/contabilidade/limites e imutabilidade; testes de navegador no build servido sob o subpath Pages cobrindo seleção, indicadores, compra/venda/zeragem/inversão, métricas compartilhadas, erros, reset, tema, responsividade, reload, ausência de requisições externas e erros JS. Testes LEAN não aplicáveis por ausência de alteração ou integração; comparar diff de escopo e workflows com baseline. Não usar build verde como prova funcional.

Arquivos previstos: `frontend/**`, este contrato, mapa/roadmap arquiteturais, `docs/evidence/P02-evidencias.txt`, `docs/releases/P02.md`, `.github/workflows/p02-pages.yml`. Sem migrations/banco (N/A). Evidências sem segredos.

Rollback antes de merge: rejeitar PR; nenhum runtime remoto foi alterado. Depois de eventual aprovação/deploy: reverter somente o pacote P02 por PR e retirar/desabilitar publicação pelo proprietário; não afetar LEAN. Não usar reset destrutivo. Selagem pública fica pendente de aprovação, promoção e validação da versão publicada.
