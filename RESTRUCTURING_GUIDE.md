# Project Restructuring Documentation

This document outlines the new actor-based folder hierarchy implemented for the ProjetCTR project, which separates client (3D body measurement) and delivery (logistics) concerns into isolated, reusable modules.

## Overview

The project has been restructured to follow an **actor-based architecture** where:
- **Client Actor**: Handles 3D body measurement, video processing, and AI-powered sizing recommendations
- **Delivery Actor**: Manages logistics, route optimization, vehicle assignments, and order tracking
- **Core Module**: Provides shared authentication, utilities, and common functionality
- **ML Pipeline**: Specialized 3D computer vision processing pipeline

## Frontend Structure

```
frontend/src/
├── actors/                           # Actor-specific logic
│   ├── client/                       # CLIENT ACTOR
│   │   ├── pages/                   # Client pages
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── BodyMeasurements.jsx
│   │   ├── components/              # Client-specific components
│   │   │   ├── Viewer3D.jsx
│   │   │   └── Upload.jsx
│   │   ├── hooks/                   # Client-specific React hooks
│   │   ├── services/                # API services for client
│   │   ├── styles/                  # Client-specific CSS
│   │   └── context/                 # Client state management
│   │
│   └── delivery/                     # DELIVERY ACTOR
│       ├── pages/                   # Delivery pages
│       │   ├── Delivery.jsx
│       │   └── CoutureHouse.jsx
│       ├── components/              # Delivery-specific components
│       ├── hooks/                   # Delivery-specific hooks
│       ├── services/                # API services for delivery
│       ├── styles/                  # Delivery-specific CSS
│       └── context/                 # Delivery state management
│
└── shared/                           # SHARED: Cross-actor utilities
    ├── components/                  # Shared UI components
    │   ├── Layout/                 # Main layout wrapper
    │   ├── Auth/                   # Authentication components
    │   ├── DataDisplay/            # Reusable display components
    │   ├── Forms/                  # Form components
    │   └── Notifications/          # Toast, modals, dialogs
    ├── hooks/                      # Shared hooks (useApi, useAuth, etc.)
    ├── services/                   # Shared services (api client, auth, logging)
    ├── context/                    # Global context (Auth, Theme, Notifications)
    ├── utils/                      # Utility functions and helpers
    ├── pages/                      # Shared pages (Home)
    └── styles/                     # Global styles and CSS variables
```

### Key Changes - Frontend

1. **App.jsx**: Updated imports to reference new paths
   ```javascript
   import Layout from './shared/components/Layout/Layout';
   import Home from './shared/pages/Home';
   import Onboarding from './actors/client/pages/Onboarding';
   ```

2. **CSS Import**: Moved from root to `shared/styles/`
   - `index.css` → `shared/styles/index.css`
   - `App.css` → `shared/styles/App.css`
   - `variables.css` → `shared/styles/variables.css`

3. **Component Organization**:
   - Client-related components (BodyMeasurements, Viewer3D, Upload) → `actors/client/`
   - Layout and shared UI → `shared/components/`
   - Stats component → `shared/components/DataDisplay/`

## Backend Structure

```
backend/
├── config/                           # Django project settings
│   ├── settings.py                  # (Updated with new apps)
│   └── urls.py                      # (Updated with new URL patterns)
│
├── actors/                           # Actor-based modules
│   │
│   ├── client/                       # CLIENT ACTOR: 3D Body Measurement
│   │   ├── api/
│   │   │   ├── views.py            # API endpoints
│   │   │   ├── serializers.py      # Request/response schemas
│   │   │   └── urls.py             # URL routing
│   │   ├── services/               # Business logic
│   │   │   ├── video_processor.py
│   │   │   ├── measurement_pipeline.py
│   │   │   └── size_recommender.py
│   │   ├── models/                 # Database models
│   │   ├── migrations/             # Database migrations
│   │   ├── tests/
│   │   ├── apps.py                 # Django app configuration
│   │   └── __init__.py
│   │
│   └── delivery/                     # DELIVERY ACTOR: Logistics
│       ├── api/
│       │   ├── views.py            # API endpoints
│       │   ├── serializers.py
│       │   └── urls.py
│       ├── services/               # Business logic
│       │   ├── route_manager.py
│       │   ├── order_tracker.py
│       │   └── vehicle_scheduler.py
│       ├── models/                 # Database models
│       ├── migrations/
│       ├── tests/
│       ├── apps.py
│       └── __init__.py
│
├── core/                            # SHARED: Core functionality
│   ├── auth/
│   │   ├── views.py               # Auth endpoints
│   │   ├── serializers.py
│   │   ├── permissions.py         # Custom permissions
│   │   └── urls.py
│   ├── middleware/
│   │   ├── error_handler.py
│   │   └── cors_config.py
│   ├── models/                    # Base user, audit log models
│   ├── utils/                     # Shared utilities
│   ├── tests/
│   ├── apps.py
│   └── __init__.py
│
├── ml_pipeline/                     # SPECIALIZED: 3D ML Processing
│   ├── body_models/               # SMPL, HMR, pose estimation
│   ├── analysis/                  # Morphology, measurements
│   ├── rendering/                 # 3D visualization
│   ├── config/                    # Model configuration
│   └── __init__.py
│
├── bodyapi/                         # LEGACY: Kept for migration compatibility
├── strategie_livraison/             # LEGACY: Kept for migration compatibility
│
├── manage.py
├── requirements.txt
└── db.sqlite3
```

