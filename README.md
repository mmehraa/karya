# Karya — Business Operating System

Karya is a Business Operating System (BOS) designed to manage the complete operational lifecycle of a business from onboarding through growth and scale.

The application brings together business setup, products, unit economics, inventory, promotional stock, orders, customers, finance, marketing, goals, tasks, alerts, and business-stage governance into one unified system.

The project is currently at **V1**, which is considered the completed foundational version of the system.

---

## Current Status

**Version:** V1 — Complete
**Primary Branch:** `main`
**Repository:** `mmehraa/karya`

V1 establishes the core architecture and business systems that future versions will build upon.

The objective for V2 and beyond is to extend the existing architecture rather than rebuild the application from scratch.

---

# Product Overview

Karya is structured around the idea that the **Business** is the central entity.

Everything else in the application operates within the context of an active business.

The high-level relationship is:

```
                            BUSINESS
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
   Stage Engine           Business Settings          Dashboard
        │
        └────────────────────────────────────────────────────┐
                                                             │
        ┌──────────────┬──────────────┬──────────────┬───────┴───────┐
        ▼              ▼              ▼              ▼               ▼
    Products       Inventory       Customers       Orders         Finance
        │              │              │              │               │
        │              │              │              └───────┐       │
        │              │              │                      │       │
        │              ▼              │                      ▼       │
        │       Inventory Ledger      │                  Inventory   │
        │              │              │                              │
        │              ▼              │                              │
        │      Promotional Stock      │                              │
        │                             │                              │
        └─────────────────────────────┴──────────────────────────────┘

        ┌──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼
    Marketing        Goals          Tasks          Alerts
```

---

# V1 Features

V1 currently contains the following major systems:

- Business onboarding
- Business profile and settings
- Business lifecycle stages
- Stage requirements and gates
- Automated stage requirement evaluation
- Stage advancement
- Stage transition history
- Product management
- Product unit economics
- Inventory management
- Inventory transaction ledger
- Promotional stock allocation
- Promotional stock release
- Promotional stock dispatch
- Customer management
- Order management
- Order/inventory integration
- Expense management
- Finance summaries
- Marketing/content management
- Content publication tracking
- Marketing metrics
- Goal management
- Task management
- Operational alerts
- Dashboard
- Business-scoped JSON backup

---

# Technology Stack

## Frontend

- Next.js 16.3.5
- React 19.2.8
- TypeScript 5.x
- Tailwind CSS 4
- Lucide React
- `clsx`
- `tailwind-merge`

## Backend

- Next.js Server Components
- Next.js Server Actions
- TypeScript

## Database

- PostgreSQL
- Prisma 7.10.0
- `@prisma/adapter-pg`
- `pg`

## Validation

- Zod 4.6.5

## Utilities

- `date-fns`

## Development

- ESLint 9
- `eslint-config-next`
- `tsx`

---

# Architecture

Karya follows a layered architecture.

The main application flow is:

```
┌──────────────────────────────┐
│          Browser             │
│      Client Components       │
└──────────────┬───────────────┘
               │
               │ User interaction
               ▼
┌──────────────────────────────┐
│       Server Actions         │
│ Context + Validation         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Services            │
│      Business Logic          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Prisma Client          │
│         src/lib/db.ts        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
└──────────────────────────────┘
```

The application separates:

1. Routing and page composition
2. Client-side UI
3. Server Actions
4. Validation
5. Business services
6. Database access
7. Database schema

---

# Application Data Flow

A normal mutation follows this flow:

```
User
  │
  ▼
Client Component
  │
  │ Input
  ▼
Server Action
  │
  ├── Resolve active business
  ├── Validate input with Zod
  │
  ▼
Service
  │
  ├── Business rules
  ├── Tenant validation
  ├── Calculations
  ├── Database transaction if required
  │
  ▼
Prisma
  │
  ▼
PostgreSQL
  │
  ▼
Service Result
  │
  ▼
Server Action
  │
  ├── Return result
  └── Revalidate affected routes
  │
  ▼
Client UI
```

Server-rendered reads generally follow:

```
Next.js Page
     │
     ▼
getDashboardContext()
     │
     ▼
Module Service
     │
     ▼
Prisma
     │
     ▼
Serialized Data
     │
     ▼
Client Component
```

---

# Business and Tenant Architecture

The Business is the central tenant entity.

The relationship is:

```
Business
│
├── BusinessSettings
├── Products
├── Customers
├── Orders
├── Expenses
├── Content
├── Goals
├── Tasks
├── Alerts
├── Inventory Transactions
├── Promotional Dispatches
├── Stage Progress
└── Stage Transitions
```

The currently active business is stored in an HTTP-only cookie:

```
bos_active_business_id
```

The active business is resolved server-side.

The important files are:

```
src/modules/business/dashboard-context.ts
src/modules/business/tenant-resolution.ts
```

### `dashboard-context.ts`

Responsible for:

- resolving the active business
- retrieving the active business ID
- loading business information
- loading current stage information
- providing business context to server-side operations

### `tenant-resolution.ts`

Responsible for:

- reading the active business cookie
- setting the active business cookie
- clearing the active business cookie
- listing available businesses
- counting businesses

A client-provided `businessId` must never be treated as the authoritative tenant identifier.

---

# Module Architecture

The project follows a consistent domain-module structure:

```
src/modules/<module>/

├── actions.ts
├── components/
│   ├── ...
├── services.ts
├── types.ts
└── validation.ts
```

Each layer has a specific responsibility.

## `actions.ts`

Server Actions.

Responsibilities:

- receive user input
- resolve active business
- validate input
- call services
- handle errors
- revalidate affected pages

## `validation.ts`

Input validation.

Uses Zod to define:

- input schemas
- required fields
- optional fields
- numeric constraints
- enum validation
- normalization rules

## `types.ts`

Application-facing types.

Used for:

- serialized database records
- client DTOs
- summaries
- KPIs
- action results

## `services.ts`

Business logic.

Responsible for:

- Prisma queries
- calculations
- business rules
- transaction handling
- tenant-scoped operations
- serialization

## `components/`

Client-side UI.

Contains:

- tables
- forms
- dialogs
- cards
- interactive controls
- client-side state

Database logic should not be placed directly inside client components.

---

# Database Architecture

The database schema is defined in:

```
prisma/schema.prisma
```

The application uses PostgreSQL.

The major database model groups are:

## Business

- `Business`
- `BusinessSettings`

## Stage System

- `StageDefinition`
- `StageRequirementDef`
- `BusinessStageProgress`
- `StageTransition`

## Products

- `Product`

## Inventory

- `InventoryTransaction`

## Commerce

- `Customer`
- `Order`
- `OrderItem`

## Finance

- `Expense`

## Promotional Stock

- `PromotionalDispatch`

## Marketing

- `ContentItem`
- `ContentPublication`

## Goals

- `Goal`

## Tasks

- `Task`

## Alerts

- `Alert`

Most business-owned records contain a `businessId`.

This is a core part of the application's tenant isolation architecture.

---

# Stage and Gate Engine

The Stage Engine controls the business lifecycle.

The current lifecycle contains nine stages:

