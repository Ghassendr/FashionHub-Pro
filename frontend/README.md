# Frontend - 360° Precision AI

a React + Vite application for the 360° Precision AI interface.

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation (First Run / Clean Start)

If you are running this for the first time or encountering issues, run this command to clean install dependencies and start the server:

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue; npm install; npm run dev
```

### Regular Startup

Once installed, you can simply run:

```powershell
npm run dev
```

## Troubleshooting

- **Blank Page?** Ensure `tailwindcss` related dependencies are installed and `vite.config.js` defines `global: 'window'`.
- **Port Conflict?** Vite will automatically switch to the next available port (e.g., 5174, 5175). Check the terminal output for the correct URL.
