# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based inventory management system ("Controle de Cautela") built with Vite, Firebase Firestore, and Material-UI. The application manages equipment assignments ("cautelas"), users, vehicles, maintenance schedules, and tracks material movements in what appears to be a military or institutional context.

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
- **Database**: Firebase v11 Firestore (real-time NoSQL database)
- **Authentication**: Custom JWT implementation using jose v6 library
- **Data Export**: xlsx v0.18 library for Excel exports
- **Charts**: Recharts v2 for data visualization
- **Environment**: Uses Vite's import.meta.env for environment variables

### Core Structure

#### Routing Configuration
All routes are defined in `src/App.jsx`:
- `/` - Login screen (public route)
- `/first-access` - Initial user setup
- `/home` - Dashboard with statistics and charts
- `/categoria` - Category management
- `/material` - Material/equipment inventory
- `/usuario` - User management
- `/viaturas` - Vehicle fleet management
- `/movimentacoes` - Equipment assignment/movement tracking
- `/devolucoes` - Returns management
- `/aneis` - Ring management system
- `/search` - Multi-criteria search interface
- `/manutencao` - Maintenance scheduling and tracking

#### Firebase Integration
- **Configuration**: `src/firebase/db.js` - Initializes Firebase app with environment variables
- **Collections**:
  - `users` - User accounts and profiles
  - `materials` - Equipment/material inventory
  - `categorias` - Material categories
  - `viaturas` - Vehicle registry
  - `movimentacoes` - Movement/assignment history
  - `rings` - Ring inventory
  - `manutencoes` - Scheduled maintenance
  - `historico_manutencoes` - Maintenance history

- **Token Management**: `src/firebase/token.js` - JWT generation and verification
- **Excel Export**: `src/firebase/xlsx.js` - Data export utilities
- **Data Population**: `src/firebase/populate.js` - Database seeding scripts

#### Context System
- `MenuContext.jsx` - Main navigation wrapper with role-based access control, drawer menu implementation
- `CategoriaContext.jsx` - Category state management across components
- `ThemeContext.jsx` - Theme switching and persistence
- `PrivateRoute.jsx` - Protected route wrapper for authentication

#### Component Architecture
- `components/` - Reusable UI components:
  - `ButtonMenu.jsx` - Custom menu button with CSS styling
  - `CautelaStrip.jsx` - Equipment assignment display strip
  - `MaterialSearch.jsx`, `UserSearch.jsx`, `ViaturaSearch.jsx` - Search components
  - `UserInfo.jsx` - User information display
  - `TabPanel.jsx` - Tab panel wrapper
  - `ButtonDevolver.jsx` - Return action button
  - `maintenance/` - Maintenance-related components (calendar, dashboard, history)

- `dialogs/` - Modal dialogs for CRUD operations:
  - `MaterialDialog.jsx` - Material creation/editing
  - `UsuarioDialog.jsx` - User management
  - `ViaturaDialog.jsx` - Vehicle management
  - `CategoriaDialog.jsx` - Category management
  - `MaintenanceDialog.jsx` - Maintenance scheduling
  - `RingDialog.jsx` - Ring management
  - `WarningDialog.jsx` - Warning/confirmation dialogs

- `screens/` - Page-level components, each in its own directory:
  - Each screen follows a pattern with main component and optional CSS file
  - Screens handle data fetching, state management, and dialog orchestration

#### Search System Architecture
The search functionality (`src/screens/Search/`) provides multiple specialized search modes:
- **MaterialUsuario.jsx** - Find materials assigned to specific users
- **MaterialViatura.jsx** - Find materials assigned to specific vehicles
- **UsuarioMaterial.jsx** - Find users who have specific materials
- **ViaturaMaterial.jsx** - Find vehicles with specific materials
- **Inativos.jsx** - List all inactive items
- **Cautelados.jsx** - List all items currently under custody

## Environment Variables

Required `.env` variables for Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## ESLint Configuration

Custom rules configured in `eslint.config.js`:
- Ignores `dist` directory (build output)
- Allows uppercase-starting unused variables (for constants)
- React Refresh plugin for Hot Module Replacement
- React Hooks rules enforcement
- ECMAScript 2020 features enabled
- JSX support configured

## Key Patterns

### State Management
- React hooks (useState, useEffect) for local component state
- Context API for global state (categories, theme, menu, authentication)
- Firebase Firestore for persistent data with real-time listeners
- No Redux or other state management libraries

### Authentication Flow
1. User login via `LoginScreen` component
2. JWT token generated using jose library
3. Token stored in localStorage
4. Token verification on protected routes via `PrivateRoute`
5. Role-based access control enforced in `MenuContext`
6. Secret key hardcoded in `firebase/token.js` (should be environment variable)

### CRUD Operations Pattern
All entity screens follow consistent patterns:
1. List view with real-time Firestore listener (onSnapshot)
2. Search/filter functionality with local state
3. Dialog for create/edit operations
4. Direct Firestore operations (addDoc, updateDoc, deleteDoc)
5. Optimistic UI updates with error handling
6. Material-UI DataGrid or Table for display

### Material Movement Tracking
Equipment assignment workflow:
1. Select movement type (user or vehicle assignment)
2. Track quantity changes
3. Update location/status (operational, maintenance, repair)
4. Create movement record in Firestore
5. Update material availability in real-time

### Firestore Integration Best Practices
- Use document IDs from Firestore (doc.id) not custom ID fields
- Remove empty 'id' fields from data before saving
- Real-time listeners with proper cleanup (unsubscribe)
- Query with orderBy for consistent sorting
- Handle Firestore errors with user feedback

## File Structure Notes

### Zone.Identifier Files
- Multiple `.Zone.Identifier` files indicate Windows/WSL development environment
- These are Windows security zone markers and can be safely ignored
- Can be removed with: `find . -name "*.Zone.Identifier" -delete`

### CSS Organization
- Global styles: `src/index.css`, `src/App.css`
- Component-specific styles: Individual CSS files (e.g., `LoginScreen.css`)
- Material-UI theme: `src/theme/theme.js` with comprehensive customization
- Context styles: `src/contexts/context.css`
- Dialog styles: `src/dialogs/Dialog.css`

### Assets
- Static images in `src/assets/`:
  - `brasao.png`, `bolacha.png` - Institutional emblems
  - `excel.svg` - Excel export icon
  - `signature.png` - Digital signature asset

## Development Workflow

### Adding New Features
1. Create screen component in `src/screens/[FeatureName]/`
2. Add dialog in `src/dialogs/` for CRUD operations if needed
3. Update routing in `src/App.jsx`
4. Add menu item in `MenuContext.jsx` with appropriate icon
5. Define Firestore collection in `src/firebase/db.js`
6. Implement real-time listeners for data synchronization

### Material-UI Theme
Comprehensive theme configuration in `src/theme/theme.js`:
- Navy blue primary color (#1e3a5f)
- Orange secondary color (#ff6b35)
- Custom shadows and transitions
- Rounded corners (borderRadius: 12)
- Component-specific overrides for consistent styling

### Deployment
- Vercel configuration in `vercel.json` with SPA routing
- Build output in `dist/` directory
- Manual chunks disabled in Vite config for optimization

## Security Considerations
- JWT secret key is hardcoded and should be moved to environment variable
- No HTTPS enforcement in development
- Token expiration set to 5 hours
- Role-based access control implemented but needs security audit