| ID | Stage |
| --- | --- |
| 0 | Idea |
| 1 | Pre-launch |
| 2 | Launch |
| 3 | Validation |
| 4 | Growth |
| 5 | Scale |
| 6 | Funding |
| 7 | Expansion |
| 8 | Mature/Enterprise |

Stage definitions and their requirements are seeded through:

```
prisma/seed.ts
```

Each requirement can have:

- code
- title
- description
- requirement type
- evaluation mode
- evaluator rule
- evaluator configuration
- ordering

Requirement types:

```
MANDATORY
RECOMMENDED
OPTIONAL
```

Evaluation modes:

```
MANUAL
METRIC_THRESHOLD
SYSTEM_CHECK
```

The important files are:

```
src/modules/stages/services.ts
src/modules/stages/evaluators.ts
src/modules/stages/actions.ts
```

The same evaluation logic is used when displaying stage readiness and when advancing a business.

This prevents the UI and advancement logic from having different definitions of "ready".

---

# Stage Advancement

Stage advancement is sequential.

The next valid stage is:

```
currentStage + 1
```

The advancement process:

1. Resolve the active business.
2. Validate the requested stage.
3. Start a database transaction.
4. Lock the Business row.
5. Verify that the current stage has not changed.
6. Find the next stage.
7. Load mandatory requirements.
8. Evaluate mandatory requirements.
9. Reject advancement if any mandatory requirement is incomplete.
10. Create a stage transition record.
11. Update the business's current stage.
12. Commit the transaction.
13. Revalidate the dashboard.

This provides concurrency protection and an audit trail.

---

# Product Architecture

Products are managed by:

```
src/modules/products/
```

A Product contains information such as:

- name
- SKU
- category
- description
- selling price
- COGS
- packaging cost
- variable cost
- current stock
- promotional stock
- reorder level
- supplier
- status

Product statuses:

```
DRAFT
ACTIVE
ARCHIVED
```

Product unit economics are based on:

```
Selling Price
      -
COGS
      -
Packaging Cost
      -
Variable Cost
      =
Unit Gross Profit
```

Product management owns product information and economics.

Inventory management owns stock movement.

Therefore product forms should not directly manipulate inventory quantities.

---

# Inventory Architecture

Inventory uses a transaction-ledger architecture.

The primary inventory movement model is:

```
InventoryTransaction
```

Transaction types include:

```
INITIAL_STOCK
PRODUCTION_RUN
PURCHASE_RESTOCK
SALE
RETURN_RESTOCK
DAMAGED_WRITE_OFF
MANUAL_AUDIT
PROMOTIONAL_DISPATCH
```

The core inventory principle is:

```
InventoryTransaction
        =
Source of truth for stock movement
```

`Product.currentStock` is maintained as a fast-read stock value.

---

# Available Stock

Promotional inventory is separated from normal available stock.

The formula is:

```
Available Stock
=
Current Stock
-
Promotional Stock
```

This prevents stock reserved for promotional activities from accidentally being sold through normal orders.

---

# Promotional Stock

Promotional stock is handled through the Inventory module.

Relevant files:

```
src/modules/inventory/actions.ts
src/modules/inventory/services.ts
src/modules/inventory/types.ts
src/modules/inventory/validation.ts
src/modules/inventory/components/promotional-stock-dialog.tsx
```

## Allocation

When stock is allocated for promotional use:

```
Current Stock       unchanged
Promotional Stock   increases
Available Stock     decreases
```

## Release

When promotional stock is released:

```
Current Stock       unchanged
Promotional Stock   decreases
Available Stock     increases
```

## Promotional Dispatch

When promotional stock is actually dispatched:

```
Current Stock       decreases
Promotional Stock   decreases
```

A promotional dispatch also creates:

1. `InventoryTransaction`
2. `Expense` with promotional category
3. `PromotionalDispatch`

This connects physical stock usage with its financial cost.

---

# Order Architecture

Orders are handled by:

```
src/modules/orders/
```

Order creation integrates directly with inventory.

The process is:

```
Customer
    │
    ▼
Order
    │
    ├── Order Items
    │       │
    │       └── Products
    │
    └── Inventory
            │
            └── InventoryTransaction
```

Order creation:

1. Verifies customer ownership.
2. Loads selected products.
3. Verifies product ownership.
4. Requires products to be active.
5. Requires complete unit economics.
6. Calculates totals.
7. Generates the next order number.
8. Creates the order.
9. Creates order items.
10. Stores cost-price snapshots.
11. Deducts inventory.
12. Returns the serialized order.

The complete operation occurs inside a database transaction.

If inventory deduction fails, the order transaction is rolled back.

Order cancellation is not treated as a simple status change because inventory has already been deducted during order creation. A dedicated cancellation workflow is expected for future implementation.

---

# Customer Architecture

Customers are managed through:

```
src/modules/customers/
```

Structure:

```
src/modules/customers/
├── actions.ts
├── components/
│   ├── customer-client.tsx
│   ├── customer-form-dialog.tsx
│   └── customer-table.tsx
├── services.ts
├── types.ts
└── validation.ts
```

The Customer module is responsible for:

- customer creation
- customer editing
- customer listing
- customer deletion/management
- customer validation
- tenant isolation

Orders reference customers through the business-scoped customer relationship.

---

# Finance Architecture

Finance currently focuses on expenses and financial summaries.

The main model is:

```
Expense
```

Expense categories include:

```
Product formulation
Packaging
Printing / labels
Shipping
Marketing
Promotional
Equipment
Website / software
Legal / compliance
Operations
Other
```

Finance provides:

- expense creation
- expense editing
- expense listing
- expense summaries
- category summaries

Revenue is derived from paid orders.

The current high-level calculation is:

```
Revenue
   -
Expenses
   =
Net
```

The current V1 finance system is not intended to be a full accounting system.

---

# Marketing Architecture

Marketing is a content planning and measurement module.

The relationship is:

```
ContentItem
      │
      └── ContentPublication
```

Supported platforms include:

- Instagram
- Facebook
- YouTube
- WhatsApp

Content types include:

- Reel
- Post
- Carousel
- Story
- Long video

Content statuses include:

```
Idea
Script
Shot
Editing
Ready
Scheduled
Published
```

Publication metrics include:

- views
- reach
- likes
- comments
- shares
- saves
- website clicks

The Marketing module manages both content-level information and platform-specific publication information.

---

# Goals Architecture

Goals represent measurable business objectives.

A Goal contains:

- name
- category
- target value
- current value
- unit
- start date
- end date
- completion state

Progress is calculated from:

```
Current Value / Target Value
```

Goals are managed through:

```
src/modules/goals/
```

---

# Task Architecture

Tasks represent operational work.

Tasks can optionally belong to a Goal.

The relationship is:

```
Goal
 │
 └── Task
```

Task priorities:

```
LOW
MEDIUM
HIGH
CRITICAL
```

Task statuses:

```
TODO
IN_PROGRESS
DONE
```

Tasks contain:

- title
- description
- priority
- status
- due date
- optional goal
- notes

The Task module validates that referenced goals belong to the same business.

---

# Alert Architecture

Alerts represent operational conditions that require attention.

Alert severities:

```
INFO
WARNING
CRITICAL
```

