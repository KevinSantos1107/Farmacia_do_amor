# Romantic Engine

Aplicação web e PWA interativa para casais, projetada para celebrar memórias e proporcionar experiências compartilhadas com timeline de momentos, álbuns de fotos, player de música integrado, jogos síncronos em tempo real, quiz interativo, retrospectivas e mapa estelar.

---

## Stack Tecnológica e Requisitos

- **Frontend:** React 19, TypeScript 6 (modo `strict`), Vite 8, Tailwind CSS 4.
- **Estado e Efeitos:** Zustand (persistência local e estado global), Framer Motion.
- **Backend as a Service:** Firebase (Authentication, Cloud Firestore).
- **Mídia e Armazenamento:** Cloudinary (upload unsigned e streaming de imagens e áudio).
- **Testes e Qualidade:** Vitest (ambiente Node) e Oxlint.
- **Requisitos de Sistema:**
  - **Node.js:** `>= 22.12.0` (especificado em `engines` no `package.json` — exigência do Vitest 5 (`^22.12 || ^24 || >=26`) e do Firebase Admin 14 (`>=22`)).
  - **Gerenciador de Pacotes:** `npm` (utiliza `package-lock.json`).

---

## Instalação e Scripts

Instale as dependências com:
```bash
npm install
```

### Scripts Principais (`package.json`)

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local de desenvolvimento Vite (`http://localhost:5173`). |
| `npm run build` | Compila os tipos TypeScript (`tsc -b`) e gera o bundle de produção na pasta `dist/`. |
| `npm run preview` | Executa localmente o servidor de visualização do build de produção. |
| `npm test` | Executa a suíte de testes automatizados com o Vitest em modo run único. |
| `npm run lint` | Executa a análise estática de código com o Oxlint. |
| `npm run seed` | Executa o script de inicialização do Firestore e criação do usuário Super Admin (`node scripts/seed.mjs`). |
| `npm run cleanup` | Identifica e remove mídias órfãs no Cloudinary comparando com o Firestore (`node scripts/cleanup-cloudinary.mjs`). |

### Scripts Administrativos e Utilitários (`scripts/`)

Além dos comandos do `package.json`, os seguintes scripts utilitários estão disponíveis para execução via Node.js:

| Script | Como Executar | Descrição |
| :--- | :--- | :--- |
| **Geração de Ícones PWA** | `node scripts/generate-icons.mjs` | Gera os ícones PWA `public/icon-192.png` e `public/icon-512.png` otimizados via Sharp a partir de `assets-src/icon-original.png`. |
| **Geração de Tokens** | `node scripts/generateTokens.mjs` | Gera pares de tokens hexadecimais aleatórios (32 caracteres) para vincular jogadores no Firestore. |
| **Atualização de Senha Admin** | `node scripts/update_password.mjs` | Altera a senha de acesso de um usuário administrador no Firebase Auth utilizando o Firebase Admin SDK. |
| **Migração de Dados Legados** | `node scripts/migrate_data.mjs` | Migra registros antigos de coleções da raiz do Firestore para as subcoleções sob `sites/<site-id>`. |

