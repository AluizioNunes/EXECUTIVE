# itfact-executive

Aplicação com:

- Frontend (React + Vite) servido via Nginx
- Backend (NestJS) na porta 3000
- PostgreSQL 15 e MongoDB 7

## Docker Desktop (localhost)

O [docker-compose.yml](file:///d:/PROJETOS/EXECUTIVE/docker-compose.yml) já define o projeto como `itfact-executive`, então no Docker Desktop os containers aparecem agrupados nessa stack/projeto.

### Subir a stack

```bash
docker compose up -d --build
```

### Ver status e logs

```bash
docker compose ps
docker compose logs -f --tail=200
```

### Derrubar a stack

```bash
docker compose down
```

### Reset completo (apaga volumes)

```bash
docker compose down -v
```

## Endpoints

- Frontend: http://localhost
- Backend: http://localhost:3000