Current alert conditions include:

## Inventory

- active product out of stock
- active product at or below reorder level

## Tasks

- overdue incomplete tasks

## Stage

- incomplete mandatory requirements

The alert synchronization process:

1. Calculates current alert conditions.
2. Finds existing unresolved alerts.
3. Updates matching alerts.
4. Creates new alerts.
5. Resolves alerts whose underlying conditions no longer exist.
6. Preserves resolved alert history.

---

# Dashboard Architecture

The Dashboard is the main business command center.

It aggregates information from multiple modules.

The dashboard can use information from:

```
Business
Stage
Alerts
Inventory
Orders
Finance
Products
Settings
```

The dashboard is therefore an aggregation layer rather than an independent business domain.

Business rules should remain in the relevant module services rather than being duplicated inside the dashboard.

---

# Backup System

Karya provides a business-scoped JSON backup endpoint:

```
GET /api/backup
```

Implementation:

```
src/app/api/backup/route.ts
```

The backup includes business-scoped information such as:

- business
- settings
- products
- customers
- orders
- order items
- expenses
- content
- content publications
- goals
- tasks
- alerts
- inventory transactions
- stage progress
- stage transitions

The current system supports export only.

There is no restore/import workflow in V1.

---

# Complete Directory Structure

```
karya/
├── .env.example
├── .gitignore
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── prisma.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── app/
    │   ├── alerts/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── api/
    │   │   └── backup/
    │   │       └── route.ts
    │   ├── customers/
    │   │   └── page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── finance/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── goals/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── inventory/
    │   │   ├── layout.tsx
    │   │   ├── loading.tsx
    │   │   └── page.tsx
    │   ├── marketing/
    │   │   └── page.tsx
    │   ├── onboarding/
    │   │   └── page.tsx
    │   ├── orders/
    │   │   └── page.tsx
    │   ├── products/
    │   │   ├── layout.tsx
    │   │   ├── loading.tsx
    │   │   └── page.tsx
    │   ├── settings/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── stages/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── tasks/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── app-shell-client.tsx
    │   │   ├── app-shell.tsx
    │   │   ├── sidebar.tsx
    │   │   └── top-nav.tsx
    │   └── shared/
    │       └── stat-card.tsx
    ├── lib/
    │   ├── db.ts
    │   ├── formatters.ts
    │   └── utils.ts
    └── modules/
        ├── alerts/
        ├── business/
        ├── customers/
        ├── finance/
        ├── goals/
        ├── inventory/
        ├── marketing/
        ├── orders/
        ├── products/
        ├── settings/
        ├── stages/
        └── tasks/
```

---

# App Routes

The current application routes are:

| Route | Purpose |
| --- | --- |
| `/` | Root routing/entry point |
| `/dashboard` | Business dashboard |
| `/onboarding` | Business onboarding |
| `/stages` | Stage and gate management |
| `/products` | Product catalog |
| `/inventory` | Inventory management |
| `/orders` | Order management |
| `/customers` | Customer management |
| `/finance` | Finance and expenses |
| `/marketing` | Marketing/content management |
| `/goals` | Business goals |
| `/tasks` | Operational tasks |
| `/alerts` | Operational alerts |
| `/settings` | Business settings |
| `/api/backup` | Business-scoped JSON export |

The root page currently uses the active business state to determine whether the user should go to onboarding, dashboard, or business selection.

---

# Root and Shared Components

## `src/components/layout/app-shell.tsx`

Server-side application shell.

Responsible for:

- loading active business context
- obtaining business name
- obtaining industry
- obtaining current stage
- passing context to the client shell

## `src/components/layout/app-shell-client.tsx`

Client-side application shell.

Responsible for:

- sidebar state
- navigation
- responsive UI
- interactive layout behavior

## `src/components/layout/sidebar.tsx`

Main navigation.

Current navigation includes:

- Dashboard
- Stage & Gates
- Products
- Inventory
- Orders
- Customers
- Finance
- Marketing
- Goals
- Tasks
- Alerts
- Settings

## `src/components/layout/top-nav.tsx`

Top navigation.

Contains:

- Karya branding
- current date
- time-based greeting
- current stage
- menu controls

## `src/components/shared/stat-card.tsx`

Reusable dashboard/statistic card component.

---

# Tenant Isolation

Tenant isolation is one of the most important architectural rules in Karya.

Every business-owned database query must be scoped to the active business.

Preferred pattern:

```
businessId + recordId
```

For example:

```
where: {
  businessId,
  id,
}
```

Do not rely only on a client-provided record ID.

Incorrect:

```
db.product.findUnique({
  where: {
    id: input.id,
  },
});
```

Preferred:

```
db.product.findUnique({
  where: {
    businessId_id: {
      businessId,
      id: input.id,
    },
  },
});
```

The exact Prisma query should follow the composite keys defined in the current schema.

---

# Serialization

Prisma Decimal values are converted before being passed to client components.

The general pattern is:

```
Prisma Decimal
      │
      ▼
Number
      │
      ▼
Serialized DTO
      │
      ▼
Client Component
```

This applies particularly to:

- prices
- COGS
- packaging costs
- variable costs
- order totals
- expenses
- inventory costs
- goal values

---

# Transactions and Concurrency

Transactions are used whenever multiple database operations need to succeed or fail together.

## Business Creation

Business creation and initialization are handled together.

## Orders

Order creation, order items, and inventory deduction are transactional.

## Stage Advancement

Stage advancement:

- locks the business
- evaluates requirements
- creates transition history
- updates current stage

inside a transaction.

The Business row is locked using PostgreSQL `FOR UPDATE`.

## Inventory

Stock-sensitive operations use database locking to prevent concurrent operations from consuming the same stock incorrectly.

When implementing V2 functionality, determine whether the operation requires:

- transaction
- row locking
- unique constraints
- conflict detection
- audit records

---

# Environment Variables

The example environment file is:

```
.env.example
```

Expected variables include:

```
DATABASE_URL="..."
ACTIVE_BUSINESS_SLUG="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The database URL is used by the current application and Prisma configuration.

Never commit:

```
.env
.env.local
```

or any files containing:

- database passwords
- API keys
- tokens
- private credentials
- service-account credentials

---

# Local Development

Clone the repository:

```
git clone https://github.com/mmehraa/karya.git
cd karya
```

Install dependencies:

```
npm install
```

Create your local environment file based on:

```
.env.example
```

Generate Prisma Client:

```
npx prisma generate
```

Synchronize the development database:

```
npx prisma db push
```

Seed the database:

```
npx prisma db seed
```

Start development:

```
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Useful Commands

Start development:

```
npm run dev
```

Build production:

```
npm run build
```

Start production:

```
npm run start
```

Lint:

```
npm run lint
```

Generate Prisma Client:

```
npx prisma generate
```

Push Prisma schema:

```
npx prisma db push
```

Seed database:

```
npx prisma db seed
```

---

# V1 Known Gaps

The following points are intentionally documented so future development does not incorrectly assume that these systems already exist.

## Business Selection

`src/app/page.tsx` redirects to:

```
/select-business
```

when businesses exist but no active business is selected.

There is currently no `/select-business` route in the committed V1 source tree.

