# Karya — Business Operating System

Karya is a Business Operating System (BOS) designed to manage a business's operational lifecycle, from onboarding and product development through production, sales, finance, marketing, and growth.

The application brings business setup, products, unit economics, materials, inventory, production, orders, customers, finance, marketing, goals, tasks, alerts, and business-stage governance into one business-scoped system.

## Product Overview

The **Business** is the central entity. Operational records belong to a business, and server-side operations resolve the active business context before accessing business data.

Karya is organized around interconnected domains:

- **Business and stages:** onboarding, settings, lifecycle requirements, readiness evaluation, and stage transitions.
- **Products and economics:** product catalog, pricing, formulations, packaging configurations, and unit-level cost calculations.
- **Materials and production:** raw-material and packaging procurement, inventory valuation, production batches, consumption, and finished goods.
- **Commerce:** customers, orders, order items, and order-related inventory movements.
- **Finance and cash flow:** expenses, financial summaries, cash transactions, and operating economics.
- **Business management:** marketing content, publications, goals, tasks, alerts, dashboards, and investor-oriented metrics.
- **Data portability:** business-scoped JSON backup export.

## Technology Stack

### Frontend and application

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide React
- `clsx`
- `tailwind-merge`

### Backend and data

- Next.js App Router, Server Components, and Server Actions
- PostgreSQL
- Prisma ORM with the PostgreSQL adapter (`@prisma/adapter-pg`, `pg`)
- Zod for input validation

### Utilities and development

- `date-fns`
- ESLint
- TypeScript tooling (`tsx`)

Exact dependency versions are maintained in `package.json` and should be treated as authoritative.

## Architecture

Karya uses a layered, domain-oriented architecture. UI composition, request handling, validation, domain logic, and persistence are kept separate.

```text
Browser
  |
  v
Next.js App Router
  |-- Pages and layouts
  |-- Server Components
  |-- Client Components
  |
  v
Server Actions / Route Handlers
  |-- Resolve active business context
  |-- Validate request data
  |-- Invoke domain services
  |-- Return structured results
  |-- Revalidate affected routes
  |
  v
Domain modules
  |-- Business rules and calculations
  |-- Tenant-scoped queries
  |-- Transaction coordination
  |-- Serialization / DTO preparation
  |
  v
Prisma Client (src/lib/db.ts)
  |
  v
PostgreSQL
```

### Application data flow

A typical mutation follows this sequence:

1. A user interacts with a page or client component.
2. A Server Action receives the submitted data.
3. The action resolves the active business on the server and validates input with Zod.
4. The relevant service applies business rules, verifies record ownership, performs calculations, and executes database operations.
5. Prisma persists the changes in PostgreSQL, using a transaction when related operations must succeed or fail together.
6. The action returns a result and revalidates affected routes so the UI can display current data.

Server-rendered reads generally resolve the business context, call a domain service, retrieve data through Prisma, and pass serializable values to the rendered UI.

## Business and Tenant Context

The Business is the tenant boundary for business-owned data. The active business is stored in an HTTP-only cookie named:

```text
bos_active_business_id
```

The active business is resolved server-side. The principal context utilities are:

- `src/modules/business/tenant-resolution.ts`
- `src/modules/business/dashboard-context.ts`

`tenant-resolution.ts` provides active-business cookie read/set/clear operations and utilities for listing and counting available businesses. `dashboard-context.ts` resolves the active business, loads its record and current stage, and returns a shared context for server-side use.

**Security rule:** a client-supplied `businessId` is not authoritative. Every business-scoped operation must resolve the active business server-side and verify that referenced records belong to it. Queries should use business-scoped unique keys or equivalent ownership checks.

## Domain Module Convention

Domain logic is organized under `src/modules/<module>/`. A module may contain:

```text
src/modules/<module>/
├── actions.ts
├── components/
├── services.ts
├── types.ts
└── validation.ts
```

Responsibilities:

| File or directory | Responsibility |
|---|---|
| `actions.ts` | Server Action boundaries, context resolution, input validation, service invocation, error handling, and route revalidation |
| `services.ts` | Domain rules, Prisma queries, calculations, tenant-scoped operations, transactions, and serialization |
| `validation.ts` | Zod schemas, field constraints, enum validation, and normalization |
| `types.ts` | Application types, serialized records, DTOs, summaries, KPIs, and action results |
| `components/` | UI elements such as forms, tables, dialogs, cards, and interactive controls |

Database access and authoritative business rules belong on the server, not in client components. UI page boundaries do not need to mirror backend module boundaries; multiple domains may be presented together in a user-facing workspace while retaining separate services.

## Database Architecture

The Prisma schema is maintained in `prisma/schema.prisma`; seed data and reference definitions are maintained in `prisma/seed.ts`.

The schema includes the following model groups:

| Domain | Principal models |
|---|---|
| Business | `Business`, `BusinessSettings` |
| Stage system | `StageDefinition`, `StageRequirementDef`, `BusinessStageProgress`, `StageTransition` |
| Products | `Product`, `ProductFormulation`, `ProductFormulationItem`, `ProductPackagingConfiguration`, `ProductPackagingConfigurationItem` |
| Raw materials | `RawMaterial`, `RawMaterialPurchase`, `RawMaterialInventoryTransaction` |
| Packaging materials | `PackagingMaterial`, `PackagingMaterialPurchase`, `PackagingMaterialInventoryTransaction` |
| Production | `ProductionBatch`, `ProductionBatchRawMaterialConsumption`, `ProductionBatchPackagingConsumption` |
| Commerce | `Customer`, `Order`, `OrderItem` |
| Finished-goods inventory | `InventoryTransaction`, `PromotionalDispatch` |
| Finance | `Expense`, `CashTransaction` |
| Marketing | `ContentItem`, `ContentPublication` |
| Business management | `Goal`, `Task`, `Alert` |
| Investor metrics | `InvestorMarketAssumption`, `InvestorVerifiedCashBalance` |

Business-owned records carry a `businessId` and use relations, constraints, and indexes to support tenant-scoped access and data integrity. The schema defines enums, decimal precision, composite keys, unique constraints, and explicit deletion behavior.

## Business Lifecycle and Stage Engine

The Stage Engine models business maturity through nine sequential stages:

| ID | Stage |
|---:|---|
| 0 | Idea |
| 1 | Pre-launch |
| 2 | Launch |
| 3 | Validation |
| 4 | Growth |
| 5 | Scale |
| 6 | Funding |
| 7 | Expansion |
| 8 | Mature/Enterprise |

Stage definitions and requirements are seeded through `prisma/seed.ts`. Requirements can be mandatory, recommended, or optional, and can use manual, metric-threshold, or system-check evaluation.

The principal stage implementation files are:

```text
src/modules/stages/services.ts
src/modules/stages/evaluators.ts
src/modules/stages/actions.ts
```

The evaluator is the shared source for readiness information and advancement checks, avoiding separate definitions of whether a business is ready.

Stage advancement is sequential. The documented workflow resolves the active business, validates the requested transition, performs the operation transactionally, locks the Business row, rechecks the current stage and mandatory requirements, records a `StageTransition`, updates the current stage, and revalidates the relevant UI. This provides concurrency protection and a transition history.

## Products and Product Economics

Products are managed under `src/modules/products/`. A product includes identifying information (name, SKU, category, description), commercial values (selling price and cost fields), stock-related values, supplier information, and a lifecycle status.

Product statuses are:

```text
DRAFT
ACTIVE
ARCHIVED
```

Product economics distinguish raw-material cost, packaging cost, variable cost, and selling price. At a high level:

```text
Selling price
- Raw-material / product cost
- Packaging cost
- Other variable costs
= Contribution profit per unit
```

Formulations and packaging configurations are versioned and associated with products. Their component items reference raw materials or packaging materials and specify quantities. Product management owns product information and economics; inventory services own stock movements.

## Materials, Inventory, and Costing

### Raw materials and packaging materials

Raw-material and packaging-material domains track purchases, base-unit quantities, current inventory value, and weighted-average cost. Purchase units can be converted to base units. Inventory transactions record purchases, consumption, and adjustments.

