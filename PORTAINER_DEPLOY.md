# Instruções para Deploy no Portainer

## Problema Resolvido

O erro `Failed to deploy a stack: compose build operation failed: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127` foi resolvido através das seguintes correções:

1. **Correção do Dockerfile do Backend** (`Backend/NestJS/Dockerfile`):
   - Remoção da flag `--only=production` na etapa de construção para permitir a instalação das dependências de desenvolvimento necessárias para o build

2. **Correção do Dockerfile da Raiz** (`Dockerfile`):
   - Simplificação para construir apenas o frontend usando nginx como servidor web de produção
   - Remoção da construção do backend do Dockerfile da raiz, já que o backend tem seu próprio Dockerfile

3. **Criação de docker-compose.portainer.yml**:
   - Arquivo de composição otimizado especificamente para deploy no Portainer

## Passos para Deploy no Portainer

1. **Acesse o Portainer**:
   - Abra o Portainer no seu navegador
   - Faça login com suas credenciais

2. **Crie uma nova Stack**:
   - No menu lateral, clique em "Stacks"
   - Clique no botão "Add stack"
   - Escolha uma das opções:
     a. **Web editor**: Cole o conteúdo do arquivo `docker-compose.portainer.yml`
     b. **Upload**: Faça upload do arquivo `docker-compose.portainer.yml`
     c. **Repository**: Se o repositório estiver configurado, use a URL do repositório

3. **Configure as variáveis de ambiente** (opcional):
   - Na seção "Environment variables", você pode sobrescrever as variáveis padrão:
     - `POSTGRES_USER`: Usuário do PostgreSQL (padrão: postgres)
     - `POSTGRES_PASSWORD`: Senha do PostgreSQL (padrão: postgres)
     - `POSTGRES_DB`: Nome do banco de dados (padrão: executive_secretariat)
     - `JWT_SECRET`: Chave secreta para JWT (recomendado mudar em produção)
     - `ENCRYPTION_SECRET_KEY`: Chave secreta para criptografia (recomendado mudar em produção)

4. **Deploy da Stack**:
   - Clique no botão "Deploy the stack"
   - Aguarde a construção e inicialização dos serviços

5. **Verificação**:
   - Após o deploy, verifique o status dos containers na aba "Containers"
   - Os serviços devem estar com status "Running"
   - Acesse a aplicação através da porta configurada (padrão: porta 80 para frontend, 3000 para backend)

## URLs de Acesso

- **Frontend**: http://localhost (ou IP do servidor na porta 80)
- **Backend API**: http://localhost:3000 (ou IP do servidor na porta 3000)
- **Banco de Dados PostgreSQL**: localhost:5432 (acesso interno pelos serviços)

## Troubleshooting

Se ainda encontrar problemas:

1. **Verifique os logs**:
   - No Portainer, vá para a stack e clique em "Logs" para cada serviço
   - Procure por erros específicos nos logs

2. **Permissões de arquivo**:
   - Certifique-se de que o Portainer tem permissões de leitura para todos os arquivos do projeto

3. **Recursos do sistema**:
   - Verifique se há memória e espaço em disco suficientes disponíveis

4. **Versões do Docker**:
   - Certifique-se de que está usando uma versão compatível do Docker

## Configuração de Produção

Para uso em produção, recomenda-se:

1. **Alterar as senhas padrão**:
   - Definir senhas fortes para PostgreSQL
   - Configurar JWT_SECRET e ENCRYPTION_SECRET_KEY seguros

2. **Configurar SSL/TLS**:
   - Adicionar um proxy reverso (nginx) com certificados SSL
   - Configurar HTTPS para ambas as aplicações

3. **Backup do banco de dados**:
   - Configurar volumes persistentes para os dados do PostgreSQL
   - Implementar rotinas de backup regulares

4. **Monitoramento**:
   - Configurar health checks
   - Implementar logging centralizado