Therefore the multi-business selection flow appears incomplete.

## Authentication

V1 uses the active-business HTTP-only cookie for tenant context.

There is currently no complete user authentication/authorization system represented in the Prisma schema.

Business selection should not be treated as user authentication.

## Finance

Finance is currently an expense and reporting system.

It is not a full accounting system.

## Backup

Backup currently supports JSON export only.

There is no restore/import workflow.

## Tests

The current project does not define a dedicated automated test script.

Automated test coverage is therefore not currently part of the V1 workflow.

## Prisma Migrations

The current repository contains:

```
prisma/schema.prisma
prisma/seed.ts
```

but no committed:

```
prisma/migrations/
```

directory.

A formal migration strategy should be established for future production database changes.

---

# Development Rules for V2

V2 should extend V1 rather than replace the architecture unnecessarily.

## 1. Inspect Before Implementing

Before adding a feature, inspect:

```
prisma/schema.prisma
relevant module
relevant services.ts
relevant actions.ts
relevant validation.ts
relevant types.ts
relevant components
relevant App Router page
```

Understand how the new feature fits into the existing architecture before writing code.

## 2. Preserve Tenant Isolation

Every new business-owned record must be scoped to `businessId`.

## 3. Keep Database Logic Server-Side

Client components should not directly access Prisma.

## 4. Validate Mutations

Use Zod validation at Server Action boundaries.

## 5. Keep Business Rules in Services

Do not duplicate important business rules across multiple UI components.

## 6. Preserve Inventory Integrity

Stock changes should flow through the Inventory service.

Do not directly manipulate stock from unrelated modules.

## 7. Preserve Stage Logic

Do not create a second definition of stage readiness.

The Stage Engine should remain the authoritative source for stage requirement evaluation.

## 8. Use Transactions

Use database transactions when multiple related records must change atomically.

## 9. Revalidate Dependent Pages

After mutations, revalidate every workspace affected by the changed data.

## 10. Do Not Rewrite Working Systems Without Reason

Existing V1 functionality should be extended incrementally.

Broad rewrites should only happen when there is a clear architectural reason.

## 11. Protect Secrets

Never commit environment secrets.

## 12. Update Documentation

Whenever V2 introduces:

- a new module
- database models
- routes
- architecture
- business rules
- dependencies
- major workflows

this README should be updated.

---

# AI-Assisted Development Context

Karya is designed to be developed with AI-assisted coding tools.

The repository should be treated as the authoritative source of truth.

When an AI agent is asked to modify the project, it should first inspect the existing implementation rather than assuming how the architecture works.

Before implementing a feature, determine:

```
Affected database models
        │
        ▼
Affected module(s)
        │
        ▼
Affected services
        │
        ▼
Affected Server Actions
        │
        ▼
Validation changes
        │
        ▼
Types / DTO changes
        │
        ▼
Client component changes
        │
        ▼
App Router changes
        │
        ▼
Cross-module dependencies
        │
        ▼
Transaction requirements
        │
        ▼
Revalidation requirements
```

AI development should follow these principles:

- Inspect the repository first.
- Do not invent files that do not exist.
- Do not assume undocumented business rules.
- Do not rewrite working modules unnecessarily.
- Preserve existing naming conventions.
- Preserve tenant isolation.
- Preserve transaction boundaries.
- Preserve inventory ledger semantics.
- Preserve stage evaluator semantics.
- Keep client and server responsibilities separated.
- Update the README when architecture changes.

---

# Architecture Cheat Sheet

```
                              KARYA
                                │
                                ▼
                         ACTIVE BUSINESS
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
        STAGE ENGINE       SETTINGS           DASHBOARD
             │
             ▼
        REQUIREMENTS
             │
             ├───────────────────────────────────────────────┐
             │                                               │
             ▼                                               ▼
         PRODUCTS                                        BUSINESS DATA
             │                                               │
             ▼                         ┌─────────────────────┼─────────────────────┐
      UNIT ECONOMICS                   │                     │                     │
                                      ▼                     ▼                     ▼
                                  CUSTOMERS              ORDERS                FINANCE
                                                            │
                                                            ▼
                                                        INVENTORY
                                                            │
                                                            ▼
                                                  INVENTORY TRANSACTIONS
                                                            │
                                                            ▼
                                                  PROMOTIONAL STOCK

        MARKETING
             │
             ▼
        CONTENT ITEM
             │
             ▼
        PUBLICATION
             │
       ┌─────┼─────┬──────┐
       ▼     ▼     ▼      ▼
    Instagram Facebook YouTube WhatsApp

        GOALS
          │
          ▼
        TASKS

        ALERTS
          │
          ├── Inventory
          ├── Tasks
          └── Stage Requirements
```

---

# Cross-Module Dependencies

```
Business
 │
 ├── Dashboard
 │    ├── Stage
 │    ├── Alerts
 │    ├── Inventory
 │    ├── Orders
 │    └── Finance
 │
 ├── Stage Engine
 │    └── Evaluators
 │
 ├── Products
 │    └── Unit Economics
 │
 ├── Orders
 │    ├── Customers
 │    ├── Products
 │    └── Inventory
 │
 ├── Inventory
 │    ├── Products
 │    ├── Inventory Transactions
 │    └── Promotional Dispatches
 │
 ├── Promotional Stock
 │    ├── Inventory
 │    └── Finance
 │
 ├── Finance
 │    └── Expenses
 │
 ├── Marketing
 │    └── Publications
 │
 ├── Goals
 │    └── Tasks
 │
 └── Alerts
      ├── Inventory
      ├── Tasks
      └── Stage Engine
```

---

# Source of Truth Hierarchy

When there is a conflict between documentation, UI assumptions, and implementation, the following hierarchy should be used:

```
1. prisma/schema.prisma
2. Domain services
3. Server Actions
4. App Router pages
5. Client components
6. README.md
```

The README documents the application.

It must not become a separate source of business logic.

---

# V1 Completion

Karya V1 establishes the foundation for the Business Operating System.

The completed V1 foundation includes:

```
Business
   │
   ├── Onboarding
   ├── Settings
   ├── Stage Engine
   ├── Products
   ├── Unit Economics
   ├── Inventory
   ├── Promotional Stock
   ├── Orders
   ├── Customers
   ├── Finance
   ├── Marketing
   ├── Goals
   ├── Tasks
   ├── Alerts
   ├── Dashboard
   └── Backup
```

V2 Development Roadmap

Karya V2 is being developed as a complete Business Operating System rather than as a collection of disconnected **CRUD** modules.

The purpose of V2 is to connect the complete business lifecycle:

Business ↓ Products ↓ ### Raw Materials ↓ Packaging ↓ ### Product Economics ↓ Production ↓ ### Finished Inventory ↓ Orders ↓ Revenue ↓ ### Cash Flow ↓ ### Business Intelligence ↓ ### Investor Metrics

The V2 development process is divided into seven phases. Each phase should be implemented, tested, manually verified, documented, and pushed to GitHub before moving to the next phase.

The repository code is the implementation source of truth. The **README** documents the intended architecture, business rules, workflows, decisions, and future development direction.

V2 Development Process

