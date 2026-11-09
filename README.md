# Backoffice · Roupa de Domingo

Painel interno de pedidos da loja Roupa de Domingo. É por aqui que a dona da loja produz, embala e posta os pedidos pelos Correios:

- **Painel** (`/`): resumo da linha de produção (a produzir → em produção → embalado → postado → entregue), pedidos aguardando pagamento, problemas/devoluções e vendas de hoje e dos últimos 30 dias.
- **Pedidos** (`/orders`): lista por etapa, com busca, período e paginação. Os filtros ficam na URL. Selecione vários pedidos e use "Imprimir etiquetas".
- **Detalhe do pedido** (`/orders/:number`): cliente (CPF mascarado), endereço pronto para copiar, itens com texto personalizado, valores, pagamento, nota fiscal, histórico e o painel de expedição (mudança de etapa, código de rastreio, dados do pacote e notas internas).
- **Produção** (`/production`): lista de produção agrupada por produto, pronta para imprimir, com o botão "Iniciar produção de todos".
- **Etiquetas** (`/labels?orders=RD-1,RD-2`): etiqueta de endereço 10×15 cm (térmica) ou A4 com 4 por folha, Declaração de Conteúdo e romaneio.

Stack: Vite 5 + React 18 + TypeScript (strict) + react-router-dom 6 + axios. Estilos em CSS puro com a paleta da marca. Mesmas versões da loja (`frontend-roupa-de-domingo`).

## Rodando localmente

Pré-requisitos: Node 20+ e o backend (`backend-roupa-de-domingo`) rodando em `http://localhost:3333`.

```bash
npm install
npm run dev        # http://localhost:5274
```

- O Vite usa a porta **5274** com `strictPort`: se ela estiver ocupada, ele falha em vez de subir em outra porta. A loja usa a 5273.
- Em dev, `/api` é repassado para `http://localhost:3333` (proxy do Vite). Como a API fica na mesma origem, o cookie de sessão (`rd_session`, httpOnly) funciona sem configurar CORS.

Outros comandos:

```bash
npm run typecheck  # checagem de tipos
npm run build      # build de produção em dist/
npm run preview    # serve o dist/ na 5274
```

## Variáveis de ambiente

Copie `.env.example` para `.env` se quiser mudar algo. O Vite embute essas variáveis no build.

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | URL base da API. Deixe `/api` (mesma origem: proxy do Vite em dev, nginx em produção). |
| `VITE_STOREFRONT_URL` | `http://localhost:5273` | Origem da loja. As fotos dos produtos (`/products/...`) são servidas por ela. |
| `API_PROXY_TARGET` | `http://localhost:3333` | Só em dev: para onde o Vite repassa `/api`. |

Nenhum segredo vai para o frontend. A sessão fica num cookie httpOnly definido pelo backend; o backoffice não guarda token. O `localStorage` guarda só a preferência de formato das etiquetas.

## Deploy no Railway (serviço próprio)

O backoffice é um **serviço separado** da loja no mesmo projeto do Railway. O deploy segue o mesmo padrão da loja:

1. Crie um serviço novo apontando para este diretório (Root Directory = `backoffice`). O `railway.json` seleciona o `Dockerfile.railway`.
2. Variáveis do serviço:
   - `VITE_STOREFRONT_URL`: domínio público da loja, por exemplo `https://roupadedomingo.com.br` (sem barra no final). Vira build arg do bundle e também a origem liberada no `img-src` da CSP do nginx.
   - `BACKEND_INTERNAL_URL`: endereço do backend na rede privada do Railway. O padrão é `http://backend-roupa-de-domingo.railway.internal:8080`.
   - `VITE_API_URL`: opcional, padrão `/api`.
3. Gere um domínio público para o serviço (por exemplo `admin.roupadedomingo.com.br`).

Como funciona a imagem:

- **Build:** Node 20 roda `npm ci` e `npm run build`.
- **Runtime:** nginx 1.27 serve o `dist/` e repassa `/api/` ao backend pela rede privada. Não precisa de CORS.
- **Domínio do backend:** o backend não precisa de domínio público para o backoffice.
- **HTTPS:** o nginx redireciona para HTTPS, exceto o healthcheck do Railway.
- **Cabeçalhos:** a CSP é restritiva. Também saem `X-Robots-Tag: noindex` e um `robots.txt` que bloqueia tudo, para o painel ficar fora dos buscadores.

**CSP e domínio da loja.** O `img-src` da CSP vem de `nginx/security-headers.inc.template`. O valor é substituído no start do container pela variável `STOREFRONT_ORIGIN`, que por padrão recebe o `VITE_STOREFRONT_URL` do build. Se a loja mudar de domínio:

1. Atualize `VITE_STOREFRONT_URL`.
2. Faça um novo deploy.

Sem isso, as fotos dos produtos ficam bloqueadas pela CSP.

## Criando um administrador

A equipe do backoffice fica numa tabela própria do backend, `admin_users`, separada dos clientes da loja. Conta de cliente não entra no backoffice, e vice-versa.

Os admins são criados pelo seed `seed:admin` do backend. A senha nunca fica no código:

- **Produção (Railway, serviço do backend):** defina `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_INITIAL_PASSWORD` e faça um deploy. O seed roda no start e cria o admin se ele ainda não existir. Depois do primeiro deploy, apague `ADMIN_INITIAL_PASSWORD`.
- **Local:** na pasta do backend, `ADMIN_EMAIL=... ADMIN_INITIAL_PASSWORD=... npm run seed:admin`. Com `-- --reset-password`, também troca a senha de um admin que já existe. O `npm run seed` de desenvolvimento já cria `admin@roupadedomingo.com` (senha `domingo123`).

## Login com código por e-mail

Depois do e-mail e da senha, o backend envia um **código de 6 dígitos para o e-mail da conta** (via Resend/SMTP), e o backoffice pede esse código.

- O código vale 15 minutos e serve uma vez só.
- Depois de 5 tentativas erradas, o código é invalidado. Use "Reenviar código" para receber outro.
- A sessão do backoffice usa um cookie próprio (`rd_admin_session`), independente da sessão de cliente da loja.
- **Requisito:** o SMTP do backend precisa estar configurado (`MAIL_DRIVER=smtp` e as variáveis do Resend). Sem ele, o código não chega e ninguém entra no backoffice.
- Em desenvolvimento dá para desligar a exigência com `ADMIN_LOGIN_CODE_REQUIRED=false` no backend. Com `MAIL_DRIVER=log`, o código aparece no console da API.

## Etiquetas e impressão

- **Térmica 10×15 cm:** uma etiqueta por página (`@page` 100×150 mm, margem zero). Na janela de impressão, escolha a impressora térmica e "Tamanho real" (sem ajustar à página).
- **A4:** 4 etiquetas por folha, com linhas de corte.
- **Declaração de Conteúdo e romaneio:** sempre em A4, um de cada por pedido. Se a impressora térmica não aceitar páginas A4, faça em duas impressões:
  1. imprima só as etiquetas, com os dois documentos desmarcados;
  2. imprima os documentos numa impressora comum.
- **Marcação de impressão:** abrir a tela de etiquetas marca os pedidos como "etiqueta impressa" no backend (`labelPrintedAt`).
- **Remetente:** se o endereço do remetente não estiver configurado no backend, a tela mostra um aviso.
# backoffice-roupa-de-domingo
