# Admin API - Fabis Lacos

O painel administrativo nao le mais o Firestore direto pelo navegador. Ele chama rotas em `/api/admin/*`, e essas rotas usam Firebase Admin SDK no servidor.

## Variaveis de ambiente

Configure no Vercel ou servidor:

```env
FIREBASE_PROJECT_ID=fabis-lacos
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fabis-lacos.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

A `FIREBASE_PRIVATE_KEY` deve manter as quebras de linha como `\n`.

## Rotas

- `GET /api/admin/pedidos`
- `PATCH /api/admin/pedidos/:id`
- `DELETE /api/admin/pedidos/:id`
- `GET /api/admin/produtos`
- `POST /api/admin/produtos`
- `PATCH /api/admin/produtos/:id`
- `DELETE /api/admin/produtos/:id`
- `GET /api/admin/notifications`
- `PATCH /api/admin/notifications/:id`
- `GET /api/admin/clientes`
- `GET /api/admin/configuracoes`
- `GET /api/admin/order-logs?orderId=...`

As rotas nao pedem login, senha ou chave administrativa. O navegador chama `/api/admin/*`, e o servidor usa Firebase Admin SDK para ler e atualizar o Firestore.

## Regras do Firestore

Use `firestore.rules`. O admin nao depende dessas regras porque acessa via Firebase Admin SDK no backend. As rules deixam `produtos`, `categorias`, `banners`, `slides` e `colecoes` publicos somente para leitura; `pedidos` e `orders` aceitam apenas `create` com formato basico de pedido e bloqueiam leitura/edicao/exclusao publicas.
