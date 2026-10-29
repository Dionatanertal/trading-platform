# P03 — LEAN nativo, backtest SPY

Backtest **realmente executado pelo motor**, não ordens reais. Reutiliza
`Algorithm.CSharp/BasicTemplateAlgorithm.cs` sem alteração: SPY/EUA, resolução
Minute, 07–11/10/2013, capital inicial USD 100.000, compra e manutenção.
A posição não é liquidada ao final; o resultado inclui marcação a mercado.

Resultado preservado: LEAN v2.5.0.0, status `Completed`, processo retornou 0,
3.943 pontos, 11 solicitações de dados atendidas e nenhuma falha, compra
preenchida de 688 SPY, taxas USD 3,44, patrimônio final USD 101.691,9198
(estatística nativa arredondada: 101.691,92), retorno nativo 1,692%,
drawdown nativo 2,200%. Cinco pregões **não validam desempenho futuro**.

## Reexecutar sem Docker

Requer SDK .NET 10 e Python >=3.11 (somente biblioteca padrão para orquestrar
processos e validar JSON). Python não executa a estratégia: o processo
`dotnet QuantConnect.Lean.Launcher.dll` carrega o algoritmo C# e o motor LEAN.
Não usa LEAN CLI, Docker, conta QuantConnect ou credenciais.
NuGet pode acessar a rede no build; os dados de mercado são locais.

Na raiz do repositório, com um diretório de saída **ainda inexistente**:

```bash
python3 p03/run.py /tmp/p03-spy-001
python3 -m unittest discover -s p03 -p 'test_*.py' -v
```

O runner sempre compila o Launcher em Release, configura caminhos absolutos,
usa a configuração própria `p03/config.json`, executa o LEAN e exporta somente
após validação funcional. Timeout de build: 600s; de execução: 180s. Falha,
saída incompleta, ordem não preenchida ou dados ausentes produzem erro, nunca
um resumo de sucesso. Examinar `build.txt` e `console.txt` no diretório.
Diretório existente é recusado, inclusive após falha. Não rodar builds
concorrentes no mesmo checkout.

Para inspecionar a chamada .NET, o comando interno é:

```text
dotnet build Launcher/QuantConnect.Lean.Launcher.csproj --configuration Release --verbosity quiet
dotnet <raiz>/Launcher/bin/Release/QuantConnect.Lean.Launcher.dll --config <saída>/effective-config.json
```

A segunda chamada usa como cwd `Launcher/bin/Release`. Não usar
`Launcher/config.json` ou substituir handlers por live. Nenhum parâmetro web
ou configuração de corretora é aceito pelo runner.

**Avisos upstream:** o primeiro build teve 4.452 warnings e zero erros.
Inclui NuGet NU1903 para DotNetZip 1.16.0 e NU1904 para
System.Drawing.Common 4.7.0. Não foram ocultados ou corrigidos neste pacote;
não é homologação de segurança para serviço público ou produção. Este
runner usa exclusivamente amostras locais conhecidas, sem uploads.

## Dados e direitos

Fonte: amostras já versionadas neste checkout LEAN. O aviso
`Data/equity/usa/readme.md` identifica **Algoseek — ALL RIGHTS RESERVED**.
Não foi feita aquisição externa nem inferida autorização de redistribuição
comercial. Não copiar dados brutos para a UI ou outros serviços.

- Dez ZIPs SPY Minute (trade/quote), de 07 a 11/10/2013.
- `Data/equity/usa/hour/spy.zip`, usado pelo benchmark interno.
- Map/factor files SPY, calendário, propriedades de símbolos e juros locais.
- Todos identificados por caminho e SHA-256 no manifesto; estratégia,
  configuração e assemblies executados também têm hashes.

São dados históricos de teste, não B3, tempo real ou fonte auditada
independentemente quanto a cobertura/qualidade. Os ajustes de preço e
preenchimentos são do modelo padrão upstream. Licença e atribuições LEAN
Apache-2.0 permanecem intactas.

## Artefatos e contrato v1

`artifacts/first-run/` preserva uma execução validada da sessão P03:

| Arquivo | Fonte/responsabilidade |
|---|---|
| `p03-spy.json` | Saída nativa completa LEAN, incluindo status, ordens, curva e estatísticas |
| `p03-spy-order-events.json` | Eventos nativos de submissão/preenchimento |
| `console.txt` | Log real do launcher/engine, carga do algoritmo e contagem de dados |
| `data-monitor-report-*.json` | Relatório nativo de sucesso/falha de dados |
| `manifest.json` | Identidade do checkout, horários UTC, SDK, hashes de entradas/scripts/assemblies, exit code |
| `dashboard.json` | Transformação validada e somente leitura para frontend |

O `sourceCommit` é o HEAD da base LEAN executada; o P03 estava em worktree
isolado, ainda não commitado. Hashes dos scripts identificam essa versão
sem fingir que o commit final do pacote já existia. Os caminhos absolutos
do log são evidência do ambiente original, não requisitos para outro host.
`effective-config.json` e build completo permanecem no diretório local da
execução, não são necessários à exibição; hash da configuração efetiva consta
no manifesto. `repeat-check.json` registra comparação funcional de duas
execuções distintas, sem exigir que horários/CPU/duração sejam iguais.

O resumo v1 tem:

- `schemaVersion`, `runId`, `status`, `strategy`.
- `engine`: nome, versão observada, commit-fonte e hashes dos assemblies.
- `execution`: início/fim UTC, exit code, pontos e solicitações de dados.
- `dataset`: símbolo, mercado, resolução, intervalo, moeda, atribuição,
  restrições e hashes dos inputs.
- `statistics`: strings **exatamente como emitidas pelo LEAN**.
- `equity`: `{time, value}`, timestamp Unix em segundos UTC e fechamento do
  candle nativo de patrimônio `[time, open, high, low, close]`, não preço SPY.
- `fills`: ordem, símbolo, status, horário Unix UTC, quantidade, preço,
  taxa e moeda, extraídos dos eventos nativos e conferidos com as ordens.
- `artifactHashes`: SHA-256 dos arquivos de evidência usados no resumo.

Precisão numérica nativa é preservada; apenas formatação visual arredonda
USD a centavos. A estatística `End Equity` é conferida com tolerância menor
que USD 0,01 em relação ao último fechamento da curva.
Não confundir métricas anualizadas, win rate de trades encerrados ou
`ExpectedStatistics` do código com prova de execução.

`export.py` é específico deste cenário P03, não um importador genérico.
Para um diretório nativo ainda sem `dashboard.json`:
`python3 p03/export.py <diretório>`. Recusa sobrescrita; não preencher
arquivos faltantes manualmente. Os testes conferem hashes dos artefatos e
dos inputs locais, consistência do resumo, ordens/curva e falhas explícitas.
SHA-256 fornece rastreabilidade/integridade, não assinatura independente.

## Visualização

No frontend, abrir **Backtest LEAN** na navegação. O bundle inclui somente o
resumo da execução preservada, sem acesso ao runner, credenciais ou banco.
Novas execuções não alteram o dashboard automaticamente: substituir a amostra
exige validação, revisão do pacote e futura publicação autorizada.
Terminal e Dashboard P02 continuam sintéticos, independentes e em memória.

```bash
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Nenhum serviço, workflow ou infraestrutura permanente foi adicionado.
Nenhum merge/deploy/Supabase/B3/Genial/ordem real. Publicação e selagem
continuam pendentes de revisão e autorização do proprietário.
