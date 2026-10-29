# Mapa canônico da arquitetura

**Pacote:** P01 — Arquitetura canônica
**Estado:** proposta para revisão; não é autorização de implementação nem de operação.
**Baseline:** `master` em `6bdc2932fa0adda8255b4e4ed35184bae678dee3` (2026-10-29).
**Branch de trabalho:** `feature/p01-arquitetura-contratos`.

## 1. Objetivo e limites

Definir a arquitetura da plataforma própria sobre o motor QuantConnect LEAN, preservando o código upstream e separando-o do produto. O código atual é a única evidência de componentes existentes. Elementos indicados como **propostos** ou **pendentes** não existem por força deste documento.

Esta proposta não afirma que os documentos privados integrais PES 1.0 ou SAMACON foram consultados. Foi aplicado apenas o resumo público em `docs/governance/REGRAS-PUBLICAS.md`; a validação separada pelo proprietário continua necessária. O relatório P00 não foi localizado no repositório, portanto este mapa não atribui achados a ele.

## 2. Componentes e responsabilidades

| Componente | Estado em `master` | Responsabilidade ou limite |
|---|---|---|
| QuantConnect LEAN | **Existente** | Motor open source de algoritmos, dados, carteira, ordens, backtest e operação suportados pelos seus componentes. Deve permanecer o motor; preservar licença Apache-2.0 e atribuições. |
| `Launcher` | **Existente** | Inicializa handlers, obtém um job, configura ambiente e inicia `Engine`. A configuração de exemplo usa `backtesting`; isso não é um controle de segurança para a futura plataforma. |
| `Engine` | **Existente** | Orquestra a execução do algoritmo e handlers de dados, resultados, transações e tempo real. |
| `Algorithm`, `Algorithm.Framework`, `Algorithm.CSharp`, `Algorithm.Python`, `AlgorithmFactory` | **Existentes** | Interfaces e implementações de algoritmos, modelos do Framework e carregamento de algoritmos C#/Python. |
| `Common`, `Indicators`, `Compression`, `Configuration`, `Logging` | **Existentes** | Tipos e modelos compartilhados, indicadores, compressão, configuração e logging usados pelos projetos LEAN. |
| `Brokerages` / `IBrokerage` | **Existente, escopo limitado** | Abstração de corretora e implementações `BacktestingBrokerage` e `PaperBrokerage` encontradas no checkout. Não foi encontrado conector B3 ou Genial. A abstração não prova compatibilidade operacional com qualquer mercado ou corretora. |
| `Api` | **Existente, não é a API do produto** | O projeto declara ser um SDK C# para interação com QuantConnect.com. Não é backend HTTP próprio nem contrato para o frontend desta plataforma. |
| `Queues`, `Messaging`, `Report`, `Optimizer`, `Optimizer.Launcher`, `Research`, `ToolBox`, `DownloaderDataProvider` | **Existentes** | Projetos de suporte do LEAN. A presença de um projeto não implica que a plataforma própria já os integre ou ofereça suas funções a usuários. |
| `Tests` | **Existente** | Suíte de testes do código LEAN; não comprova integração da futura plataforma. |
| Frontend próprio | **Proposto** | Interface independente de implementação e ciclo de vida do LEAN; não encontrado no baseline. |
| API/backend e coordenador de execução próprios | **Propostos** | Autenticação, autorização, validação, idempotência, controle de concorrência, despacho e reconciliação entre produto e runner LEAN; não encontrados no baseline. |
| Adaptador/runner de plataforma | **Proposto; transporte pendente** | Isola o contrato do produto das interfaces de inicialização do LEAN. Processo, protocolo, hospedagem e isolamento precisam de decisão e validação antes de implementar. |
| Supabase independente | **Planejado, não integrado** | Projeto novo de persistência e controle, apenas por contrato futuro. Nenhuma referência ou integração Supabase foi encontrada. Projeto, esquema, políticas, RLS e credenciais não são definidos nem alterados pelo P01. |
| Conector B3/Genial e execução real | **Não existentes no escopo verificado; bloqueados** | Compatibilidade futura é requisito de avaliação, não capacidade atual. Exige validação de APIs, dados, regras de mercado, homologação e autorização explícita separadas. |

