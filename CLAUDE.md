# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React-based equipment custody management system ("Controle de Cautela") for a Brazilian fire department. Tracks material assignments to users and vehicles, maintenance scheduling, and inventory. Built with Vite, Firebase Firestore, and Material-UI.

## Key Commands

```bash
npm run dev         # Start Vite dev server on localhost:5173
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # ESLint checks
```

No test framework is configured.

## Architecture

### Tech Stack
- React 19 + React Router DOM v7 + Vite 6
- Material-UI v6 (Emotion CSS-in-JS)
- Firebase v11 Firestore (real-time NoSQL)
- JWT auth via jose v6 (HS256, 5h expiry)
- Recharts for charts, xlsx for Excel export

### Provider Hierarchy (src/main.jsx)
```
CategoriaProvider → MaterialProvider → ThemeProviderWrapper → App
```

### Role-Based Access Control

Three roles with cascading permissions defined in `src/App.jsx` via `PrivateRoute`:

| Role | Access |
|------|--------|
| `user` | Dashboard only (`/home`) |
| `editor` | Dashboard + all operational features |
| `admin` | Everything, including user management (`/usuario`) |

- Routes are protected by `PrivateRoute` wrapper with `allowedRoles` array
- Menu items in `MenuContext.jsx` are filtered by role
- Unauthenticated → redirects to `/`; unauthorized → redirects to `/home`

### Authentication Flow
1. Login at `/` → JWT generated via `src/firebase/token.js` → stored in `localStorage`
2. `PrivateRoute` verifies token + checks role on every protected route
3. JWT payload: `{ username, userId, role }`
4. Secret key is hardcoded as `'suaChaveSecreta'` in `token.js`

### Firebase Collections (src/firebase/db.js)
- `users` - Accounts with role, OBM (military unit), contact info
- `materials` - Equipment inventory with quantity, status, category
- `categorias` - Material categories
- `viaturas` - Vehicle registry
- `movimentacoes` - Assignment/movement history (the core "cautela" records)
- `rings` - Ring inventory
- `manutencoes` - Scheduled maintenance tasks (status `pausada` = recurrence suspended because the material is fully inoperante; resumes automatically)
- `historico_manutencoes` - Completed maintenance history
- `locais_armazenamento` - DEMOP storage locations (prateleira/box/gaveta/armário or custom `tipo`); one may be flagged `inoperantes: true`
- `material_locais` - Units of each material per location, doc id `${material_id}_${local_id}` (see `src/services/localizacaoService.js`)
- `conversas/{a_b}` + subcollection `mensagens` - Internal chat (ids are the two user ids sorted, joined by `_`); message `tipo`: texto | cobranca | transferencia | aviso | sistema (see `src/services/chatService.js`)
- `amizades/{a_b}` - Friend requests (`pendente` → `aceita`); users/chefe/BensPatrimoniais can only start chats with admingeral or friends
- `transferencias` - Cautela transfer requests between friends; accept/refuse runs in the `responderTransferencia` Cloud Function (original mov → `status: 'transferido'` + `returned_date`, new mov for the receiver with `signed: true` and `passagens + 1`, max 3 passes before the material must return to DEMOP)
- `presenca/{userId}` and `sessoes` - Online presence (1-min heartbeat, `src/services/presencaService.js`) and login/logout history (screen `/acessos`, admingeral only); stale sessions closed by `encerrarSessoesInativas`
- `fcm_tokens/{userId}` - Web push tokens (FCM). Needs `VITE_FIREBASE_VAPID_KEY`; `/firebase-messaging-sw.js` is generated at build from `src/sw/firebase-messaging-sw.template.js`
- `postos`, `obms` - Extra entries for the rank / OBM dropdowns (defaults live in `src/hooks/useListasMilitares.js`)
- `orcamento_notas`, `orcamento_caixa`, `orcamento_setores` - "Orçamento GOCG" module (`/orcamento`, roles `BensPatrimoniais` + `admingeral` only). Notas fiscais (CNPJ + valor required; objeto, setor, militar nome de guerra/RG, observações optional), caixa movements (`tipo`: saque | retorno | ajuste; saldo = saques − retornos ± ajustes − notas) and the editable list of destination setores (seeded with DEMOP/SST/SSCO/SSMT/COMANDANTE). Business rules in `src/services/orcamentoService.js`, listeners in `src/hooks/useOrcamento.js`, one file per tab in `src/screens/Orcamento/`. Every typed text is stored in caixa alta. Militar autocomplete comes from `src/data/militaresGocg.js` (N. Guerra + RG only, generated from the DGP PDF by `scripts/gerarMilitaresGocg.py`) plus names already launched.

