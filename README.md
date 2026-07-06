**Fluxe — App Overview**

Fluxe is an e-commerce fulfillment orchestration app built with Next.js. It provides API endpoints and integrations to handle analytics, supplier communication, order fulfillment, marketplace connectors, and AI-assisted workflows.

**Key Features**
- **Purpose**: Centralize order processing and fulfillment orchestration for e-commerce merchants.
- **API Endpoints**: Implements modular serverless routes under the `app/api` folder to integrate with external systems and services.
- **Integrations**: Connectors for Shopify, TikTok, Meta (Facebook), suppliers, and analytics pipelines.
- **Fulfillment Orchestration**: Route-based handlers to accept orders, transform them, and forward to suppliers or fulfillment providers.
- **AI/Automation**: Includes an integration point for Claude (AI-assisted processing) and pipeline orchestration for automated workflows.
- **Frontend**: Basic Next.js layout and page under `app/` for the web interface.

**Where to find things**
- **App shell**: [app/layout.js](app/layout.js)
- **Frontend page**: [app/page.jsx](app/page.jsx)
- **API routes**:
  - [app/api/analytics/route.js](app/api/analytics/route.js) — analytics ingestion and metrics
  - [app/api/claude/route.js](app/api/claude/route.js) — AI/Claude integration points
  - [app/api/fulfillment/route.js](app/api/fulfillment/route.js) — core fulfillment orchestration
  - [app/api/meta/route.js](app/api/meta/route.js) — Meta (Facebook) integration
  - [app/api/pipeline/route.js](app/api/pipeline/route.js) — workflow pipelines and transforms
  - [app/api/shopify/route.js](app/api/shopify/route.js) — Shopify connector (orders, webhooks)
  - [app/api/supplier/route.js](app/api/supplier/route.js) — supplier communication and order dispatch
  - [app/api/tiktok/route.js](app/api/tiktok/route.js) — TikTok ads / storefront integration
- **Libraries / helpers**: [lib/](lib)
- **Config**: [next.config.js](next.config.js) and [package.json](package.json)

**Quick start**
- Install dependencies: `npm install`
- Run development server: `npm run dev`
- API routes are available under `/api/<route>` (e.g., `/api/shopify`, `/api/fulfillment`).

**Notes & Next steps**
- Review each handler in `app/api/*/route.js` to confirm environment variable requirements (API keys, secrets).
- Add a more detailed docs directory if you'd like endpoint examples, request/response formats, or sequence diagrams.

If you want, I can also generate a `docs/` folder with per-endpoint documentation and example requests.

**Setting up local secrets (Windows PowerShell)**
- Create a file named `.env.local` in the project root and paste your keys there. Example contents:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
CJ_EMAIL=you@example.com
CJ_API_KEY=your_cj_api_key
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

- Important: Never commit `.env.local` to source control. Add it to `.gitignore` if not already.

**Quick verification**
- Start the dev server:

```bash
npm install
npm run dev
```

- Check the non-secret health endpoint in your browser or via curl once the server is running:

```bash
curl http://localhost:3001/api/health
```

It will return which integrations are configured (reports presence only, does not echo keys).
