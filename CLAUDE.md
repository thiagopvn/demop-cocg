# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based inventory management system ("Controle de Cautela") built with Vite, Firebase Firestore, and Material-UI. The application manages equipment assignments, users, vehicles, and tracks material movements.

## Key Commands

### Development
```bash
npm run dev         # Start Vite dev server on localhost
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint checks
```

## Architecture

### Technology Stack
- **Frontend Framework**: React 19 with React Router v7
- **Build Tool**: Vite
- **UI Library**: Material-UI v6 with Emotion for styling
- **Database**: Firebase Firestore
- **Authentication**: Custom JWT implementation using jose library
- **Data Export**: xlsx library for Excel exports
- **Charts**: Recharts for data visualization

### Core Structure

#### Routing
All routes are defined in `src/App.jsx`:
- `/` - Login screen
- `/first-access` - Initial setup
- `/home` - Dashboard with statistics
- `/categoria`, `/material`, `/usuario`, `/viaturas` - CRUD screens
- `/movimentacoes` - Equipment assignment/movement tracking
- `/devolucoes` - Returns management
- `/aneis` - Ring management
- `/search` - Multi-criteria search interface

#### Firebase Integration
- Configuration: `src/firebase/db.js` - Uses environment variables for Firebase config
- Token management: `src/firebase/token.js` - JWT verification
- Excel export: `src/firebase/xlsx.js`
- Data population: `src/firebase/populate.js`

#### Context System
- `MenuContext.jsx` - Main navigation wrapper with role-based access control
- `CategoriaContext.jsx` - Category state management
- `ThemeContext.jsx` - Theme management
- `PrivateRoute.jsx` - Route protection

#### Component Architecture
- `components/` - Reusable UI components (search bars, buttons, info displays)
- `dialogs/` - Modal dialogs for CRUD operations
- `screens/` - Page-level components organized by feature

#### Search System
The search functionality (`src/screens/Search/`) provides multiple search modes:
- Material by User
- Material by Vehicle
- User by Material
- Vehicle by Material
- Inactive items
- Items under custody ("Cautelados")

## Environment Variables

Required `.env` variables for Firebase:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## ESLint Configuration

Custom rules in `eslint.config.js`:
- Ignores `dist` directory
- Allows uppercase unused variables (for constants)
- React Refresh plugin for HMR
- React Hooks rules enforcement

## Key Patterns

### State Management
- Uses React hooks (useState, useEffect) for local state
- Context API for global state (categories, theme, menu)
- Firebase Firestore for persistent data

### Authentication Flow
1. Login via `LoginScreen` component
2. JWT token stored in localStorage
3. Token verification using `verifyToken()` from `firebase/token.js`
4. Role-based access control through `MenuContext`

### CRUD Operations
All entity screens follow similar patterns:
1. List view with search/filter
2. Dialog for create/edit operations
3. Direct Firestore integration using collection references
4. Real-time updates via Firestore listeners

### Material Movement Tracking
The system tracks equipment assignments through:
- Movement type selection (user or vehicle assignment)
- Quantity tracking
- Location/repair status
- Automatic status updates in Firestore

## Development Notes

- No test files currently exist in the project
- Uses Vite's hot module replacement for development
- All Firebase operations are abstracted in `src/firebase/`
- Material-UI theming is applied globally
- Zone.Identifier files suggest Windows/WSL development environment