> [!NOTE]
> Os scripts que utilizam o Firebase Admin SDK (`seed.mjs`, `cleanup-cloudinary.mjs`, `update_password.mjs` e `migrate_data.mjs`) requerem o arquivo de credencial `scripts/serviceAccountKey.json`.

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no arquivo [.env.example](file:///.env.example):

### Variáveis da Aplicação Web (prefixo `VITE_*`)

| Variável | Obrigatória? | Descrição |
| :--- | :---: | :--- |
| `VITE_FIREBASE_API_KEY` | Sim | Chave pública da API web do Firebase. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Sim | Domínio de autenticação do projeto Firebase (`<project-id>.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | Sim | ID do projeto no Firebase Console. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Sim | Bucket de armazenamento do Firebase Cloud Storage. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sim | Sender ID para mensageria do Firebase. |
| `VITE_FIREBASE_APP_ID` | Sim | Identificador da aplicação web registrada no Firebase. |
| `VITE_CLOUDINARY_CLOUD_NAME` | Sim | Nome da nuvem (Cloud Name) no Cloudinary. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Sim | Upload preset unsigned geral para uploads na interface. |
| `VITE_CLOUDINARY_IMAGE_PRESET` | Sim | Upload preset unsigned específico para imagens e fotos. |
| `VITE_CLOUDINARY_AUDIO_PRESET` | Sim | Upload preset unsigned específico para faixas de áudio. |
| `VITE_SITE_ID` | Não | ID do site multi-tenant (fallback padrão interno: `meu-site`). |
| `VITE_GEMINI_API_KEY` | Não | Chave de API Google Gemini para criação assistida de perguntas no Quiz. |
| `VITE_USE_MOCK_DATA` | Não | Habilita dados mockados em memória para testes offline (`false` por padrão). |

### Variáveis Exclusivas de Scripts Administrativos (sem prefixo `VITE_*`)

| Variável | Obrigatória? | Descrição |
| :--- | :---: | :--- |
| `CLOUDINARY_API_KEY` | Não | Chave de API do Cloudinary (usada somente em `npm run cleanup`). |
| `CLOUDINARY_API_SECRET` | Não | Segredo de API do Cloudinary (usado somente em `npm run cleanup`). |

---

## Configuração de Serviços

### Firebase
1. **Authentication:**
   - Habilite o provedor **Anônimo** (utilizado pelos jogadores para persistir registros e presença em tempo real).
   - Habilite o provedor **E-mail/Senha** (utilizado para acesso restrito ao painel administrativo `/admin`).
2. **Cloud Firestore:**
   - Crie o banco de dados no modo produção.
   - Aplique as regras de segurança presentes no arquivo [firestore.rules](file:///firestore.rules).
3. **Setup Inicial:**
   - Coloque a chave da conta de serviço `serviceAccountKey.json` na pasta `scripts/`.
   - Execute `npm run seed` para criar o documento base `sites/<site-id>` e o primeiro Super Admin.

### Cloudinary
- O Cloudinary é utilizado para upload direto do navegador (sem backend intermediário) e entrega otimizada de mídias:
  - **Imagens:** Álbum de fotos, capas de músicas, planos de fundo e avatares.
  - **Áudio:** Faixas de música no formato MP3 para o player embutido.
- Os presets de upload devem ser configurados como **Unsigned** no painel do Cloudinary.

---

## Autenticação e Perfis de Acesso

### Identificação de Jogadores por Token Mágico
- Os parceiros/jogadores acessam a aplicação através de links mágicos contendo o parâmetro `?token=<hash>` na URL.
- O componente `PlayerAuthInit` valida o token na coleção `tokens/` do Firestore, associa o usuário autenticado anonimamente na coleção `player_links/` e salva a identidade localmente no navegador via Zustand (`localStorage`).
- Novos tokens podem ser gerados por meio do script `node scripts/generateTokens.mjs` ou diretamente no painel administrativo em `/admin/tokens`.

### Papéis Administrativos (Custom Claims)
- O acesso a rotas sob `/admin` é gerenciado pelo componente `ProtectedRoute` e validado pelo `AuthContext` através de Custom Claims do Firebase Auth:
  - `super_admin`: Acesso irrestrito a todas as páginas e configurações administrativas. Atribuído no setup inicial via `scripts/seed.mjs`.
  - `site_admin`: Acesso restrito a um site específico identificado por `siteId`. *(Atribuição de claims para novos site_admins: A documentar — requer script ou Cloud Function com Firebase Admin SDK).*

---

## Estrutura de Pastas (`src/`)

```
src/
├── app/        # Configuração de rotas, layouts base e provedores globais da aplicação.
├── assets/     # Recursos estáticos locais, ícones e mídias empacotadas.
├── config/     # Configurações padrão de sites, temas visuais e constantes globais.
├── features/   # Módulos de domínio funcional (auth, player, jogos, álbum, quiz, mapa).
├── pages/      # Páginas principais da aplicação pública e páginas do painel administrativo.
├── services/   # Clientes e integrações com serviços externos (Firebase, Cloudinary, MP3).
├── shared/     # Componentes visuais reutilizáveis (UI), utilitários e hooks compartilhados.
├── store/      # Stores de gerenciamento de estado global com Zustand.
└── styles/     # Folhas de estilo globais e configurações de classes do Tailwind CSS.
```

---

## Deploy e PWA

### Deploy na Vercel
- O projeto inclui configuração em [vercel.json](file:///vercel.json) definindo cabeçalhos de cache otimizados (`max-age=31536000, immutable`) para ativos estáticos, fontes e imagens.
- Para deploy, configure as variáveis de ambiente de produção no dashboard da Vercel idênticas às especificadas na tabela de variáveis.

### Suporte a PWA (Progressive Web App)
- O plugin `vite-plugin-pwa` gera automaticamente o manifesto web (`manifest.webmanifest`) e o Service Worker (`dist/sw.js`) no momento do build.
- Os ícones instaláveis da aplicação estão localizados em:
  - [public/icon-192.png](file:///public/icon-192.png) (192x192 pixels)
  - [public/icon-512.png](file:///public/icon-512.png) (512x512 pixels)
- Para atualizar ou regenerar os ícones a partir de uma nova imagem base, execute `node scripts/generate-icons.mjs`.

---

## Gerar Pacote de Entrega

Para gerar um arquivo `.zip` limpo para entrega ou distribuição comercial (sem incluir credenciais locais, chaves de serviço, arquivos de ambiente `.env`, dependências ou relatórios internos), utilize o comando:

```bash
git archive --format=zip --output=../romantic-engine-release.zip HEAD
```

Os arquivos internos e sensíveis estão protegidos via `.gitattributes` (`export-ignore`) e `.gitignore`, garantindo que o pacote resultante contenha apenas o código e recursos necessários para instalação e uso por novos compradores.

