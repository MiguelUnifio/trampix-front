# Trampix (front-end)

Plataforma que conecta clientes a prestadores de serviços de reforma e manutenção residencial
(pedreiro, pintor, encanador, eletricista…). Este repositório tem **somente o front-end Angular**.

> **Modo demonstração:** não há servidor. As chamadas `/api/...` são respondidas por um "back falso"
> dentro do próprio Angular (`src/app/core/mock/`), com as mesmas regras de negócio da API original
> (conflito de agenda, cálculo de preço, transições de status, permissões…). Os dados ficam no
> `localStorage` do navegador: o que for cadastrado continua lá ao recarregar a página.

## Contas de exemplo

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@trampix.local` | `AdminTrampix123!` |
| Cliente | `usuario@trampix.local` | `UsuarioTrampix123!` |
| Prestador | `carlos@trampix.com` | `Trampix123!` |

Outros prestadores (`roberto@`, `andre@`, `fernando@`, `marcos@`, `lucas@`, `paulo@`, `ricardo@`,
`marina@trampix.com`) e clientes (`ana@`, `joao@trampix.com`) usam a senha `Trampix123!`.
A tela de login tem atalhos para preencher essas contas e um link **"Restaurar dados de exemplo"**.

## Rodar localmente

```bash
npm install
npm start        # http://localhost:4200
npm run build    # saída em dist/trampix/browser
```

Requer Node 22 (veja `.nvmrc`).

## Publicar (GitHub → Vercel)

1. Suba esta pasta para um repositório no GitHub (a raiz do repositório deve ser a pasta que contém `package.json`).
2. Na Vercel: **Add New → Project** e importe o repositório.
3. Deixe as configurações padrão: o `vercel.json` já define o build (`npm run build`), a pasta de saída
   (`dist/trampix/browser`) e o redirecionamento de todas as rotas para `index.html` (necessário para o roteamento do Angular).
4. **Deploy**. Não é preciso configurar variável de ambiente nem API.

## Requisitos da disciplina

**1. Configuração e interface**
- Angular com `standalone: false` e organização por módulos (`NgModule`): `AppModule`, `LayoutModule`,
  `HomeModule`, `LoginModule`, `ClientesModule`, `ServicosModule`, `PedidosModule`, `DashboardModule`, etc.
- Roteamento habilitado (`app-routing-module.ts` e um `*-routing-module.ts` por módulo, com lazy loading).
  SSR/SSG desabilitado (sem `@angular/ssr`, bootstrap por `platformBrowser`).
- Angular Material em todas as telas (`MatButton`, `MatFormField`, `MatSelect`, `MatCard`, `MatMenu`, `MatSnackBar`, `MatIcon`…).

**2. Funcionalidades**
- **Entidades relacionadas (6):** Usuário, Prestador, Categoria/Subcategoria, Serviço, Disponibilidade e Contratação.
- **CRUD completo:**
  - Categorias e subcategorias (admin): `/gestao-categorias`
  - Serviços do prestador: `/meus-servicos`
  - Conta do usuário (cadastro, edição, desativação): `/clientes/cadastro` e `/minha-conta`
  - Disponibilidade semanal do prestador: `/minha-disponibilidade`
- **Dashboard com 5 KPIs** calculados a partir dos dados: usuários, prestadores, serviços ativos,
  pedidos pendentes e contratações concluídas — `/dashboard`.
- **Fluxo principal de ponta a ponta:** cadastrar-se → (virar prestador, publicar serviço e informar
  disponibilidade) → buscar o serviço na home → solicitar → o prestador aceita, recusa ou faz
  contraproposta → o cliente aceita a contraproposta → o prestador conclui. Tudo em `/pedidos`.

### Roteiro rápido para testar o fluxo

1. Entre como **Cliente** e abra um serviço na home → **Solicitar serviço** (escolha uma data em dia útil).
2. Abra **Meus pedidos** e veja o pedido como *Pendente*.
3. Saia e entre como **Prestador** (o prestador do serviço escolhido) → **Pedidos recebidos** → *Aceitar*.
4. O pedido passa para *Aceita*; o prestador pode *Concluir* na data de início ou depois.
5. Entre como **Administrador** para ver **Categorias** e o **Dashboard** mudando.

## Estrutura

```
src/app/
  core/            modelos, serviços de API, interceptors, guards e utilitários
  core/mock/       back falso (banco no localStorage + regras de negócio)
  home/ login/ clientes/ servicos/ pedidos/ dashboard/ ...   módulos de tela
```

Para voltar a usar uma API real: remova `backendFalsoInterceptor` de `src/app/app-module.ts` e
ajuste `apiUrl` em `src/environments/environment*.ts`.
