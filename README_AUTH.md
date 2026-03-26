# Maison Tissue - Role-Based Authentication System

This document explains the technical workflow and interaction of the authentication system implemented for ProjetCTR.

## 1. User Roles & Architecture
The system uses a **1+4 Schema**:
- **Core User Table**: Stores credentials (email, password), role, and account status.
- **Role Profiles**: Four distinct tables linked to the user via a `OneToOneField`:
    - `ClientProfile` (Automatic activation)
    - `CoutureHouseProfile` (Pending manual review)
    - `SupplierProfile` (Pending manual review)
    - `CarrierProfile` (Pending manual review)

## 2. Registration Workflow
1.  **Role Selection**: User chooses between Client, Couture House, Supplier, or Delivery.
2.  **Basic Info**: Standard fields (Full Name, Email, Password).
3.  **Professional Identity**: Role-specific fields (e.g., Specialization for Couture, Origin Country for Suppliers).
4.  **Verification Documents**: Professionals must upload proofs (Commercial Register, ID Card, Portfolio).
5.  **Submission**:
    - Clients are created as `active`.
    - Professionals are created as `pending_review`.

## 3. Admin Interaction (Review Queue)
- **Dashboard**: Admins access `/admin/review` to see all accounts with `pending_review` status.
- **Action**: Admins can **Approve** or **Reject** accounts.
- **Impact**: Upon approval, the `account_status` changes to `active`, and the user is notified/granted full platform access.

## 4. Technical Stack
- **Backend**: Django REST Framework + PostgreSQL + SimpleJWT (customized for role claims).
- **Frontend**: React + TailwindCSS + Lucide Icons + AuthContext (reactive session management).
- **Authentication**: JWT stored in `localStorage`, decoded at runtime to drive RBAC (Role-Based Access Control) in the UI.

## 5. How to Test
1.  **Register a Professional**: Go to the website, click Register, and choose "Couture House". Fill all 4 steps.
2.  **Admin Review**:
    - Login as `admin@example.com` / `password123`.
    - Click the **Shield Icon (Admin)** in the Navbar.
    - Click "Approve Account" for your new user.
3.  **Verify**: Log out and log back in with the professional account; you will now have "Approved" status in your profile.
