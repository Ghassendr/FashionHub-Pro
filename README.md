# Projet E-commerce (FashionHub Pro)

This project contains the backend (Django) and frontend (React) for the FashionHub Pro / Fournisseur application.

## Prerequisites
- Node.js (v18 or higher recommended)
- Python 3.11+
- Git

## Project Structure
- `/backend`: Django backend API
- `/frontend`: React frontend application

---

## How to Run the Application

You need to run both the **Backend** and the **Frontend** simultaneously in two separate terminal windows.

### 1. Running the Backend (Django)

The backend utilizes a specific Python virtual environment where all dependencies are installed.

1. Open a new Terminal (PowerShell)
2. Navigate to the backend directory:
   ```powershell
   cd "backend"
   ```
3. Start the Django development server using the virtual environment's Python executable:
   ```powershell
   &"C:\Users\lasis\Desktop\projet E commrce\ProjetCTR\backend\actors\Fornisseur\.venv\Scripts\python.exe" manage.py runserver
   ```
4. The backend should now be running at `http://127.0.0.1:8000/`

### 2. Running the Frontend (React / Vite)

1. Open a **second** Terminal (PowerShell) window
2. Navigate to the frontend directory:
   ```powershell
   cd "frontend"
   ```
3. Install dependencies (if you haven't already):
   ```powershell
   npm install
   ```
4. Start the development server:
   ```powershell
   npm run dev
   ```
5. Vite will start your frontend (usually at `http://localhost:5173/` or `http://localhost:5174/`).

### Connecting them together
The frontend (`Dashboard.jsx`, `Settings.jsx`, `authService.js`) has been pre-configured to communicate with the Django backend at `http://localhost:8000`.

To view the supplier platform, click on the local link provided in your frontend terminal (e.g. `http://localhost:5173`) and navigate to the Fournisseur login/dashboard view.