**PHASE** 1 | ✅ Complete
Product Economics & Cost Engine
        ↓
**PHASE** 2 | ✅ Complete
Production & Product UI Integration
        ↓
**PHASE** 3
Order Economics & Cash Flow
        ↓
**PHASE** 4
### Business Intelligence
        ↓
**PHASE** 5
Investor Metrics & Decision Layer
        ↓
**PHASE** 6
Application UX, Information Architecture & Full UI Redesign
        ↓
**PHASE** 7
Cleanup, Hardening & Launch

**PHASE** 1 | ✅ **COMPLETE**

Product Economics & Cost Engine

Purpose

Phase 1 establishes the foundation for accurate product costing.

The objective is to make product cost a calculated business value based on actual inventory purchases, formulations, packaging configurations, and weighted-average inventory costs rather than manually entered static numbers.

Karya should be able to answer:

"What does it currently cost me to produce one unit of this product?"

The system must understand the difference between the cost of a raw material, the cost of packaging, the total production cost, and later the costs associated with selling and fulfilling an order.

Core architecture

### Raw Material Purchase

        ↓
### Raw Material Inventory
        ↓
### Weighted Average Cost
        ↓
### Product Formulation
        ↓
### Raw Material Cost / Unit

### Packaging Purchase

        ↓
### Packaging Inventory
        ↓
### Weighted Average Cost
        ↓
### Product Packaging Configuration
        ↓
Packaging Cost / Unit

Raw Material Cost / Unit
- Packaging Cost / Unit
        ↓
Pre-shipping Unit Cost
        ↓
### Contribution Profit
        ↓
### Contribution Margin

Completed functionality

Raw material inventory

Raw material purchases

Raw material weighted-average costing

Raw material consumption

Raw material purchase deletion

Raw material consumption deletion

Packaging material inventory

Packaging purchases

Packaging weighted-average costing

Packaging consumption

Packaging purchase deletion

Packaging consumption deletion

Product formulations

Formulation items

Formulation versioning

Active/inactive formulation versions

Product packaging configurations

Packaging configuration items

Packaging configuration versioning

Active/inactive packaging configuration versions

Dynamic raw-material costing

Dynamic packaging costing

Product economics

Raw-material cost per unit

Packaging cost per unit

Pre-shipping unit cost

Contribution profit per unit

Contribution margin

Product-level economics in the Product Catalog

Product configuration history

Tenant isolation

Transaction-safe inventory operations

Server-side validation

Costing and inventory tests

Weighted-average costing rule

Raw-material and packaging costs are based on weighted-average inventory cost.

For example:

Purchase 1: 1,000g for ₹**300** Cost = ₹0.30/g

Purchase 2: 1,000g for ₹**550** Cost = ₹0.55/g

Total: 2,000g Total value = ₹**850**

Weighted average: ₹**850** / 2,000g = ₹0.**425**/g

Future purchases change the current weighted-average cost.

Historical production records must not silently change when current inventory costs change.

Important business rule

Raw-material and packaging purchases represent inventory acquisition and cash outflow.

They should not automatically be duplicated as operating expenses in the Finance expense ledger.

The future Cash Flow layer will connect inventory purchases to actual cash movement.

Phase 1 completion standard

Phase 1 is considered complete because:

Costing logic is implemented.

Inventory calculations are implemented.

Product formulations work.

Packaging configurations work.

Product Economics is dynamically calculated.

Relevant workflows were tested.

TypeScript checks pass.

Product UI reflects calculated economics.

The implementation is integrated with the existing architecture.

**PHASE** 2 | ✅ **COMPLETE**

Production & Product UI Integration

Purpose

Phase 2 connects product formulations, packaging configurations, inventory, and finished-product inventory into a complete production workflow.

Karya should be able to answer:

"What did I produce, using which formulation and packaging configuration, how much inventory did production consume, and what did that production batch actually cost?"

Production lifecycle

### Create Production Batch

        ↓
**DRAFT**
        ↓
### Complete Batch
        ↓
### Validate Inventory
        ↓
### Consume Raw Materials
        ↓
### Consume Packaging
        ↓
### Calculate Actual Batch Cost
        ↓
Add Finished Units to Product Inventory
        ↓
### Record Production Transaction
        ↓
**COMPLETED**

Cancellation:

**DRAFT** ↓ **CANCELLED**

Completed production functionality

Production Batch model

Production Batch status:

**DRAFT**

**COMPLETED**

**CANCELLED**

Batch creation

Batch numbering

Planned quantity

Actual produced quantity

Production notes

Batch completion

Batch cancellation

Cancelled-batch deletion

Raw-material consumption records

Packaging consumption records

Actual raw-material cost

Actual packaging cost

Total batch cost

Cost per produced unit

Finished-product inventory increase

Production inventory transactions

Insufficient inventory protection

Atomic production transactions

Double-completion protection

Tenant isolation

Server-side validation

Batch history

Batch detail/expanded view

Production workspace

The production workspace is available at:

/production-batches

It includes:

Total batches

Draft batches

Completed batches

Units produced

Total production cost

Product filtering

Status filtering

Batch listing

Batch details

Configuration used by each batch

Production cost breakdown

Create batch workflow

Complete batch workflow

Cancel batch workflow

Delete cancelled batch workflow

Product integration

The Product Catalog includes production information such as:

Production history

Number of batches

Completed batches

Units produced

Latest production cost

Batch-level history

Formulation version used

Packaging configuration version used

Production costing rule

Creating a production batch does not consume inventory.

A draft batch represents a production plan only.

Inventory is consumed only when the batch is completed.

The final historical batch cost is calculated using the actual produced quantity and the inventory costs applicable at the time of completion.

Version deletion rules

Formulation and packaging configuration versions follow these rules:

Any inactive version can be deleted.

An active version can also be deleted.

If the active version is deleted and another version remains, the latest remaining version becomes active.

If the deleted version was the only version, no version remains.

A formulation/configuration referenced by a production batch cannot be deleted.

Deletion is tenant-scoped.

Deletion is transaction-safe.

Cancelled-batch deletion rules

Only cancelled batches can be deleted.

Draft batches cannot be deleted.

Completed batches cannot be deleted.

Deleting a cancelled batch does not consume or restore inventory.

The server validates the cancelled status before deletion.

Phase 2 completion standard

Phase 2 is considered complete because:

The production backend is implemented.

Production workspace is implemented.

Product production history is integrated.

Production costing is implemented.

Inventory consumption is implemented.

Finished inventory is implemented.

Cancellation and cancelled-batch deletion are implemented.

Relevant production workflows were manually tested.

TypeScript checks pass.

UI/navigation integration is working.

**PHASE** 3

Order Economics & Cash Flow

Purpose

Phase 3 connects production economics and finished-product inventory to actual customer orders and actual money movement.

The objective is to make Karya answer:

"I sold this product for ₹X. What did the product cost me, what did it cost to fulfil the order, and how much contribution did the order actually generate?*

A second objective is to answer:

*How much actual cash came into or went out of the business?"

These are related but different questions and must not be mixed.

3.1 Order Economics

The order system should connect to the Product Economics engine.

The order cost should use the appropriate product cost rather than relying on obsolete manually entered product cost fields.

