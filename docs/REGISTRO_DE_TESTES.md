# Registro de testes

Data da última execução: 31/08/2026.

| Verificação | Resultado |
| --- | --- |
| Testes de domínio, API e integrações | 26 testes aprovados em 6 arquivos. |
| Build de produção | Concluído: 4.570 módulos transformados. |
| Testes da preparação para Sites | 4 de 4 aprovados. |
| PostgreSQL local desta estação | Serviço detectado, mas a senha da base existente não foi disponibilizada para este trabalho. Execute a sequência de migração e seed com o `DATABASE_URL` do grupo antes de entregar. |

## Roteiro da evidência PostgreSQL

Após obter o acesso à instância do grupo, rode:

```bash
npm run db:migrate
npm run db:seed
```

Em seguida, abra `http://127.0.0.1:3001/api/health`. A evidência válida para o PDF deve mostrar `database.status` igual a `connected`. Salve uma captura dessa resposta e uma captura da biblioteca contendo um jogo e uma nota.
