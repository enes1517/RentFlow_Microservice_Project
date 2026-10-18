# RentFlow Frontend

The browser application is an Angular 22 standalone app. It requires Node.js 22 and npm.

## Local development

Install dependencies and start the dev server:

```powershell
npm ci
npm start
```

Open `http://localhost:4200`. The development proxy forwards `/api` requests to the API Gateway at `http://localhost:5555`.

Configure the Keycloak realm issuer in `src/assets/app-config.json`. This file is fetched at application startup so deployment environments can replace it without rebuilding the frontend. The issuer must be the URL advertised by Keycloak to the browser.

When running PaymentService outside Compose for the local demo, set `Payments__Mode=Simulated` in the PaymentService process environment. Simulated payments are restricted to ASP.NET Development and never collect real money.

To enable the imported Keycloak demo accounts, set a separate password for each role using `KEYCLOAK_DEMO_ADMIN_PASSWORD`, `KEYCLOAK_DEMO_LANDLORD_PASSWORD`, and `KEYCLOAK_DEMO_TENANT_PASSWORD` in the repository-root `.env`. The one-shot `keycloak-demo-users-init` service applies only configured values and never logs passwords. These local demo credentials must not be reused in production.

## Docker Compose demo

From the repository root, configure the values from `.env.example` in a local `.env` file, then run:

```powershell
docker compose up --build
```

Open `http://localhost:4200`. The frontend container serves the production Angular build and forwards `/api` to the API Gateway. The Compose demo mounts `infrastructure/frontend/app-config.json`; change its issuer when the browser-visible Keycloak URL differs from `http://localhost:8080/realms/rent-management`.

The Compose setup is for local development/demo only. It enables simulated payments and Development-only database migrations. Do not use these settings as a production deployment configuration.

## Build and tests

```powershell
npm run build
npm test -- --watch=false
```

The configured unit-test runner is Vitest. Browser smoke tests use Playwright and expect the demo Compose stack to be running:

```powershell
npx playwright install chromium
docker compose up --build -d
npm run test:e2e
```

The browser suite checks the runtime configuration, login screen, and Keycloak authorization redirect. To also verify authenticated role redirects and backend profile synchronization, add the three distinct demo passwords to the repository-root `.env`, then run:

```powershell
npm run test:e2e:compose
```

This command loads `.env` directly into the test process; passwords are not placed in source files or browser traces. Without demo passwords, the three authenticated tests are explicitly skipped. The Compose setup remains local-demo only, not a production deployment.