### Weighted-average costing

Current material costs are derived from inventory value and quantity using weighted-average costing. Subsequent purchases can change current weighted-average costs. Historical production records must retain the cost information needed to explain the cost at the time of production.

Material purchases represent inventory acquisition and cash outflow. They should not be duplicated automatically as operating expenses in the expense ledger; cash-flow treatment belongs to the finance/cash-flow domain.

### Finished-goods inventory

Finished-goods inventory uses a transaction-ledger model. `InventoryTransaction` records stock movements, while `Product.currentStock` serves as a maintained value for efficient reads.

Documented inventory movement categories include:

```text
INITIAL_STOCK
PRODUCTION_RUN
PURCHASE_RESTOCK
SALE
RETURN_RESTOCK
DAMAGED_WRITE_OFF
MANUAL_AUDIT
PROMOTIONAL_DISPATCH
```

Promotional stock is separated from normal sellable stock:

```text
Available stock = Current stock - Promotional stock
```

Allocation increases promotional stock without changing total current stock; release reverses the allocation; dispatch reduces both current stock and promotional stock. A promotional dispatch is linked to an inventory transaction, a promotional dispatch record, and a promotional expense so physical usage can be associated with its financial cost.

Inventory changes must flow through inventory services rather than being performed directly by unrelated UI components or modules.

## Production

Production connects product specifications and material inventory to finished-goods inventory. A production batch records its product, formulation and packaging configuration, planned and actual quantities, status, notes, material consumption, packaging consumption, and cost information.

The documented batch lifecycle is:

```text
Create batch
    |
    v
DRAFT
    |
    v
Validate available materials and packaging
    |
    v
Complete batch
    |
    +--> Record material consumption
    +--> Record packaging consumption
    +--> Calculate batch and per-unit cost
    +--> Increase finished-goods inventory
    +--> Record inventory movement
    |
    v
COMPLETED
```

Draft batches may be cancelled. Production operations must protect against insufficient inventory, duplicate completion, unintended double consumption, and partial updates. Multi-record production operations should be atomic. Completed production history should preserve the facts and costs needed to explain what occurred.

The repository documentation identifies `/production-batches` as the production workspace.

## Orders and Customers

Orders are managed under `src/modules/orders/`, and customers under `src/modules/customers/`. Orders reference business-scoped customers and products through order items.

The documented order-creation workflow verifies customer and product ownership, requires eligible active products and complete unit economics, calculates totals, generates an order number, creates the order and items, stores cost-price snapshots, and deducts inventory in a transaction. If a required inventory operation fails, the transaction should roll back.

Order cancellation requires a dedicated workflow because order creation has already affected inventory; it should not be treated as a status-only change.

Customer management covers customer creation, editing, listing, validation, and business-scoped record management. The customer module validates that referenced records belong to the active business.

## Finance and Cash Flow

Finance includes expense management and financial summaries. Expense categories documented by the project include product formulation, packaging, printing/labels, shipping, marketing, promotional activity, equipment, website/software, legal/compliance, operations, and other expenses.

The finance domain supports expense creation, editing, listing, and category or period summaries. Revenue is derived from paid orders. High-level summaries may present revenue, expenses, and net results, but the system is not intended to replace a full accounting package.

Cash-flow functionality connects operational events—such as orders and material purchases—to cash movements. Financial reporting should distinguish revenue, expenses, inventory acquisition, and cash movement rather than treating them as interchangeable measures.

## Marketing and Content

Marketing manages content planning and platform-specific publication information. The relationship is:

```text
ContentItem
    |
    +--> ContentPublication
```

Documented platforms include Instagram, Facebook, YouTube, and WhatsApp. Content formats include reels, posts, carousels, stories, and long-form video. Content workflow statuses include idea, script, shot, editing, ready, scheduled, and published.

Publication metrics include views, reach, likes, comments, shares, saves, and website clicks. Content-level information and platform-specific publication data are represented separately.

## Goals, Tasks, and Alerts