### Passwords
Strong-password policy (`src/utils/senha.js`, mirrored in `functions/index.js`): letters + numbers, min 8 chars. `verifyLogin` forces a change (`mustChangePassword` + `motivoTroca: 'reset' | 'fraca'`) when the stored password is weak or was reset. New users are always created with `123456`; the initial `ChangePasswordDialog` (forced) picks the real one. Never write a password into `audit_logs`.

### Testing against production data
All ~600 users are real. Playwright scripts live in `C:\Users\ASDFGH\android-twa\e2e`; they may only log in as admin and as the test user "Teste" (RG 12345) and must never trigger `enviarAviso` (broadcast) or create data for other users. `window.__demopFs` (exposed only on localhost by `src/firebase/db.js`) gives scripts the Firestore SDK for setup/cleanup.

### Storage Locations (Locais) — key rule
A location allocation is the material's *home* inside the DEMOP: units that are not permanently in a vehicle (`unidadesDemop = estoque_total - estoque_viatura`). Cautela, devolução and reparo do NOT change `material_locais`; those flows only show "Guardar em / Retirar de" hints (`MaterialLocalHint`). Changes to `qtd_inoperante` must go through `aoAlterarInoperancia()` (`src/services/inoperanciaService.js`), which moves units to the inoperantes location and pauses/resumes recurrent maintenances.

Stock totals: `getTotalUnidades()` (`src/utils/materialStatus.js`) never returns less than `estoque_atual + estoque_viatura` (legacy docs had a stale `estoque_total`); writers (MaterialDialog, Movimentacoes, guardar em local) use it as the base so documents self-heal. Storing more units than are "sem local" is allowed: `guardarNoLocal()` raises `estoque_total`/`estoque_atual` by the difference. This is a plain quantity edit (audit log only) and must NOT create a `movimentacoes` record. Quantity inputs in dialogs use `src/components/QuantidadeField.jsx` (allows clearing while typing, clamps on blur).

### Context System (src/contexts/)
- **MenuContext.jsx** (~876 lines) - Main layout wrapper: sidebar navigation, role-based menu filtering, mobile drawer, logout, maintenance notification badge, admin cleanup FAB
- **CategoriaContext.jsx** - Category list (non-real-time, uses getDocs)
- **MaterialContext.jsx** - Materials list (real-time via onSnapshot), exposes `useMaterials()` hook
- **ThemeContext.jsx** - Light/dark mode toggle
- **PrivateRoute.jsx** - Auth guard with `useRef` to prevent re-render loops

### Screen Pattern
Each screen lives in `src/screens/[Name]/` and follows a consistent pattern:
1. Real-time Firestore listener via `onSnapshot` (cleanup on unmount)
2. Local search/filter state (often using `useDebounce` hook)
3. MUI DataGrid or Table for display
4. Dialog component from `src/dialogs/` for create/edit
5. Direct Firestore operations (addDoc, updateDoc, deleteDoc)

### Adding a New Feature
1. Create screen in `src/screens/[Name]/`
2. Add dialog in `src/dialogs/` if CRUD is needed
3. Add route in `src/App.jsx` with appropriate `PrivateRoute` allowedRoles
4. Add menu item in `MenuContext.jsx` with role filter
5. Export Firestore collection reference from `src/firebase/db.js`

## Key Conventions

### Firestore
- Always use `doc.id` for document identity, never a custom `id` field
- Remove empty `id` fields from data objects before saving to Firestore
- Use `orderBy` in queries for consistent sorting
- Clean up `onSnapshot` listeners in `useEffect` return

### Custom Utilities
- **useDebounce hook** (`src/hooks/useDebounce.js`) - Debounces values with 300ms default delay; used for search inputs
- **Maintenance notification service** (`src/services/maintenanceNotificationService.js`) - Handles overdue/upcoming maintenance queries, browser notifications, and recurrence scheduling (diaria through anual)
- **Excel export** (`src/firebase/xlsx.js`) - Data export utilities

### Theme (src/theme/theme.js)
- Primary: navy blue `#1e3a5f`, Secondary: orange `#ff6b35`
- Border radius: 12px default
- Font: Inter/Roboto stack
- Buttons have hover lift animations

## Environment Variables

Required in `.env` (Vite prefix `VITE_`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Deployment
- Vercel with SPA rewrite in `vercel.json`
- Build output: `dist/`
