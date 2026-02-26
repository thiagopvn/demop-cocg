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
- `manutencoes` - Scheduled maintenance tasks
- `historico_manutencoes` - Completed maintenance history

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