Historical orders should retain the cost information necessary to explain the economics of the order at the time it occurred.

Planned order economics

### Selling Price

− Discount # + Shipping Charged to Customer ### Order Revenue

### Product Cost

- Actual Shipping Cost
- Payment Gateway Fee
# + Other Variable Order Costs
### Variable Order Cost

### Order Revenue

# − Variable Order Cost ### Contribution Profit

The exact treatment of shipping revenue, discounts, refunds, taxes, payment fees, and other variable costs must be finalized before implementation.

Planned functionality

Order creation

Order editing

Order number

Order date

Customer

Order items

Product

Quantity

Selling price

Discounts

Shipping charged

Revenue

Payment status

Fulfillment status

Sales channel

Payment method

Finished-product inventory consumption

Product cost snapshot

Shipping cost

Payment gateway cost

Other variable order costs

Contribution profit

Contribution margin

Historical order economics

Inventory rule

Orders should consume finished-product inventory through controlled inventory services.

The system must prevent invalid negative inventory unless a deliberate future backorder/overselling mechanism is introduced.

3.2 Cash Flow

Phase 3 introduces a dedicated cash transaction concept.

Karya must distinguish:

Revenue Inventory P&L Expense ### Cash Movement

A transaction may affect more than one concept.

For example:

### Raw Material Purchase

Cash ↓ Inventory ↑

This does not mean the entire purchase should automatically become a traditional operating expense.

Planned cash transaction types

Potential categories include:

Customer payment

Raw material purchase

Packaging purchase

Shipping payment

Payment gateway fee

Refund

Equipment purchase

Marketing spend

Software spend

Operating expense

Other business cash inflow

Other business cash outflow

Important rule

Do not duplicate inventory purchases into the Finance expense ledger simply because money left the bank.

Inventory acquisition and operating expense are different concepts.

The Cash Flow layer exists specifically to represent actual cash movement.

Phase 3 completion target

At the end of Phase 3, Karya should be able to trace:

### Customer Order

      ↓
Revenue
      ↓
### Product Cost
      ↓
### Variable Order Costs
      ↓
### Contribution Profit
      ↓
Cash Received / Cash Paid

while keeping inventory, expenses, and cash conceptually distinct.

**PHASE** 4

### Business Intelligence

Purpose

Phase 4 turns Karya's operational data into useful business intelligence.

The application should move from:

*What happened?*

to:

*What is happening in my business?*

and:

"Where is money being made, spent, tied up, or lost?"

The BI layer should derive information from the underlying operational modules rather than creating duplicate manual datasets.

4.1 Revenue Intelligence

Planned metrics:

Total revenue

Revenue by month

Revenue by product

Revenue by order

Revenue by sales channel

Units sold

Average order value

Revenue growth

4.2 Product Intelligence

Planned metrics:

Selling price

Raw-material cost

Packaging cost

Pre-shipping cost

Contribution profit

Contribution margin

Production cost

Production cost changes

Product sales

Product profitability

Units produced

Units sold

4.3 Production Intelligence

Planned metrics:

Total batches

Completed batches

Cancelled batches

Units produced

Production cost

Average production cost

Production cost by product

Production trends

Production volume over time

4.4 Inventory Intelligence

Planned metrics:

Raw-material inventory value

Packaging inventory value

Finished-product inventory value

Total inventory value

Inventory purchases

Inventory consumption

Inventory movement

Low-stock items

Inventory concentration

Stock coverage where sufficient data exists

4.5 Expense Intelligence

Planned metrics:

Total operating expenses

Expenses by category

Monthly expenses

Expense trends

Expense concentration

Major spending categories

4.6 Cash Flow Intelligence

Planned metrics:

Total cash inflow

Total cash outflow

Net cash movement

Inventory-related cash outflow

Operating cash outflow

Customer collections

Refunds

Shipping payments

Payment fees

BI principles

The BI layer must:

use consistent time periods

use consistent metric definitions

avoid misleading calculations

clearly distinguish missing data from zero

allow drill-down from summary metrics to source records where practical

avoid decorative charts that do not provide useful information

prioritize actionable business information

If a metric cannot be calculated reliably, Karya should display that it is unavailable or incomplete rather than inventing a value.

**PHASE** 5

Investor Metrics & Decision Layer

Purpose

Phase 5 builds the higher-level metrics needed to understand the business from a founder, strategic, and investor perspective.

This phase should be based primarily on the operational and financial data created in Phases 1–4.

Karya should not create duplicate manual values when a metric can be calculated from existing business data.

5.1 Business Fundamentals

Potential metrics:

Revenue

Revenue growth

Units sold

Units produced

Contribution profit

Contribution margin

Operating expenses

Cash movement

Inventory value

Customer count

Order count

5.2 Unit Economics

Potential metrics:

Selling price

Product cost

Variable order costs

Contribution profit

Contribution margin

Average order value

Customer acquisition cost

Lifetime value

**LTV**

Only metrics with sufficient supporting data should be displayed.

5.3 Startup / Investor Metrics

Potential metrics:

**TAM**

**SAM**

**SOM**

**COGS**

Gross margin

Contribution margin

Burn rate

Runway

Break-even point

Revenue growth

Customer growth

Order growth

Unit growth

Data classification

Every investor/business metric should be distinguishable as:

Actual Calculated Estimated User-provided assumption Unavailable

Karya must never present an assumption as actual historical business performance.

Decision layer

Where appropriate, Karya may eventually surface insights such as:

cost changes

margin changes

unusual spending

inventory exposure

production trends

revenue trends

break-even progress

cash runway

These should be based on transparent calculations and clearly explain the underlying data.

**PHASE** 6

Application UX, Information Architecture & Full UI Redesign

Purpose

Phase 6 is a deliberate step back from feature development.

The objective is to redesign Karya as a finished, coherent application after the major business functionality has been built.

This is not merely a cosmetic redesign.

It is a complete review of:

Information architecture

Navigation

Page structure

Workflow design

Scrolling

Visual hierarchy

Component consistency

Iconography

Typography

Spacing

Responsive behavior

Daily usability

The goal is for Karya to feel like one application, not a collection of separate technical modules.

6.1 Backend Modules vs UI Pages

The backend should continue to use clean domain modules.

However:

Backend module boundaries must not dictate UI page boundaries.

Several backend modules may belong inside one user-facing workspace.

For example, instead of requiring the user to navigate through:

Products ↓ Configure ↓ Formulation ↓ Packaging ↓ Production ↓ ### Production History

the final UI may provide a single:

### Product Workspace

containing:

Product ├── Pricing ├── Unit Economics ├── Formulation ├── Packaging ├── Inventory └── Production History

The underlying services and modules can remain separate.

This is a UI/information-architecture decision, not a reason to merge backend domain logic.

6.2 Reduce Unnecessary Scrolling

A major design requirement is:

The user does not want to unnecessarily scroll down on pages.

Phase 6 should therefore evaluate every major page for vertical efficiency.

The goal is not to make everything tiny.

The goal is to remove unnecessary space and unnecessary separation.

Preferred principles

Important information should be visible immediately.

Common actions should be immediately accessible.

Related information should be grouped.

