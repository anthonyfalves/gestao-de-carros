# Plano de Execução para Autenticação via CPF integrada ao Active Directory

## 1. Levantamento e pré-requisitos
- [ ] Confirmar com a equipe de infraestrutura o domínio AD disponível, o formato do `userPrincipalName` e quais atributos contêm o CPF (ex.: `extensionAttribute`, `employeeID`).
- [ ] Mapear no banco atual quais tabelas/colunas armazenam login e CPF. Caso não exista, planejar migração para adicionar campo de CPF único em `backend/src/models`.
- [ ] Solicitar credenciais de serviço (client ID/secret ou usuário técnico) para bind LDAP ou Azure AD (via OAuth2) e acesso de leitura ao diretório.
- [ ] Garantir conectividade segura (VPN/Tunnel TLS) entre o backend (`backend/src/server.js`) e o controlador de domínio ou endpoint Graph.

## 2. Modelagem de dados e migrações
- [ ] Criar/ajustar migration em `backend/migrations` para adicionar campo `cpf` (string 11) único na tabela de usuários.
- [ ] Atualizar model `User` em `backend/src/models` para validar CPF (regex) e garantir unicidade.
- [ ] Atualizar seeders e serviços associados para preencher CPF e sincronizar com AD quando necessário.

## 3. Integração com Active Directory
- [ ] Decidir estratégia:
  - **LDAP tradicional**: usar biblioteca como `ldapjs` (Node) para bind e busca por CPF -> recuperar `sAMAccountName`.
  - **Azure AD / Microsoft Graph**: usar OAuth2 client credentials e chamar endpoint `/users?$filter=extensionAttribute1 eq '{cpf}'`.
- [ ] Implementar módulo em `backend/src/services` para resolver CPF -> credenciais AD, com caching e tratamento de erros.
- [ ] Armazenar `sAMAccountName`/UPN no banco para auditoria e eventual sincronização futura.

## 4. Fluxo de autenticação
- [ ] Atualizar controller de login (`backend/src/controllers/auth.js` ou equivalente) para receber CPF e senha.
- [ ] Passos do fluxo:
  1. Validar formato do CPF (máscara, dígitos verificadores).
  2. Usar serviço AD para encontrar usuário AD associado ao CPF.
  3. Efetuar bind/autenticação no AD com o login resolvido e a senha informada.
  4. Se sucesso, carregar/perfilar usuário local (perfis, permissões) e emitir JWT ou sessão.
  5. Em caso de falha, registrar tentativa e retornar erro genérico.
- [ ] Atualizar middlewares (ex.: `backend/src/middleware/auth`) para refletir mudanças se necessário.

## 5. Sincronização e fallback
- [ ] Criar job (cron ou comando manual) em `backend/src/services` para sincronizar atributos de AD (nome, e-mail) com base no CPF.
- [ ] Definir política para usuários sem CPF no AD (bloquear ou solicitar ajuste).
- [ ] Implementar auditoria/logs para rastrear discrepâncias entre AD e base local.

## 6. Frontend e UX
- [ ] Ajustar tela de login em `frontend` para aceitar somente CPF (com máscara e validação).
- [ ] Atualizar mensagens para orientar que CPF usa mesma senha do AD.
- [ ] Incluir indicadores de esqueci-minha-senha (redirecionar para fluxo corporativo).

## 7. Segurança e conformidade
- [ ] Garantir que CPF esteja criptografado/mascarado em logs e respostas.
- [ ] Implementar rate limiting e monitorar tentativas de login para proteger AD.
- [ ] Alinhar com LGPD: obter base legal e registrar consentimentos se necessário.
- [ ] Testar cenários de bloqueio de conta AD e refletir no sistema local.

## 8. Testes e implantação
- [ ] Escrever testes unitários para validação de CPF e serviço AD mockado.
- [ ] Criar testes de integração simulando resposta LDAP/Graph.
- [ ] Executar testes end-to-end cobrindo login, sincronização e fallback.
- [ ] Planejar implantação gradual (staging -> produção) e monitoramento pós-go-live.

## 9. Documentação e treinamento
- [ ] Documentar variáveis de ambiente (ex.: `AD_URL`, `AD_BIND_DN`, `AD_BIND_PASSWORD`) no `README.md` e `backend/.env.example`.
- [ ] Treinar suporte/operadores sobre novo fluxo e resolução de incidentes.
- [ ] Atualizar runbooks com passos de troubleshooting LDAP/Graph.
