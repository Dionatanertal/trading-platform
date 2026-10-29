# Contrato arquitetural P01

**Estado:** contrato proposto para revisão. Não descreve uma API implementada nem autoriza operação.
**Baseline:** `master` em `6bdc2932fa0adda8255b4e4ed35184bae678dee3` (2026-10-29).
**Escopo de execução:** exclusivamente desenho para `BACKTEST` e `PAPER`; modo real bloqueado.

## 1. Objetivo, fronteiras e escopo

Estabelecer domínio, estados e contratos conceituais entre frontend próprio, API/coordenador propostos, persistência independente futura e LEAN. O frontend é independente do motor. LEAN continua responsável pela execução do algoritmo e pelos eventos produzidos pelo runtime. Nenhuma API, banco, frontend, adaptador ou conector próprio é declarado existente.

Supabase é apenas uma opção de persistência e controle de um projeto novo e independente, acessado por contrato futuro. Este documento não especifica nem autoriza criação de projeto, tabelas, migrations, RLS, integração ou credenciais. O projeto `Api` que existe no LEAN é um SDK C# de cliente QuantConnect.com, não a API deste contrato.

## 2. Vocabulário e entidades propostas

| Entidade | Campos conceituais mínimos | Regra |
|---|---|---|
| `StrategyVersion` | `strategy_id`, `version_id`, referência imutável ao artefato, hash, linguagem, parâmetros permitidos | Uma execução fixa versão e parâmetros; nenhuma mutação retroativa. O formato/hash deverá ser definido antes de implementar. |
| `ExecutionRequest` | `execution_id`, `tenant_id`, `actor_id`, `strategy_version_id`, `mode`, parâmetros normalizados, instante, `idempotency_key`, estado | Imutável após aceite, exceto estado derivado e metadados de término. Identificadores/nomes aqui são conceituais. |
| `ExecutionEvent` | `execution_id`, sequência, tipo, instante, origem, correlação, payload sanitizado | Append-only; eventos repetidos são deduplicados pela identidade/seq do emissor e não podem retroceder o estado. |
| `ExecutionResult` | `execution_id`, referência/versão de artefato de resultados, resumo, período e proveniência dos dados | Resultados são do engine, não prova de retorno futuro ou execução real. |
| `RiskControlState` | escopo do bloqueio, estado do kill switch, limites efetivos, versão da política | Sempre avaliado no servidor/coordenador, independente da validação visual no frontend. |

Segredos, tokens, senhas, identificadores de conta ou dados financeiros pessoais não fazem parte do payload de logs nem da resposta comum do frontend. Necessidades futuras de conexão real exigem contrato e autorização independentes.

## 3. Modos permitidos e máquina de estados

### Modos

- `BACKTEST`: execução histórica com fonte/período de dados explicitados; cobertura e qualidade dos dados devem ser exibidas como limitações.
- `PAPER`: simulação sem envio de ordens reais. A escolha de feed, brokerage simulada e semântica de fills depende de validação específica.
- `REAL`: **proibido** no P01 e bloqueado por padrão em todos os componentes próprios futuros. Nenhuma requisição do cliente pode habilitá-lo. Só poderá ser reconsiderado após homologação explícita e aprovação formal de todos os controles financeiros, APIs e conectores.

### Estados de orquestração da plataforma

Os estados abaixo são do produto proposto e não substituem `AlgorithmStatus`, estado de ordem ou qualquer estado LEAN. O mapeamento exato será parte do adaptador.

```text
RECEIVED -> VALIDATING -> REJECTED
                       -> QUEUED -> STARTING -> RUNNING -> RECONCILING
                                             |             |
                                             |             +-> COMPLETED
                                             |             +-> FAILED
                                             |             +-> CANCELLED
                                             |             +-> OUTCOME_UNKNOWN
                                             +-> FAILED

RUNNING -> STOP_REQUESTED -> RECONCILING
                   |              |
                   +-> OUTCOME_UNKNOWN (parada/estado não confirmados)
```

- `RECEIVED`, `VALIDATING`, `QUEUED`, `STARTING`, `RUNNING`, `STOP_REQUESTED` e `RECONCILING` são estados não terminais.
- `REJECTED`, `COMPLETED`, `FAILED`, `CANCELLED` e `OUTCOME_UNKNOWN` são terminais para a tentativa. `OUTCOME_UNKNOWN` bloqueia novo despacho conflitante até reconciliação explícita; não equivale a cancelamento.
- Apenas o coordenador autenticado altera estado de controle. O estado de runtime deriva de eventos LEAN/runner autenticados e correlacionados.
- Transições são monotônicas, versionadas e auditadas. Repetição de eventos é idempotente. Evento atrasado não reabre estado terminal; exceção exige processo de correção auditado.
- Uma resposta `202 Accepted` confirma aceite durável da requisição, não início, sucesso, fill ou término do algoritmo.

## 4. Contratos frontend ↔ API ↔ runner

Os nomes abaixo são operações conceituais para orientar um contrato HTTP versionado; nenhum endpoint existe por este documento.

### Frontend → API

