# P03 — Primeiro backtest LEAN nativo

## Autorização, baseline e risco

Solicitação do proprietário: executar um backtest verdadeiro via .NET, preservar P02,
preparar resultados e, se viável, visualizá-los; commit/push e PR para revisão.
Não autoriza merge, deploy, SQL, Supabase ou operação financeira real.
Aplicado o resumo público PES/SAMACON; originais privados não consultados.

Base: `master`, `6f9f26dded73e6ff0c1a0879b0125331c85bc4aa`, merge do P02;
worktree inicialmente limpo. Branch exclusiva `feature/p03-lean-backtest`.
Ambiente Linux x64, SDK .NET 10.0.403/runtime 10.0.14, Node/npm.
Sem Docker. Risco técnico: execução local limitada e importação somente leitura;
classificação numérica R0–R4 pendente de confirmação do proprietário, sem
presumir a escala privada ou homologação financeira.

## Problema, arquitetura e domínio

P02 é demonstração sintética em memória; não executa LEAN. O launcher upstream
e os projetos do motor existem e têm alvo `net10.0`. Há amostras locais de
SPY/EUA de 07 a 11/10/2013, mapas, fatores e calendário.
`BasicTemplateAlgorithm` já define esse intervalo, USD 100.000 e compra de SPY.
Reutilizar esse algoritmo sem alterar arquivos upstream.

Fluxo contratado: comando local explícito → build Launcher → processo .NET
com configuração exclusiva de backtest → arquivos nativos LEAN → validação
de término, dados, ordem preenchida, estatísticas e curva → resumo JSON v1
para consumo offline → visualização isolada no frontend.
Não há API de produto, serviço permanente, fila, autenticação ou despacho web.
O navegador nunca inicia o motor. A fonte de verdade é a saída nativa, não
valores esperados embutidos no algoritmo nem a carteira demonstrativa.

## Escopo positivo e negativo

Adicionar somente `p03/**` (runner local, configuração, validação/testes e
resultados selecionados), visualizador frontend separado, testes e documentação
diretamente relacionada. Preservar estratégia, LEAN, licença, atribuições,
workflows, rotas e contabilidade P02. Dados de mercado brutos não serão copiados.

Fora do escopo: B3, Genial, live/paper conectado, credenciais, contas, ordens
reais, Supabase/banco/migrations, downloads de mercado, Docker, serviços
persistentes, CI/deploy, redesign P02, otimização ou avaliação de rentabilidade.
Dependências são restauradas pelos manifests existentes, sem modificá-los.

## Dados e contrato frontend

Identificar símbolo SPY, mercado USA, resolução Minute, intervalo, moeda USD,
estratégia, hash dos arquivos usados, baseline, versão do motor e horário UTC.
Amostras pré-existentes sob `Data/`; `Data/equity/usa/readme.md` atribui os dados
à Algoseek, ALL RIGHTS RESERVED. Não presumir licença comercial, auditoria de
qualidade ou completude. Histórico de teste não é cotação atual.

Resumo versionado deve conter proveniência, status observado, estatísticas
nativas, ordens preenchidas e série temporal de patrimônio. Valores não serão
recalculados como se fossem resultados do motor. Arquivos nativos selecionados
e seus hashes permitem conferir a transformação. Sem métricas hardcoded,
fallback de sucesso, série sintética ou substituição da simulação P02.
O contrato exato JSON e comandos serão documentados após observar o formato
nativo. Importador rejeita saída incompleta, vazia ou com erro.

## Estado, segurança, erros e UX

Uma execução por diretório novo; recusar sobrescrita e mistura de execuções.
Configuração própria fixa modo backtest, handlers locais e dados em disco;
sem reutilizar credenciais/configuração de live do launcher. Timeout e retorno
não zero são falhas explícitas. Término do processo sozinho não prova execução:
exigir evidência funcional e arquivos válidos antes de exportar.
Logs/artefatos apenas deste backtest sem segredos; nada de ambiente completo.

Visualização, se viável, identificada como backtest histórico pré-executado,
com moeda USD e fonte, separada do terminal e dashboard sintéticos.
Nenhum botão promete executar LEAN online. Texto acessível, tabela/curva
com descrição, layout responsivo e erros explícitos. Sem estado financeiro
compartilhado com a demonstração, persistência de contas ou concorrência remota.

## Plano, aceite, regressão e rollback

1. Contrato e isolamento antes do código; build nativo e identificação precisa
   de eventual dependência ausente antes de instalar.
2. Executar algoritmo upstream com amostras locais; guardar resultado e log.
3. Validar status Completed, dados processados, SPY preenchido, curva não vazia,
   patrimônio final e estatísticas consistentes. Reexecutar em diretório novo
   e comparar conteúdo financeiro (não horários/duração).
4. Testar exportador em sucesso e rejeição de resultados inválidos; testar
   visualizador e executar regressão unitária/build/E2E P02.
5. Preflight: diff contra baseline, ausência de mudança upstream, workflows,
   banco e segredos; TXT consolidado, mapa e Nota de versão; commit/push/PR.

Arquivos previstos: `p03/**`, `frontend/src/**` estritamente ligado ao
visualizador, `frontend/tests/**`, `frontend/README.md`,
`docs/architecture/{CONTRATO-P03,MAPA-CANONICO}.md`,
`docs/evidence/P03-evidencias.txt`, `docs/releases/P03.md`.
Sem banco: N/A. Sem promoção automática; selagem de produção pendente.
Rollback pré-merge: rejeitar PR e descartar apenas os artefatos locais P03;
pós-merge eventual: revert do pacote por PR, sem reset ou alteração de dados.
