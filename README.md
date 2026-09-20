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

V2 should build on these foundations.

The goal is not to restart the application, but to continue developing Karya into a more complete Business Operating System while preserving the core architectural principles established in V1.

---

# Repository

The authoritative repository is:

[https://github.com/mmehraa/karya](https://github.com/mmehraa/karya)

The primary development branch is:

```
main
```

The repository itself is the final source of truth for the current implementation.