Large empty areas should be avoided.

Repeated information should be removed.

Long sections should be collapsed or reorganized where appropriate.

Details should be revealed when needed.

Tables should be dense enough to be useful but still readable.

Cards should not become unnecessarily tall.

Common workflows should ideally fit within one viewport where practical.

The design should optimize for information density without sacrificing clarity.

6.3 Navigation Redesign

The existing sidebar should not be treated as permanent.

The user does not prefer the current sidebar-based navigation.

Phase 6 should redesign navigation from first principles.

Possible approaches include:

integrated top navigation

contextual navigation

workspace navigation

page-level tabs

compact menus

breadcrumbs

contextual links

command/menu interactions

The final design should avoid forcing the user to repeatedly open a large sidebar just to move around the application.

Navigation should become part of the workspace itself wherever practical.

6.4 Application Shell

Every page should use the same application shell.

The shell should standardize:

Karya branding

top navigation

business context

page width

background

typography

spacing

content alignment

responsive behavior

user/context controls

navigation patterns

No page should feel like it was designed independently from the rest of Karya.

6.5 Complete UI Design System

Create one coherent internal design system.

Typography

Standardize:

Page title

Section title

Card title

Body text

Secondary text

Labels

Helper text

Table text

Numeric metrics

Status text

Spacing

Use a consistent spacing scale.

Avoid arbitrary page-specific spacing unless there is a clear reason.

Cards

Standardize:

border

radius

shadow

padding

header

content

footer/actions

Buttons

Standardize:

Primary

Secondary

Tertiary

Destructive

Success/confirmation

Disabled

Loading

Inputs

All inputs should share:

height

font size

border

radius

focus state

placeholder styling

disabled state

validation/error state

The Products dialog should be used as a reference where appropriate, but Phase 6 may establish a better unified standard if required.

Dialogs

All dialogs should share:

width

rounded corners

header

title

description

close button

content spacing

footer

action alignment

responsive behavior

no unnecessary internal scrolling

Tables

Standardize:

header style

row height

borders

hover states

status badges

numeric alignment

actions

expandable rows

empty states

6.6 Icon System

The entire application should use one consistent icon family.

Icons should have:

consistent visual style

consistent stroke/weight

consistent sizing

consistent placement

consistent semantic meaning

Examples:

Products       → Product/package icon Production     → Factory/production icon Inventory      → Box/package icon Orders         → Order/receipt icon Finance        → Finance/chart icon Customers      → People icon Settings       → Settings icon Create         → Plus icon Edit           → Pencil icon Delete         → Trash icon Expand         → Chevron icon Success        → Check icon Warning        → Warning icon Error          → Alert icon

Do not mix unrelated icon styles across pages.

6.7 Color System

Use a consistent semantic color system.

Suggested semantic categories:

Primary Neutral Success Warning Danger Info

Color should communicate meaning.

For example:

Green  → Success / Completed / Positive Amber  → Warning / Pending / Attention Red    → Error / Destructive Neutral → Secondary / Inactive Primary → Main actions

The same meaning should use the same visual language everywhere.

6.8 Consistent States

Every module should have consistent:

Loading states

Empty states

Error states

Success states

Confirmation dialogs

Disabled states

Permission/availability states

Incomplete-data states

The user should immediately understand what state the application is in regardless of the module.

6.9 Responsive Design

Review the complete application for:

Desktop

Laptop

Tablet

Smaller screens

Avoid unnecessary horizontal scrolling.

Dialogs should fit naturally within the viewport.

Tables should have deliberate responsive behavior.

The UI should not rely on accidental overflow.

6.10 Workflow Efficiency Audit

Every major workflow should be evaluated using:

How many clicks? How many screens? How much scrolling? How much repeated information? How much repeated typing? How much navigation? Is the next action obvious?

The redesign should reduce unnecessary interaction wherever possible.

Production example

The preferred workflow should approach:

Product ↓ ### Create Batch ↓ ### Review Configuration ↓ ### Review Estimated Cost ↓ ### Create Draft ↓ Complete ↓ ### Finished Inventory

without unnecessary navigation between unrelated screens.

Product setup example

The preferred workflow should approach:

### Create Product

↓ ### Set Price ↓ ### Configure Formulation ↓ ### Configure Packaging ↓ ### Review Economics ↓ Ready for Production

while keeping the relevant information together.

6.11 Page Consolidation Review

During Phase 6, every page should be challenged with:

*Does this really need to be a separate page?*

Possible consolidation areas should be evaluated based on workflow rather than backend architecture.

Potential workspaces may include:

### Product Workspace

Product ├── Product details ├── Pricing ├── Economics ├── Formulation ├── Packaging ├── Inventory └── Production history

### Materials Workspace

Materials ├── Raw materials ├── Packaging ├── Purchases ├── Inventory └── Consumption

### Production Workspace

Production ├── Production batches ├── Drafts ├── Completed production ├── Cancelled batches ├── Production costs └── Production history

These are examples for evaluation, not fixed requirements. The final information architecture should be determined during Phase 6 based on actual usability.

6.12 Full Application Consistency Audit

Before Phase 6 is complete, every major page must be checked for:

Same application shell

Same navigation

Same typography

Same spacing

Same cards

Same buttons

Same inputs

Same dialogs

Same tables

Same status badges

Same icons

Same semantic colors

Same empty states

Same loading states

Same error states

Same confirmation patterns

Minimal unnecessary scrolling

Minimal unnecessary navigation

Minimal duplicate information

Responsive behavior

6.13 Phase 6 Success Criteria

Phase 6 is complete only when Karya feels like one coherent product.

A user should not be able to move between Products, Materials, Production, Inventory, Orders, Finance, and Business Intelligence and feel like they are entering completely different applications.

The redesign must improve:

speed

clarity

information density

discoverability

navigation

consistency

daily workflow efficiency

while preserving the underlying business logic and domain architecture.

**PHASE** 7

Cleanup, Hardening & Launch

Purpose

Phase 7 is the final technical and operational hardening phase.

No major new functionality should be introduced here unless it is necessary to correct a correctness, security, architecture, or launch-blocking issue.

7.1 Code Cleanup

Review for:

unused files

unused components

duplicate components

duplicate business logic

dead code

obsolete fields

obsolete services

temporary test code

development-only UI

unnecessary abstractions

naming inconsistencies

module naming errors

unnecessary dependencies

7.2 Architecture Review

Verify that the application follows the intended architecture:

Browser ↓ ### Client Components ↓ ### Server Actions ↓ Validation ↓ ### Domain Services ↓ Prisma ↓ PostgreSQL

Business rules should remain in services.

UI components should not directly become the source of truth for business logic.

7.3 Data Integrity

Verify:

Tenant isolation

Inventory integrity

Transaction safety

Historical costing

Production history

Order/inventory relationships

Cash-flow relationships

Deletion rules

Versioning rules

No accidental double consumption

No accidental duplicate transactions

No accidental historical-cost mutation

7.4 Validation & Error Handling

Important Server Actions should:

Resolve the active business.

Validate input with Zod.

Verify tenant ownership.

Execute business logic in the service layer.

Return a consistent ActionResponse.