1. **Criar execução:** `POST /v1/executions`, autenticação obrigatória, `Idempotency-Key` obrigatório e corpo contendo `strategy_version_id`, `mode`, parâmetros, referência/período de dados quando aplicável e uma versão explícita de política. Não aceita `REAL`.
2. **Consultar execução:** `GET /v1/executions/{execution_id}` retorna estado observado, modo, versão, horários, erro público e resumo de resultado autorizado.
3. **Listar eventos:** `GET /v1/executions/{execution_id}/events` usa cursor/seq estável e respeita autorização do tenant.
4. **Solicitar parada:** `POST /v1/executions/{execution_id}/stop` é uma intenção autenticada, auditada e idempotente; não promete que o processo já parou.
5. **Consultar controles:** endpoint futuro read-only expõe se novas execuções estão habilitadas e restrições efetivas. A mutação do kill switch nunca é feita pelo browser diretamente.

Toda resposta inclui `request_id`; resposta de execução inclui `execution_id`, estado, modo, `created_at`, versão do contrato e indicação de resultado eventualmente incompleto. O esquema JSON, paginação, autenticação concreta e negociação de versões devem ser fechados antes da implementação.

### API/coordenador → runner LEAN

O comando proposto é assinado/autenticado no canal serviço-a-serviço e contém apenas identificadores opacos, modo permitido, artefato imutável/hash, parâmetros já validados, configuração permitida, política vigente, deadline e correlation/idempotency IDs. Não transporta credenciais em claro, nem permite o runner escolher modo mais permissivo.

O runner aceita ou rejeita o comando e emite eventos sequenciados de inicialização, estado, saída, falha, pedido/resultado de parada e término. Payloads são limitados e validados. O contrato de processo/transporte, heartbeat, lease, isolamento, timeout e recuperação não foi escolhido. O runner não decide autorização de usuário e não é substituto do coordenador.

### API/coordenador → persistência independente

O backend usa interface server-to-server mínima e documentada para persistir requisições aceitas, versões, eventos, estados de controle e auditoria. O browser não recebe credenciais privilegiadas nem grava diretamente estado de execução. Isolamento por tenant, permissões, política de retenção, concorrência transacional e estratégia de RLS (se aplicável) precisam de desenho, aprovação e testes separados antes de ligar Supabase.

## 5. Autorização e segurança

- Autenticar cada chamada à API e autorizar no servidor ator, tenant, ação e recurso; nunca confiar em ID enviado pelo cliente como prova de propriedade.
- Separar permissões de leitura, edição de estratégia, criação de backtest/paper, parada e administração de controles. Papéis concretos e fluxo de elevação/autenticação forte são pendentes de decisão.
- Negar por padrão. Backend, coordenador e runner verificam modo permitido e política vigente; validação no frontend é somente UX.
- Desabilitar `REAL` por ausência de caminho configurado, não por flag editável pelo usuário. A homologação futura deve usar autorização explícita, configuração independente e provas de isolamento do modo.
- Limitar taxa, tamanho de payload, tempo, CPU, memória, simultaneidade, histórico e armazenamento antes de aceitar execução. Valores numéricos dependem de benchmark e política aprovada.
- Isolar processos/artefatos de algoritmo de credenciais e serviços de controle. Nunca disponibilizar tokens de API, segredos Supabase ou credenciais de corretora ao código do algoritmo ou ao navegador sem contrato específico.
- Restringir saída de rede do runner por política aprovada; execução real e destinos desconhecidos permanecem bloqueados.
- Segredos somente em mecanismo de gestão aprovado; nunca em Git, payloads, logs, prints de exceção ou TXT de evidências.

## 6. Limites financeiros, concorrência e idempotência

Antes de qualquer execução paper/real que represente um fluxo de ordens, a política server-side deverá especificar e provar: exposição/posição máxima por instrumento e carteira, perda máxima diária, limite de ordens e notional, horário/mercado permitido, dados ausentes/atrasados, limites de latência, reconexão, ordens parciais, rejeições, divergência entre fills e carteira e procedimento de escalonamento. Os valores são configuração aprovada e versionada, nunca inferidos pelo algoritmo ou UI.

- **Kill switch:** estado durável e auditado por escopo; primeiro bloqueia novas aceitações/despachos, depois emite stop/cancel conforme a capacidade validada do runner. Mantém bloqueio até reabertura autorizada. A interface mostra `stop requested` versus `confirmed stopped`; desconexão ou timeout nunca contam como confirmação. Em fluxo real futuro, cancelamento de ordens e exposição remanescente exigem procedimento próprio.
- **Limite operacional:** verificado no servidor antes do despacho e durante a execução quando a fonte de sinais permitir. Ausência ou divergência de estado, limite ou feed bloqueia novas ações e inicia reconciliação/escalonamento.
- **Concorrência:** adquirir atomicamente lease/slot no coordenador antes do despacho. Padrão inicial proposto: no máximo uma execução ativa para o mesmo escopo de estratégia e modo, salvo contrato futuro que permita concorrência e prove isolamento. Lease expirado não autoriza repetir comando até reconciliação.
- **Idempotência:** `Idempotency-Key` única por tenant/ator e janela contratada. Mesma chave com corpo idêntico retorna a execução original; corpo divergente é `409 IDEMPOTENCY_CONFLICT`. Unique constraint transacional e política de retenção ainda precisam de contrato de persistência.
- **Exactly-once não presumido:** entrega pode repetir; comando e eventos devem tolerar duplicatas. Antes de reenvio após timeout, consultar estado/lease e reconciliar. Resultado incerto não gera execução substituta automaticamente.
- **Reconciliação:** comparar intenção, sequência de eventos do runner e snapshot do runtime; detectar lacunas, duplicatas, estado atrasado, ordens abertas e término sem confirmação. Registrar divergências e manter bloqueio até resolução auditada.

