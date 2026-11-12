# BorrowBuddy React frontend

The BorrowBuddy UI is a React 18 single-page app built with Vite and React Router. It talks to the Spring Boot REST API and reuses the BorrowBuddy CSS design system.

## Requirements

- Node.js 20+ and npm 10+
- The backend running on `http://localhost:8080` for local development

## Development

```powershell
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` to the backend, so no extra configuration is needed.

## Production build

```powershell
npm run build
```

The bundle is written to `dist/`. The backend's Maven build copies this folder into the Spring Boot jar (`target/classes/static`), and `SpaController` forwards client-side routes to `index.html`.

To package the whole application:

```powershell
npm run build
cd ..\backend
mvn clean package
java -jar target\borrowbuddy-1.0.0.jar
```

## Deploying separately

Set `VITE_API_BASE` before building when Vercel, Netlify or another host serves the UI:

```powershell
$env:VITE_API_BASE="https://borrowbuddy-api.onrender.com"
npm run build
```

Then add the frontend origin to the backend's `FRONTEND_URL` CORS list. See `../docs/DEPLOYMENT.md`.

## Structure

```
src/
├── main.jsx          # React root + providers
├── App.jsx           # Route map and protected routes
├── styles.css        # Shared BorrowBuddy design system
├── api/client.js     # fetch wrapper, JWT store, ApiError
├── context/          # Auth, toast and shared UI providers
├── components/       # Navbar, cards, modals, stars, states
├── pages/            # 12 application pages
└── utils/format.js   # Dates, money, status labels, image fallbacks
```

## Windows note

This environment blocks Rollup's native `.node` binary with an Application Control policy. `package.json` therefore aliases `rollup` to `@rollup/wasm-node`, which produces the same bundle without the native module. The alias is harmless on Linux, macOS and CI.
