# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based inventory management system ("Controle de Cautela") built with Vite, Firebase Firestore, and Material-UI. The application manages equipment assignments ("cautelas"), users, vehicles, and tracks material movements in what appears to be a military or institutional context.

## Key Commands

### Development
```bash
npm run dev         # Start Vite dev server on localhost:5173
npm run build       # Build for production using Vite
npm run preview     # Preview production build locally
npm run lint        # Run ESLint checks on all JS/JSX files
```

### Testing
- No test scripts are currently configured in package.json
- No test files exist in the project structure

## Architecture

### Technology Stack
- **Frontend Framework**: React 19 with React Router DOM v7
- **Build Tool**: Vite 6 with React plugin
- **UI Library**: Material-UI v6 with Emotion for CSS-in-JS styling
- **Database**: Firebase v11 Firestore
- **Authentication**: Custom JWT implementation using jose v6 library
- **Data Export**: xlsx v0.18 library for Excel exports
- **Charts**: Recharts v2 for data visualization
- **Environment**: dotenv for environment variable management

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
- `components/` - Reusable UI components (search bars, buttons, info displays, cautela strips)
- `dialogs/` - Modal dialogs for CRUD operations following MUI Dialog patterns
- `screens/` - Page-level components organized by feature, each in its own subdirectory
- `contexts/` - React Context providers for global state management
- `theme/` - Material-UI theme configuration

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

## File Structure Notes

### Zone.Identifier Files
- Multiple `.Zone.Identifier` files throughout the project indicate Windows/WSL development
- These files are safe to ignore and can be cleaned up if needed

### CSS Organization
- Global styles in `src/index.css` and `src/App.css`
- Component-specific styles in individual CSS files (e.g., `LoginScreen.css`, `Dialog.css`)
- Material-UI theme configuration centralized in `src/theme/theme.js`

### Assets
- Static assets (images, icons) stored in `src/assets/`
- Includes institutional imagery (brasao.png, bolacha.png) suggesting military/government context

## Development Workflow

### Adding New Features
1. Create new screen component in `src/screens/[FeatureName]/`
2. Add corresponding dialog in `src/dialogs/` if CRUD operations needed
3. Update routing in `src/App.jsx`
4. Add to menu system via `MenuContext.jsx` if navigation required

### Firestore Integration Pattern
- Collection references defined in `src/firebase/db.js`
- Real-time listeners used throughout for live data updates
- Direct Firestore operations in components (no additional abstraction layer)

### Authentication Pattern
- JWT tokens stored in localStorage
- Token verification on protected routes via `PrivateRoute.jsx`
- Role-based access control implemented in `MenuContext.jsx`