Revalidate all affected UI paths.

Errors should be:

understandable

actionable where possible

safe to expose

free of database internals

free of secrets

7.5 Testing

The final test pass should cover:

Materials

Purchase

Weighted average

Consumption

Deletion

Insufficient stock

Formulations

Creation

Versioning

Active version

Deletion

Production-batch protection

Dynamic costing

Packaging

Creation

Versioning

Active version

Deletion

Production-batch protection

Dynamic costing

Production

Draft creation

Cost preview

Completion

Cancellation

Cancelled-batch deletion

Insufficient inventory

Atomic rollback

Finished inventory

Historical production cost

Products

Product economics

Production history

Pricing

Inventory relationships

Finance

Expenses

Categories

Period filtering

Deletion

Reporting

Orders / Cash Flow

Order creation

Inventory consumption

Revenue

Cash movement

Variable costs

Contribution profit

### Business Intelligence

Revenue

Expenses

Inventory

Production

Cash flow

Product economics

Time-period filtering

7.6 Database Review

Review:

Prisma schema

Foreign keys

Unique constraints

Indexes

Decimal precision

Delete behavior

Transaction boundaries

Migration strategy

Historical-data protection

7.7 Security Review

Verify:

No secrets committed

No credentials exposed to client code

Tenant isolation

Server-side authorization boundaries

Safe input validation

Safe error handling

No accidental cross-business data leakage

7.8 Documentation

The **README** must be updated whenever any of the following changes:

Architecture

Database schema

Business rules

Routes

Modules

Major workflows

Dependencies

Testing strategy

Development workflow

UI architecture

The **README** is intended to remain useful as a handoff document for continuing Karya development in future conversations.

7.9 Production Data Transition

Test data should remain available while development requires it.

Production Pahad Rituals data should only be introduced after:

V2 functionality is sufficiently tested

schema is stable

major UI redesign is complete

final cleanup is complete

test data is no longer required

The final transition should be deliberate and verified.

V2 Completion Standard

A phase is considered complete only when:

The feature is implemented.

Server-side business rules are implemented.

Tenant isolation is verified.

Relevant validation is implemented.

Relevant transactions are safe and atomic.

The UI workflow is complete.

TypeScript checks pass.

Relevant tests pass.

The workflow is manually tested in the browser.

Dependent pages/modules are verified.

**README** documentation is updated.

Git status is reviewed.

The user reviews the changes.

The user stages, commits, and pushes the completed phase.

V2 Development Rules

## Inspect Before Changing

Before modifying an existing feature, inspect:

current implementation

related services

validation

schema

dependent modules

UI components

existing business rules

Do not rewrite working functionality unnecessarily.

## Repository Is the Implementation Source of Truth

When documentation and implementation differ, inspect the implementation and update the documentation after the intended behavior has been confirmed.

## Never Bypass Tenant Isolation

Every business-scoped operation must resolve the active business and verify ownership server-side.

## Business Rules Belong in Services

Client components must not become the source of truth for business rules.

## Validate at Server Action Boundaries

Use Zod for Server Action inputs.

## Inventory Changes Must Use Inventory Services

Do not directly modify inventory from UI components.

## Preserve Historical Truth

Completed production and future order records must retain the information required to explain what actually happened at that time.

Current inventory costs may change. Historical records must not silently change because of later purchases.

## Use Transactions for Multi-step Operations

Operations involving multiple related inventory, financial, production, or order records must be atomic.

## Avoid Unnecessary Duplicate Data

Prefer relationships and derived calculations over storing the same business fact in multiple places.

## Maintain UI Consistency

New UI must follow the established Karya design system.

After Phase 6 establishes the final design system, all subsequent UI changes must follow it.

## Minimize Unnecessary Navigation and Scrolling

The application should optimize for daily business use.

Do not create separate pages simply because backend modules are separate.

Do not add vertical content simply because there is available screen space.

## Test Before Moving Phases

A phase is not complete merely because the UI exists.

Relevant business rules and complete workflows must be tested.

## Git Workflow

After each completed phase:

TypeScript Check
      ↓
### Relevant Tests
      ↓
### Manual Browser Verification
      ↓
**README** Update
      ↓
### Git Status Review
      ↓
### User Reviews Changes
      ↓
### User Stages Changes
      ↓
### User Commits
      ↓
User Pushes to GitHub

The assistant must not modify, commit, or push to the GitHub repository.

## No Unnecessary Paid Infrastructure

Continue using the local development/server/database setup while Karya is being built unless a future phase explicitly requires a deployment change.

## Prefer Complete Files

When modifying a file, provide the complete corrected file whenever practical so the user can replace the local file directly.

## Preserve Working Functionality

New work must not unnecessarily break or rewrite completed V2 functionality.

Before modifying an existing module, identify its dependencies and verify that the change will not break downstream workflows.

Current V2 Status

**PHASE** 1 | ✅ **COMPLETE** Product Economics & Cost Engine

**PHASE** 2 | ✅ **COMPLETE** Production & Product UI Integration

**PHASE** 3 | ✅ **COMPLETE** Order Economics & Cash Flow

**PHASE** 4 | ✅ **COMPLETE** ### Business Intelligence

**PHASE** 5 | ⏳ **NOT** **STARTED** Investor Metrics & Decision Layer

**PHASE** 6 | ⏳ **NOT** **STARTED** Application UX, Information Architecture & Full UI Redesign

**PHASE** 7 | ⏳ **NOT** **STARTED** Cleanup, Hardening & Launch

### Current Development Position

Phase 1 and Phase 2 are complete.

The current V2 foundation is:

### Raw Materials

      ↓
Packaging
      ↓
Formulations
      ↓
### Product Packaging
      ↓
### Product Economics
      ↓
### Production Batches
      ↓
### Finished Product Inventory
      ↓
### Product Production History

The next planned phase is:

**PHASE** 3 Order Economics & Cash Flow

Before starting Phase 3:

Complete the Phase 2 GitHub checkpoint.

Keep the current test business/data available while remaining V2 workflows are developed and tested.

Continue using the local PostgreSQL/server setup.

Do not prematurely replace test data with production Pahad Rituals data.

Inspect the existing Orders module before making changes.

Reuse the existing Product Economics engine rather than creating another product-costing system.

Preserve all Phase 1 and Phase 2 business rules.

### Future Conversation Continuation Rule

If development continues in a new ChatGPT conversation because the current conversation reaches its context limit, the new conversation should first read this V2 Development Roadmap and inspect the repository before proposing implementation changes.

The **README** should be treated as the persistent project context for:

V2 phase status

completed functionality

planned functionality

business rules

architecture decisions

UI requirements

design principles

testing requirements

Git workflow

current development position

The new conversation should not assume that a feature is missing merely because it is not described in the latest conversation. It should inspect the repository and compare the implementation against this roadmap.

The next implementation task should be determined from the current V2 status and the repository state.

At the current checkpoint, the next planned implementation is:

**PHASE** 3 Order Economics & Cash Flow

# Repository

The authoritative repository is:

[https://github.com/mmehraa/karya](https://github.com/mmehraa/karya)

The primary development branch is:

```
main
```

The repository itself is the final source of truth for the current implementation.