### Dependências observadas

O `Launcher` referencia `Engine` e diversos projetos LEAN, incluindo `Api`, `Brokerages`, `Configuration`, `Queues` e `Messaging`. O `Engine` referencia algoritmos, `Api`, `Brokerages`, `Configuration`, `Common`, `Logging` e `Indicators`. Os projetos de engine, launcher e API declaram `net10.0` nos respectivos `.csproj`. Esta é uma descrição seletiva das referências observadas, não um grafo completo de dependências.

## 3. Arquitetura proposta

```text
Pessoa usuária
      |
      v
Frontend próprio (proposto; sem privilégios de execução)
      | HTTPS / contrato versionado
      v
API + autorização + coordenador (propostos)
      |                 \
      |                  \ contrato de persistência futuro
      v                   v
Adaptador/runner       Supabase independente
      |
      v
LEAN Launcher -> LEAN Engine -> handlers de dados, algoritmo,
                                transações, resultados e tempo real
      |
      +----> resultados/status observados de volta ao coordenador
```

O diagrama representa uma fronteira proposta, não uma topologia instalada. O frontend não deve acessar o runner nem credenciais privilegiadas do Supabase diretamente. O backend é o único componente proposto para autorizar comandos e coordenar estado persistido com estado observado do engine. O transporte até o LEAN e o mecanismo de fila permanecem decisões em aberto.

## 4. Domínio, fontes de verdade e fluxos

### Domínio proposto

- **Estratégia:** código, parâmetros e metadados. Uma execução deve referenciar uma versão imutável do artefato e seus parâmetros normalizados; edição posterior não altera uma execução aceita.
- **Execução:** intenção autorizada de rodar uma estratégia em modo e ambiente definidos, com identificador, chave de idempotência e trilha de eventos.
- **Modo:** `BACKTEST` ou `PAPER` na primeira fase. `REAL` é proibido por padrão, não selecionável pelo frontend e não despachável pelo backend até homologação e autorização futura explícitas.
- **Resultado:** saída produzida pelo LEAN, vinculada à execução e à versão do artefato. Métricas não devem ser apresentadas como garantia de desempenho ou precisão.
- **Ordem, carteira e evento de corretora:** conceitos pertencentes ao runtime/adapter LEAN. O estado de produto não pode substituir a confirmação do engine ou de uma corretora.

### Fontes de verdade propostas

Não há ainda uma fonte de verdade de plataforma implementada. No desenho futuro:

1. **Registro de controle:** persistência independente contratada (Supabase proposto) para identidade/escopo do produto, estratégia versionada, requisições e eventos auditáveis. A escolha de esquema e autorização fica para pacote próprio.
2. **Estado operacional:** o LEAN/runner é fonte dos eventos e do estado observado do processo, algoritmo, ordens e resultados que efetivamente produziu. Uma linha persistida como `RUNNING` não prova que o processo continua ativo.
3. **Reconciliação:** o coordenador compara estado desejado e eventos observados. Divergência ou perda de comunicação resulta em `OUTCOME_UNKNOWN`, bloqueia novo despacho conflitante e exige reconciliação; não deve ser convertida silenciosamente em sucesso, falha ou cancelamento.
4. **Mercado:** fonte, licença, cobertura, qualidade e latência dos dados precisam ser identificadas por execução. O repositório não certifica dados de B3 nem dados em tempo real.

### Fluxo proposto

1. Frontend envia intenção autenticada à API; nunca inicia processo LEAN diretamente.
2. API autentica o ator, autoriza o escopo, valida modo, parâmetros, versão do artefato, limites e chave de idempotência.
3. Coordenador persiste a aceitação e emite um comando correlacionado ao runner; aceitação HTTP não significa que o engine iniciou.
4. Runner inicia LEAN somente em ambiente permitido e devolve eventos identificados por execução e sequência.
5. Coordenador persiste eventos/resultados, publica estado derivado e reconcilia após término, falha, timeout ou perda de conexão.
6. Pedido de parada e kill switch bloqueiam novos despachos antes de solicitar parada aos processos ativos. Só confirmação observável fecha a execução; parada não confirmada permanece incerta e escalada.

