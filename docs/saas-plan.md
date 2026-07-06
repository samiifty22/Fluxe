# Fluxe SaaS Plan

This document describes how to convert Fluxe into a multi-tenant SaaS product where anyone can sign up, configure integrations (Shopify, TikTok, Meta), and run fulfillment workflows under a subscription model.

## Goals
- Allow users to sign up and create an account (tenant/workspace).
- Provide per-tenant configuration for integrations and credentials.
- Gate usage behind subscription plans (Stripe) with a billing portal.
- Isolate tenant data while keeping the codebase single-instance (multi-tenant).
- Provide onboarding UI and dashboard to manage integrations and run pipelines.

## Recommended Tech Stack
- Frontend / Server: Next.js (existing codebase)
- Auth: NextAuth.js (email/password, OAuth providers) or Clerk/Auth0 for faster SaaS-ready flows
- Database: PostgreSQL (single database) with Prisma ORM for schema migrations and multi-tenant modeling
- Billing: Stripe (Subscriptions + Customer Portal)
- Webhooks: Stripe webhooks + provider webhooks (Shopify, TikTok)
- Background jobs: BullMQ/Redis or serverless queue for long-running tasks (fulfillment dispatch)

## Multi-tenant architecture (recommended)
- Use a single database with a `tenantId` column on tenant-scoped tables (orders, integrations, settings).
- Tables to add:
  - `tenants` (id, name, ownerUserId, plan, status, createdAt)
  - `users` (id, email, hashedPassword, tenantId, role)
  - `integrations` (id, tenantId, type, encryptedConfig)
  - `billing` (tenantId, stripeCustomerId, stripeSubscriptionId, status)

## Signup / Onboarding Flow
1. User signs up (email + password or OAuth).
2. Create a `tenant` record and a user with `owner` role.
3. Redirect user to a checkout page (Stripe Checkout) to select a subscription plan.
4. After successful payment, Stripe webhook `checkout.session.completed` triggers activation of tenant and enables features.
5. Show onboarding steps: connect Shopify, add supplier details, configure pipelines.

## Stripe Integration
- Use Stripe Checkout for subscriptions and Stripe Customer Portal for managing billing.
- Handle these webhooks at `/api/webhooks/stripe`:
  - `checkout.session.completed` — activate tenant
  - `invoice.paid` / `invoice.payment_failed` — update billing status
  - `customer.subscription.updated` / `customer.subscription.deleted` — adjust tenant access
- Required env vars:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Authentication & Session Management
- Use NextAuth.js with an email provider + optional OAuth (Google/Github) to simplify user management.
- Store sessions in DB for scalability (via Prisma adapter).
- Protect API routes by checking `req.user.tenantId` and roles.

## Per-tenant Configuration Storage
- Store integration credentials encrypted at rest (use a KMS or server-side encryption key).
- Provide UI screens to add/remove credentials and test connections.

## Billing & Usage Metering
- Decide billing model: flat monthly tiers (e.g., Starter, Pro, Enterprise) or usage-based billing (per-order, per-API-call).
- If usage-based, record events (orders processed) and report to Stripe usage records or build a metering job.

## Webhooks & Background Jobs
- Offload long-running tasks (supplier dispatch, rate-limited API calls) to a job queue.
- Ensure idempotency for webhook handlers and job processing.

## Security & Compliance
- Encrypt secrets in the DB.
- Use HTTPS and secure cookies.
- Add rate limiting and input validation on public endpoints.

## Dev / Local Testing Notes
- Use `stripe` CLI or `ngrok` to test webhooks locally. Point `STRIPE_WEBHOOK_SECRET` to the local webhook endpoint.
- Start dev server:

```bash
npm install
npm run dev
```

The project currently runs on `http://localhost:3001` if `3000` is busy.

## Implementation Roadmap (next actions I can implement)
1. Add SaaS design doc (this file) — done.
2. Scaffold auth with `NextAuth` and a `tenants` table.
3. Add Stripe integration and a checkout flow + webhook endpoints.
4. Add per-tenant settings UI (integrations page).
5. Add billing portal integration and subscription management flows.
6. Harden multi-tenant isolation, encryption, background jobs, and deploy.

If you'd like, I can start by scaffolding `NextAuth` with a Prisma schema and a Stripe checkout example. Which auth provider would you prefer (email/password, Google OAuth, or a managed provider like Clerk)? Also confirm Stripe as the billing provider.