### Goals

Goals represent measurable business objectives, with a name, category, target and current values, unit, date range, and completion state. Progress is expressed relative to the target. Goals are managed under `src/modules/goals/`.

### Tasks

Tasks represent operational work and may optionally be associated with a goal. They include title, description, priority, status, due date, and notes. Priorities are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`; statuses are `TODO`, `IN_PROGRESS`, and `DONE`. The task domain verifies that associated goals belong to the same business.

### Alerts

Alerts surface operational conditions requiring attention. Severities are `INFO`, `WARNING`, and `CRITICAL`. Documented conditions include active products that are out of stock or at/below reorder level, overdue incomplete tasks, and incomplete mandatory stage requirements.

Alert synchronization calculates current conditions, updates matching unresolved alerts, creates new alerts, resolves alerts whose conditions no longer apply, and preserves resolved history.

## Dashboard

The Dashboard is the business command center and an aggregation layer, not an independent source of domain rules. It can combine business, stage, alert, inventory, order, finance, product, and settings information. Calculations and authoritative rules should remain in their owning domain services.

## Backup

The application documents a business-scoped JSON export endpoint:

```text
GET /api/backup
```

Implementation:

```text
src/app/api/backup/route.ts
```

The export covers business-related data such as settings, products, customers, orders and items, expenses, content and publications, goals, tasks, alerts, inventory transactions, and stage progress and transitions. The documented capability is export; a restore/import workflow is not specified.

## Application Routes

The documented App Router pages are:

| Route | Purpose |
|---|---|
| `/` | Root entry and business-state routing |
| `/dashboard` | Business dashboard |
| `/onboarding` | Business onboarding |
| `/stages` | Stage and gate management |
| `/products` | Product catalog |
| `/inventory` | Inventory management |
| `/orders` | Order management |
| `/customers` | Customer management |
| `/finance` | Finance and expenses |
| `/marketing` | Marketing and content |
| `/goals` | Business goals |
| `/tasks` | Operational tasks |
| `/alerts` | Operational alerts |
| `/settings` | Business settings |
| `/api/backup` | Business-scoped JSON export |

The root route uses active-business state to determine the appropriate entry flow. Confirm actual route availability in the source before relying on any route not listed above.

## Shared Application Components

The documented shared layout components are:

| Path | Responsibility |
|---|---|
| `src/components/layout/app-shell.tsx` | Server-side shell and active business context |
| `src/components/layout/app-shell-client.tsx` | Client-side shell, navigation state, and responsive interactions |
| `src/components/layout/sidebar.tsx` | Primary navigation |
| `src/components/layout/top-nav.tsx` | Branding, date/greeting, stage context, and menu controls |
| `src/components/shared/stat-card.tsx` | Reusable statistic card |

Shared utilities are located in `src/lib/`, including the Prisma client (`db.ts`), formatters, and general utilities.

## Serialization

Prisma `Decimal` values must be converted into serializable application values before they are passed to client components. This is particularly relevant to prices, costs, order totals, expenses, inventory valuations, and goal values. Services should provide appropriate DTOs or serialized records rather than exposing database-specific objects directly to client UI.

## Transactions and Concurrency

Use database transactions when multiple related writes must succeed or fail together. Important transactional workflows include business initialization, order creation and inventory deduction, stage advancement, and stock-sensitive production or inventory operations.

For concurrency-sensitive operations, evaluate the need for row locks, unique constraints, conflict detection, and audit records. The documented stage workflow uses a PostgreSQL `FOR UPDATE` lock on the Business row. Inventory operations should similarly protect against concurrent consumption or duplicate movements.

## Environment Configuration

The example environment file is `.env.example`. The documented configuration includes:

```dotenv
DATABASE_URL="..."
ACTIVE_BUSINESS_SLUG="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Use local environment files for actual credentials. Never commit `.env`, `.env.local`, database passwords, API keys, tokens, private credentials, or service-account credentials.

## Local Development

Prerequisites:

- Node.js and npm compatible with the project dependencies
- A reachable PostgreSQL database
- Environment variables configured locally