### Key Changes - Backend

1. **settings.py**: Updated INSTALLED_APPS
   ```python
   INSTALLED_APPS = [
       ...
       # Legacy apps (kept for migration compatibility)
       "bodyapi",
       "strategie_livraison",
       # New actor-based structure
       "actors.client",
       "actors.delivery",
       "core",
   ]
   ```

2. **urls.py**: Comments show intended new URL structure
   ```python
   urlpatterns = [
       # Legacy URLs (still active for backward compatibility)
       path("", include("bodyapi.urls")),
       path("api/strategie_livraison/", include("strategie_livraison.urls")),
       # New actor-based URLs (commented out, ready to enable)
       # path("api/client/", include("actors.client.api.urls")),
       # path("api/delivery/", include("actors.delivery.api.urls")),
   ]
   ```

## Migration Strategy

### Phase 1: Structure (✓ Completed)
- ✓ Created actor-based folder structure (frontend & backend)
- ✓ Reorganized files into appropriate actor directories
- ✓ Updated Django settings and URL configuration
- ✓ Created Django app configurations for new modules

### Phase 2: Gradual Code Migration (Next Steps)

1. **Move API Logic to New Actor Modules**:
   - Copy `bodyapi/views.py` → `actors/client/api/views.py` with proper imports
   - Copy `strategie_livraison/views.py` → `actors/delivery/api/views.py`
   - Create new URL routes in each actor's `urls.py`

2. **Move Models to Actor Modules**:
   - Create models in `actors/client/models/` (if needed)
   - Create models in `actors/delivery/models/` (from strategie_livraison)
   - Update app registrations

3. **Migrate Migrations**:
   - Create migrations in new app locations
   - Run `python manage.py migrate` to apply
   - Eventually remove old app migrations

4. **Update Frontend Imports**:
   - ✓ Already updated in App.jsx and page components
   - Verify all imports resolve correctly

### Phase 3: Service Layer Refactoring

1. **Create Service Classes** in each actor:
   ```python
   # actors/client/services/video_processor.py
   # actors/client/services/measurement_pipeline.py
   # actors/delivery/services/route_manager.py
   ```

2. **Extract Business Logic** from views into services
3. **Implement Dependency Injection** for cleaner testing

### Phase 4: Testing & Validation

1. Run frontend tests: `npm test`
2. Run backend tests: `python manage.py test`
3. Verify all API endpoints still work
4. Update integration tests with new paths

## API Endpoint Mapping

### Frontend Routes (React Router)
```
/                          # Home (shared)
/client/                   # Client domain
  /onboarding             # Registration/setup
  /dashboard              # Client analytics
  /3d-measurements        # Body measurement interface
/delivery/                # Delivery domain
/couturehouse/            # Couture house domain
```

### Backend API (New Structure - Ready to Enable)
```
/api/client/
  /videos/upload          # Upload video for processing
  /measurements/<run_id>  # Get body measurements
  /recommendations/<id>   # Get sizing recommendations
  /history                # User measurement history

/api/delivery/
  /routes/                # CRUD routes
  /orders/                # CRUD orders
  /vehicles/              # CRUD vehicles
  /schedules/             # CRUD schedules
  /tracking/<order_id>    # Real-time tracking

/api/auth/
  /login                  # Authentication
  /logout
  /profile                # User info
```

## Important Notes

1. **Backward Compatibility**: Legacy apps (`bodyapi`, `strategie_livraison`) are still installed and active. This ensures zero disruption during migration.

2. **Database Migrations**: The existing SQLite database works with both old and new app structures. Once new models are fully created, run migrations and remove legacy apps.

3. **Testing**: Test each phase independently:
   - First verify new folder structure loads
   - Then test API endpoints with new routes
   - Finally, remove legacy apps

4. **Deployment**: Only switch production URLs after thoroughly testing new routes.

## Next Steps

1. **Create API views** in the new actor directories
2. **Implement services** for business logic separation
3. **Update tests** to use new import paths
4. **Enable new URL routes** in `config/urls.py` once validated
5. **Decommission legacy apps** after full migration to new structure

## File References

- Frontend: `frontend/src/App.jsx` (line 1-35)
- Backend Settings: `backend/config/settings.py` (line 13-31)
- Backend URLs: `backend/config/urls.py` (line 12-25)

---

**Status**: Phase 1 complete | Ready for Phase 2 implementation