## 7. Erros e recuperação

Envelope público proposto:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "A solicitação não atende ao contrato.",
    "retryable": false,
    "request_id": "opaque-correlation-id",
    "details": []
  }
}
```

Sem stack trace, segredos, paths internos ou mensagem bruta de corretora no cliente. Códigos mínimos: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `MODE_NOT_ALLOWED`, `RISK_LIMIT_BLOCKED`, `KILL_SWITCH_ACTIVE`, `CONCURRENCY_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `ENGINE_UNAVAILABLE`, `EXECUTION_OUTCOME_UNKNOWN` e `INTERNAL_ERROR`. `retryable` não é autorização para repetir efeito: retries só podem ocorrer conforme idempotência/reconciliação.

- Erro de validação/autorização: rejeitar antes de persistir despacho.
- Indisponibilidade antes de aceite durável: retornar erro sem sucesso aparente; cliente pode tentar novamente seguindo idempotência.
- Falha após aceite: manter `execution_id`, emitir evento e reconciliar; nunca apagar intenção ou reportar sucesso genérico.
- Falha de comunicação após despacho: `OUTCOME_UNKNOWN`, bloquear duplicação e escalar.
- Persistência indisponível: fail-closed para novas execuções; sem buffer volátil que pareça aceite durável.
- Falha/timeout no pedido de parada: manter kill switch ativo e estado incerto; alertar operador autorizado.

## 8. Observabilidade, auditoria e privacidade

Cada comando/evento propaga `request_id`, `execution_id`, identificador de correlação, tenant/ator pseudonimizados quando possível, versão do artefato, modo, política, sequência e timestamps UTC de origem/recepção. Registrar decisões de autorização, aceite/rejeição, transições, mudança de política, kill switch, despacho, heartbeat, parada, reconciliação e acesso administrativo em trilha append-only, com controle de acesso e retenção definidos antes do uso.

Métricas propostas: filas/leases, execuções por estado e modo, latência de validação/início, heartbeat atrasado, eventos ausentes/duplicados, resultados pendentes de reconciliação, violações de limite e estado do kill switch. Alertas de modo, limite ou reconciliação não dependem de logs de sucesso do processo. Redigir dados sensíveis; calibrar relógios e detectar timestamps incoerentes. Política de retenção e proteção contra alteração da trilha são pendentes de decisão.

## 9. Compatibilidade futura e bloqueios

- B3 e Genial são requisitos de compatibilidade futura a investigar; nenhum nome de API, protocolo, feed, símbolo, calendário, lote, taxa, autenticação ou conector é presumido.
- Antes de homologar dados: validar fonte, direitos/licença, cobertura, fuso/calendário, qualidade, atraso e resposta a lacunas. Não chamar dados não auditados de tempo real.
- Antes de qualquer fluxo real: aprovar contrato de corretora, conta/autorização, reconexão, ordens parciais, cancelamento, sincronização de posições, reconciliação, limites, kill switch, operação/plantão e auditoria; executar homologação sem risco financeiro e obter autorização expressa do proprietário.
- Integração real segue bloqueada mesmo que o LEAN ofereça `IBrokerage` ou outro adaptador para provedores diferentes.

## 10. Casos de aceite para a futura implementação

1. Cliente não autenticado, tenant incorreto ou papel insuficiente não cria, lista, lê ou para execução alheia.
2. Payload inválido, modo `REAL`, política ausente, kill switch ativo ou limite excedido falha fechado sem despachar para o runner.
3. Repetição da mesma chave/corpo devolve um único `execution_id`; mesma chave com corpo diferente retorna conflito.
4. Concorrência do mesmo escopo não excede a política; duplicatas e eventos fora de ordem não regridem estado.
5. `202` só ocorre após aceite durável; falha de persistência não produz sucesso.
6. Perda de conexão, timeout, lease expirado ou parada não confirmada produz estado incerto e impede reenvio automático conflitante.
7. Kill switch bloqueia novos despachos antes de solicitar parada; UI distingue pedido de confirmação.
8. Eventos e erros não expõem segredos; trilha registra ator, motivo, estado anterior/novo, política e correlação sem payload sensível.
9. Execução backtest/paper não acessa conta real nem envia ordens reais; resultado inclui versão, modo e proveniência/limites dos dados.
10. Falha de reconciliação, ordem parcial, dado ausente ou heartbeat atrasado gera alarme e comportamento fail-closed previsto.

Todos os itens são critérios propostos, não testes executados neste pacote.
