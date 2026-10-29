# Trading Platform — instruções permanentes do GitHub Copilot

## Identidade e limites
- Repositório: `Dionatanertal/trading-platform` (PÚBLICO nesta fase).
- Base: código-fonte QuantConnect LEAN na branch `master`. Não usar branch histórica como baseline. Preservar licença Apache-2.0, atribuições e o código upstream sem alterações não autorizadas.
- Produto: plataforma própria de trading, com LEAN como motor; frontend próprio e integrações futuras devem ser projetados antes de codificados.
- GitHub/Copilot agora; VS Code local futuramente; NÃO usar Docker local. Não inventar feed B3 nem integração Genial.
- Supabase é projeto novo e independente: sem modificar outros projetos, schemas ou dados. Não executar migrations/SQL/deploy/integração automática sem autorização específica.

## Protocolos de engenharia
Este repositório público contém um **resumo operacional público** dos protocolos PES 1.0 e SAMACON em `docs/governance/REGRAS-PUBLICAS.md`. Os dois documentos originais não estão publicados por conterem informações internas. Eles continuam sendo a fonte canônica; este resumo não os substitui. Se houver dúvida, necessidade de detalhe ausente, divergência ou tarefa crítica sem contrato, marcar BLOQUEADO e solicitar a especificação necessária sem presumir regras.

- PES: recuperar mapa canônico; requisitos -> domínio -> arquitetura -> dados -> contratos -> segurança -> UX/UI -> implementação -> testes. Sempre contrato técnico antes do código.
- SAMACON: auditoria somente leitura -> baseline -> escopo negativo -> análise sistêmica do fluxo -> isolamento -> implementação atômica -> validação -> regressão -> preflight -> commit -> push -> promoção -> validação real -> Nota de versão -> selagem.
- Sem evidência não existe PASS. Não misturar bug e melhoria; não alterar fora do escopo. Um pacote funcionalmente coerente por vez. Manter um TXT consolidado de evidências por pacote (nunca com segredos).
- Nunca desenvolver na branch estável, fazer force push, reset destrutivo, merge automático, ocultar falhas, aplicar patch em cascata ou usar build verde como prova de função.
- Códigos, branches, commits e histórico devem ser identificados e comparados; nenhuma ação remota/deploy/SQL sem autorização explícita.

## Segurança financeira — prioridade máxima
- Nenhuma ordem real, integração com conta real, movimentação financeira ou credencial no código sem consentimento específico futuro.
- Primeiro backtest e simulação/paper com dados adequados. Não atribuir precisão em tempo real a dados não auditados.
- Antes de execução de ordens: contrato para limites de posição, perdas por dia, kill switch, idempotência, latência, reconexão, dados ausentes, ordens parciais, sincronização e logs auditáveis.
- Jamais registrar tokens, senhas, chaves, conta de corretora ou segredos em código, prompt, console, commit ou TXT.

## Primeira tarefa: P00
Apenas análise read-only do código existente. Identificar branch padrão, `master`, HEAD, dependências, módulos reais, arquitetura e riscos. Não editar, abrir PR, criar branch adicional ou executar código mutável no P00. Produzir proposta de arquitetura, contrato PES e critérios de aceite. Encerrar como AUDITORIA CONCLUÍDA ou BLOQUEADO. Aguardar autorização para P01.
