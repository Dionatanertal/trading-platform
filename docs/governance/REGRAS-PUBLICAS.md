# Regras públicas operacionais — Trading Platform

**Nota de escopo:** Adaptação operacional para o repositório público. NÃO contém os textos originais integrais de PES-1.0 e Protocolo SAMACON; originais permanecem guardados pelo proprietário. Não declarar que foram lidos se não estiverem disponíveis.

## Contrato mínimo PES obrigatório
Antes de cada pacote, registrar: projeto, pacote, objetivo, branch/base/HEAD, ambiente, problema, arquitetura atual, escopo positivo e negativo, componentes afetados, fluxo e domínio, modelos de dados, contrato backend/frontend, segurança/autorização, estado e concorrência, tratamento de erros, UX/UI e acessibilidade (quando aplicável), observabilidade, casos extremos, risco R0–R4, plano, testes, regressão, arquivos esperados, banco (ou N/A), rollback e critérios de aceite/Definition of Done.

## Processo obrigatório
1. Recuperar estado canônico, mapa de arquitetura e decisão anterior sem redescoberta desnecessária.
2. Auditoria somente leitura: repositório, branch, HEAD, histórico, dependências, ambiente, riscos, evidência e baseline. Não corrigir durante auditoria.
3. Definir contrato funcional completo do fluxo, fontes de verdade, escopo negativo, testes e rollback antes de codificar.
4. Isolar em branch exclusiva derivada da base aprovada; preservar branch estável.
5. Implementar menor conjunto funcionalmente coerente; sem funcionalidades oportunistas ou patches em cascata.
6. Testes estáticos, unitários, integração, funcionais e regressão conforme risco. Conferir dados e resultado reais, não só saídas verdes.
7. Preflight com diff, arquivos esperados, migrations, secrets, baseline, testes, rollback; bloquear diante de divergência.
8. Commit identificado, push somente quando autorizado, deploy controlado somente quando aplicável e autorizado.
9. Validar o fluxo ponta a ponta, versão realmente executada, persistência/estabilidade temporal, regressões e rollback funcional.
10. Emitir TXT único de evidência por pacote, atualização do mapa canônico, Nota de versão e relatório de promoção. Selar somente com prova técnica e funcional.

## Regras imutáveis desta fase
- Não tocar em qualquer projeto além de `Dionatanertal/trading-platform` e seu Supabase independente.
- Não criar tabelas, migrations, RLS, workflows, secrets nem infraestrutura sem contrato e autorização explícita.
- Não enviar ordens reais nem conectar à Genial/B3 por hipótese.
- Não instalar Docker local nem presumir que o LEAN CLI dispense Docker para backtests locais.
- Preservar upstream QuantConnect LEAN, licença e atribuição.
- Qualquer passo sem validação adequada: BLOQUEADO; nunca afirmar PASS imaginário.