## 5. Riscos e lacunas

| Risco/lacuna | Evidência e impacto | Tratamento obrigatório antes da implementação pertinente |
|---|---|---|
| Rótulo de risco PES | O resumo público pede classificação R0–R4, mas não define a escala e o original privado não foi lido. Não atribuir um nível por suposição. | Proprietário valida a classificação e o contrato PES canônico antes da implementação. |
| Estado dividido API/runner/persistência | Os componentes próprios ainda não existem; uma desconexão pode deixar o resultado de uma execução ambíguo. | Identidade de comando, eventos duráveis, lease/concorrência e reconciliação especificados e testados. |
| Execução financeira real | LEAN inclui abstrações de execução, mas o baseline verificado não comprova conector B3/Genial, dados ou homologação. | Execução real desabilitada; aprovação específica, ambiente homologado e controles financeiros completos antes de qualquer proposta que possa enviar ordens reais. |
| Semântica de `PaperBrokerage` | Há uma implementação LEAN com esse nome, que deriva de `BacktestingBrokerage`; sua presença não comprova um serviço isolado da plataforma nem dados adequados. | Validar significado, dados, ambiente e critérios de aceitação de paper trading em pacote próprio. |
| Credenciais e configuração LEAN | `Launcher/config.json` contém chaves de configuração para integrações LEAN. O exemplo versionado não é um cofre. | Nenhum segredo no repositório/logs; desenhar gestão de segredos e separar credenciais por ambiente antes de conectar serviços. |
| Dependência/licença upstream | Repositório contém código LEAN e licença Apache-2.0. | Preservar notices/licença e isolar alterações próprias; rever impacto de cada mudança upstream. |
| Detalhes privados e P00 | O documento P00 e os protocolos privados integrais não foram encontrados nesta leitura. | Proprietário compara esta proposta com os originais e resolve divergências antes de aprovar a próxima fase. |

## 6. Evidências do baseline

- `readme.md`: identifica o projeto como LEAN, descreve-o como motor event-driven e documenta execução pelo launcher/CLI.
- `QuantConnect.Lean.sln`: enumera os projetos LEAN presentes no baseline.
- `Launcher/Program.cs`: inicialização, aquisição de job, configuração e chamada do engine.
- `Launcher/QuantConnect.Lean.Launcher.csproj`, `Engine/QuantConnect.Lean.Engine.csproj`, `Api/QuantConnect.Api.csproj`: dependências, `net10.0` e descrição do projeto `Api` como SDK C# para QuantConnect.com.
- `Engine/Engine.cs`, `Engine/TransactionHandlers/ITransactionHandler.cs`, `Engine/DataFeeds/IDataFeed.cs`: orquestração do engine e interfaces internas de dados/transações.
- `Common/Interfaces/IBrokerage.cs`, `Brokerages/Backtesting/BacktestingBrokerage.cs`, `Brokerages/Paper/PaperBrokerage.cs`: interface de corretora e implementações de backtest/paper observadas.
- `Launcher/config.json`: configuração de exemplo do launcher; valores sensíveis não são replicados nesta documentação.
- `.github/copilot-instructions.md` e `docs/governance/REGRAS-PUBLICAS.md`: limites de fase, preservação do LEAN, Supabase independente, segurança financeira e processo público.
- Busca textual por `Supabase`, `Genial`, `B3`, `frontend` e `web app` não revelou integração de produto no código/documentação consultados. A ausência na busca não prova impossibilidade futura.

## 7. Decisões pendentes

São necessárias decisões explícitas sobre identidade/autorização, stack e hospedagem da API, transporte/isolamento do runner, versionamento dos artefatos, contrato e projeto Supabase, fontes/licenças de dados, política de retenção e limites operacionais. ADRs neste pacote são propostas para revisão; não aprovam essas decisões nem autorizam código.