Clone and install:

```bash
git clone https://github.com/mmehraa/karya.git
cd karya
npm install
```

Create a local environment file based on `.env.example`, then configure the database connection.

Generate Prisma Client, synchronize the development schema, seed reference data, and start the application:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production application |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db push` | Synchronize the Prisma schema to the database |
| `npx prisma db seed` | Seed the database |

Use the repository's current Prisma configuration and package scripts as the final authority if setup instructions change.

## Known Considerations

The project documentation identifies several areas that require attention or confirmation when preparing a deployment:

- **Business selection and authentication:** an active-business cookie provides tenant context, not user authentication. A complete authentication and authorization system must be verified separately. The documented V1 tree describes a `/select-business` redirect target without a corresponding committed route.
- **Finance scope:** finance summaries are not a full accounting system.
- **Backup scope:** JSON export is documented; restore/import is not specified.
- **Automated testing:** the documented package scripts do not include a dedicated test command. Verify current test tooling and coverage before release.
- **Database migrations:** the documented repository layout includes the Prisma schema and seed file; establish and verify a production-safe migration strategy before making production schema changes.

These are deployment and maintenance considerations, not substitutes for inspecting the current implementation.

## Development Principles

1. **Inspect before changing.** Review the schema, relevant routes, module services, actions, validation, types, components, and dependent workflows before implementing a change.
2. **Treat the repository as the implementation source of truth.** Verify behavior in code; update documentation when confirmed behavior or architecture changes.
3. **Preserve tenant isolation.** Resolve the active business server-side and verify ownership for every business-scoped operation.
4. **Keep business rules in domain services.** UI components should not become the authoritative source of business logic.
5. **Validate at server boundaries.** Use Zod for Server Action inputs and return consistent, safe action results.
6. **Protect inventory integrity.** Route stock changes through inventory services and preserve ledger semantics.
7. **Preserve historical truth.** Completed production and order records should retain the snapshots needed to explain historical quantities, costs, and outcomes.
8. **Use atomic transactions.** Multi-step operations affecting related operational or financial records should not leave partial state.
9. **Avoid unnecessary duplication.** Prefer relationships and derived calculations over storing duplicate business facts.
10. **Revalidate affected views.** Mutations should refresh all relevant pages or workspaces.
11. **Maintain consistent UI patterns.** New interfaces should follow the application's shared design conventions and keep workflows clear and efficient.
12. **Test complete workflows.** Validate business rules, tenant boundaries, transaction behavior, and downstream dependencies—not just whether a screen renders.
13. **Protect secrets.** Keep credentials and environment-specific configuration out of version control.
14. **Document meaningful changes.** Update this README when architecture, schema, routes, modules, business rules, workflows, dependencies, or development practices change.

## Testing and Release Readiness

Before considering a substantial change complete, verify the relevant areas:

- TypeScript/build and lint checks
- Input validation and safe error handling
- Tenant isolation and authorization boundaries
- Database constraints, transaction behavior, and concurrency
- Inventory, production, order, and cash-flow consistency where affected
- Historical-cost and audit-history behavior
- Relevant automated tests, where available
- Manual browser verification of the end-to-end workflow
- Dependent pages and modules
- Documentation and Git diff review

A feature is not complete solely because its UI exists. Its server-side rules, data integrity, error states, and connected workflows must also be checked.

## AI-Assisted Development

AI coding tools should inspect the repository before proposing or making changes. They should identify affected models, modules, services, actions, validation schemas, types, UI components, routes, cross-module dependencies, transaction needs, and revalidation requirements.

Do not invent files, assume undocumented rules, or rewrite working modules without a clear reason. Preserve existing conventions, tenant boundaries, transaction semantics, inventory-ledger behavior, and stage-evaluation consistency. Confirm changes against the implementation and update this documentation when appropriate.

## Repository

- Repository: [https://github.com/mmehraa/karya](https://github.com/mmehraa/karya)
- Primary development branch: `main`

The repository implementation is authoritative for current behavior. This README describes the product, architecture, domain responsibilities, development setup, and engineering principles.
