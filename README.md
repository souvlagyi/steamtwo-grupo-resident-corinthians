# SteamTwo - versão do grupo

Projeto acadêmico que integra React, Express e PostgreSQL para acompanhar jogos de Steam e Epic Games. Esta versão acrescenta uma biblioteca pessoal persistente, um comparador de jogos e um carregamento local de dados de demonstração.

> Repositório de entrega: https://github.com/souvlagyi/steamtwo-grupo-resident-corinthians. Antes da entrega, execute a migração e o seed na instância PostgreSQL do grupo e inclua a evidência de saúde conectada no relatório.

## Melhorias do grupo

- **Minha biblioteca:** cada jogo pode ser salvo como “Quero jogar”, “Jogando” ou “Concluído”, com uma nota de até 280 caracteres. No PostgreSQL, os dados ficam na tabela `game_library`.
- **Comparação entre jogos:** o usuário escolhe dois ou três jogos e visualiza índice, popularidade histórica, tendência, lojas e gêneros lado a lado. A API expõe `GET /api/compare`.
- **Dados de demonstração para o banco:** `npm run db:seed` popula o catálogo e os rankings com dados locais, permitindo comprovar a cadeia interface → API → PostgreSQL sem depender de credenciais externas de Twitch/IGDB.
- **Testes dos recursos novos:** a suíte valida comparação, inclusão, atualização, remoção e rejeição de dados inválidos da biblioteca.

Veja os detalhes técnicos em [`docs/MELHORIAS_DO_GRUPO.md`](docs/MELHORIAS_DO_GRUPO.md).

## Arquitetura

```text
React/Vite → rotas Express → serviços → repositórios SQL (pg) → PostgreSQL
```

Quando `DATABASE_URL` está configurada, a API consulta e grava no PostgreSQL. Sem essa variável, o projeto entra em modo de demonstração com dados em memória; esse modo é útil para explorar a interface, mas não substitui a verificação do banco.

## Execução local

Requisitos: Node.js 20+ e PostgreSQL 17 (ou Docker).

```bash
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
```

Em dois terminais:

```bash
npm run dev:api
npm run dev
```

- Interface: `http://127.0.0.1:5173/`
- Saúde da API: `http://127.0.0.1:3001/api/health`

Para usar um PostgreSQL já instalado, atualize somente o `DATABASE_URL` no arquivo `.env`. Não envie esse arquivo ao GitHub: ele está no `.gitignore`.

## Endpoints do grupo

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/api/compare?slugs=jogo-a,jogo-b` | Compara dois ou três jogos do catálogo. |
| `GET` | `/api/library` | Lista a biblioteca do perfil local. |
| `PUT` | `/api/library/:slug` | Salva status e nota de um jogo. |
| `DELETE` | `/api/library/:slug` | Remove um jogo da biblioteca. |

## Verificação

```bash
npm test
npm run build
npm run test:sites
```

O banco pode ser revertido uma migração por vez com `npm run db:rollback`.
