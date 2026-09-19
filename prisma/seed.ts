import "dotenv/config";

import {
  PrismaClient,
  RequirementType,
  EvaluationMode,
} from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({ adapter });

interface StageRequirementDefSeedInput {
  stageId: number;
  code: string;
  title: string;
  description: string;
  type: RequirementType;
  evalMode: EvaluationMode;
  evalRuleKey?: string | null;
  evalConfig?: Record<string, unknown> | null;
  orderIndex: number;
}

const stages = [
  {
    id: 0,
    name: "Idea",
    description: "Business idea and initial concept stage.",
  },
  {
    id: 1,
    name: "Pre-launch",
    description:
      "Preparing the business, product, operations, and launch.",
  },
  {
    id: 2,
    name: "Launch",
    description:
      "Initial commercial launch and first customer acquisition.",
  },
  {
    id: 3,
    name: "Validation",
    description:
      "Testing product-market fit, unit economics, and repeat demand.",
  },
  {
    id: 4,
    name: "Growth",
    description:
      "Building repeatable acquisition, retention, and profitable growth.",
  },
  {
    id: 5,
    name: "Scale",
    description:
      "Building systems, teams, processes, and operational capacity.",
  },
  {
    id: 6,
    name: "Funding",
    description:
      "Preparing for and managing external funding and investor requirements.",
  },
  {
    id: 7,
    name: "Expansion",
    description:
      "Expanding into new markets, products, channels, or geographies.",
  },
  {
    id: 8,
    name: "Mature/Enterprise",
    description:
      "Established business with mature systems, governance, and operations.",
  },
];

const stageRequirementDefinitions: StageRequirementDefSeedInput[] = [
  // ===========================================================================
  // STAGE 0 — IDEA
  // ===========================================================================

  {
    stageId: 0,
    code: "IDEA_PROBLEM_STATEMENT",
    title: "Problem Statement Defined",
    description:
      "Document the core customer pain point or market friction being addressed.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 1,
  },
  {
    stageId: 0,
    code: "IDEA_TARGET_PERSONA",
    title: "Target Customer Profiled",
    description:
      "Identify key customer characteristics, consumption habits, and decision-making criteria.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 0,
    code: "IDEA_VALUE_PROPOSITION",
    title: "Value Proposition Articulated",
    description:
      "Define the core offering, primary differentiation, and customer delivery mechanism.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 0,
    code: "IDEA_MARKET_BENCHMARK",
    title: "Market Alternatives Analyzed",
    description:
      "Benchmark existing market alternatives, pricing patterns, and competitive positioning.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 0,
    code: "IDEA_FINANCIAL_HYPOTHESIS",
    title: "Unit Economics Hypothesis Formulated",
    description:
      "Establish baseline pricing assumptions, expected cost of delivery/goods, and gross margin hypotheses.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 0,
    code: "IDEA_BRAND_FOUNDATIONS",
    title: "Brand Foundations Drafted",
    description:
      "Establish working business/brand identity, positioning statement, and core values.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 1 — PRE-LAUNCH
  // ===========================================================================

  {
    stageId: 1,
    code: "PRELAUNCH_OFFERINGS_CONFIGURED",
    title: "Core Offerings Registered with Unit Economics",
    description:
      "Register launch products, services, or packages with complete baseline unit cost inputs.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.SYSTEM_CHECK,
    evalRuleKey: "CORE_OFFERINGS_REGISTERED_COUNT",
    evalConfig: {
      minOfferingCount: 1,
    },
    orderIndex: 1,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_TRANSACTION_MECHANISM",
    title: "Transaction & Payment Channel Ready",
    description:
      "Set up operational channels for billing, collecting payments, and issuing invoices or receipts.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_DELIVERY_WORKFLOW",
    title: "Delivery & Fulfillment Protocol Operational",
    description:
      "Establish operational procedures for fulfilling the offering (shipping, digital provisioning, service intake).",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_LEGAL_AND_BANKING",
    title: "Commercial Banking & Legal Entities Established",
    description:
      "Set up dedicated business bank accounts, legal entity registrations, and essential compliance.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_INITIAL_CAPACITY_STOCKED",
    title: "Initial Inventory or Service Capacity Ready",
    description:
      "Record opening stock to the ledger for physical goods, or verify capacity/infrastructure for digital and service businesses.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_CONTENT_ASSETS_STAGED",
    title: "Go-to-Market Communication Assets Prepared",
    description:
      "Prepare and stage initial launch announcements, marketing assets, or direct outreach channels.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.SYSTEM_CHECK,
    evalRuleKey: "CONTENT_ITEMS_PLANNED_COUNT",
    evalConfig: {
      minItems: 1,
    },
    orderIndex: 6,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_PACKAGING_OR_COLLATERAL",
    title: "Packaging, Invoicing, or Commercial Collateral Finalized",
    description:
      "Confirm physical product packaging, service contracts, onboarding materials, or software documentation.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 7,
  },
  {
    stageId: 1,
    code: "PRELAUNCH_PROSPECT_PIPELINE",
    title: "Early Audience or Prospect Waitlist Initiated",
    description:
      "Build an initial waitlist, pre-launch community, pilot users, or early enterprise sales pipeline.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 8,
  },

  // ===========================================================================
  // STAGE 2 — LAUNCH
  // ===========================================================================

  {
    stageId: 2,
    code: "LAUNCH_TRANSACTIONS_RECORDED",
    title: "Commercial Revenue Transactions Executed",
    description:
      "Record real customer transactions and confirm accurate revenue capture.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "PAID_ORDERS_COUNT",
    evalConfig: {
      targetThreshold: 1,
      configurablePerBusiness: true,
    },
    orderIndex: 1,
  },
  {
    stageId: 2,
    code: "LAUNCH_FULFILLMENT_CYCLE_COMPLETED",
    title: "End-to-End Fulfillment Cycle Completed",
    description:
      "Complete full fulfillment cycles (order delivery, service completion, or software provisioning).",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "FULFILLED_ORDERS_COUNT",
    evalConfig: {
      targetThreshold: 1,
      configurablePerBusiness: true,
    },
    orderIndex: 2,
  },
  {
    stageId: 2,
    code: "LAUNCH_OPERATING_EXPENSES_RECORDED",
    title: "Operating Expenses and Cash Outflows Logged",
    description:
      "Log ongoing operational expenses and delivery costs to compute accurate Operating Profit.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.SYSTEM_CHECK,
    evalRuleKey: "RECORDED_EXPENSES_COUNT",
    evalConfig: {
      minExpenseRecords: 1,
    },
    orderIndex: 3,
  },
  {
    stageId: 2,
    code: "LAUNCH_DELIVERY_LEDGER_SYNC",
    title: "Inventory or Delivery Asset Ledger Deductions Verified",
    description:
      "Verify that physical product sales record ledger deductions and cost snapshots accurately without drift.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.SYSTEM_CHECK,
    evalRuleKey: "DELIVERY_LEDGER_SYNC_CHECK",
    evalConfig: {},
    orderIndex: 4,
  },
  {
    stageId: 2,
    code: "LAUNCH_ACTIVE_ACQUISITION_BROADCAST",
    title: "Active Market Outreach or Publishing",
    description:
      "Execute active distribution via content marketing, paid channels, cold outbound, or direct sales calls.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 2,
    code: "LAUNCH_EARLY_FEEDBACK_CAPTURED",
    title: "First Customer Satisfaction Feedback Logged",
    description:
      "Capture and document direct user feedback regarding quality, pricing, and initial onboarding.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 3 — VALIDATION
  // ===========================================================================

  {
    stageId: 3,
    code: "VALIDATION_SUSTAINED_TRANSACTIONS",
    title: "Repeatable Customer Acquisition Observed",
    description:
      "Demonstrate transaction velocity across a distinct and expanding customer base.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "UNIQUE_CUSTOMERS_WITH_PAID_ORDERS",
    evalConfig: {
      defaultThreshold: 20,
      configurablePerBusiness: true,
    },
    orderIndex: 1,
  },
  {
    stageId: 3,
    code: "VALIDATION_POSITIVE_UNIT_MARGINS",
    title: "Positive Delivered Contribution Economics",
    description:
      "Confirm that delivered revenue exceeds direct delivery costs and cost of goods across transactions.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "AGGREGATE_GROSS_MARGIN_PERCENTAGE",
    evalConfig: {
      targetGrossMarginPct: 0.0,
      configurablePerBusiness: true,
    },
    orderIndex: 2,
  },
  {
    stageId: 3,
    code: "VALIDATION_CUSTOMER_RETENTION_EVIDENCE",
    title: "Customer Retention or Contract Extension Observed",
    description:
      "Demonstrate customer retention appropriate to the business model (repeat purchases, subscription renewals, or account expansions).",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 3,
    code: "VALIDATION_OFFERING_PROFITABILITY_AUDIT",
    title: "Offering Contribution & Margin Analysis",
    description:
      "Audit unit economics by product SKU, service package, or client tier to identify unprofitable activity.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 3,
    code: "VALIDATION_ACQUISITION_CHANNEL_REVIEW",
    title: "Customer Acquisition Economics Evaluated",
    description:
      "Evaluate customer acquisition cost, effort, and lead payback time by primary acquisition channel.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 3,
    code: "VALIDATION_STRUCTURED_FEEDBACK_ARCHIVE",
    title: "Systematic Customer Review and Retention Logging",
    description:
      "Maintain an ongoing log of customer testimonials, case studies, or net satisfaction indicators.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 4 — GROWTH
  // ===========================================================================

  {
    stageId: 4,
    code: "GROWTH_PREDICTABLE_REVENUE_RUNRATE",
    title: "Predictable Sales Velocity Established",
    description:
      "Demonstrate predictable, ongoing commercial run-rate over consecutive operating periods.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "ROLLING_WINDOW_ORDER_COUNT",
    evalConfig: {
      defaultWindowDays: 30,
      configurablePerBusiness: true,
    },
    orderIndex: 1,
  },
  {
    stageId: 4,
    code: "GROWTH_PROVEN_ACQUISITION_CHANNEL",
    title: "At Least One Scalable Acquisition Channel",
    description:
      "Establish at least one repeatable customer acquisition channel with measurable efficiency.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 4,
    code: "GROWTH_OPERATIONAL_SOP_FRAMEWORK",
    title: "Standard Operating Procedures for Delivery & Support",
    description:
      "Document operational playbooks for core fulfillment, customer support, and issue escalation.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 4,
    code: "GROWTH_SUPPLY_OR_CAPACITY_MONITORING",
    title: "Supply Chain or Delivery Capacity Thresholds",
    description:
      "Establish inventory reorder levels or human/server capacity limits to avoid delivery bottlenecks.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 4,
    code: "GROWTH_SYSTEMATIC_RETENTION_SYSTEM",
    title: "Systematic Retention and Expansion Program",
    description:
      "Deploy proactive post-delivery follow-ups, account review rhythms, or loyalty engagement systems.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 4,
    code: "GROWTH_FUNCTIONAL_DELEGATION",
    title: "Core Operational Roles Delegated",
    description:
      "Delegate routine fulfillment, creative production, or administration beyond the founder.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 5 — SCALE
  // ===========================================================================

  {
    stageId: 5,
    code: "SCALE_DEPARTMENTAL_BUDGETS",
    title: "Operating Budgets & Financial Controls Established",
    description:
      "Establish formal spending allocations across operations, marketing, software, and compensation.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 1,
  },
  {
    stageId: 5,
    code: "SCALE_OPERATIONAL_RESILIENCE",
    title: "Supply Chain & Critical Vendor Diversification",
    description:
      "Secure secondary providers for core dependencies (manufacturing, hosting infrastructure, key contractors).",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 5,
    code: "SCALE_WORKING_CAPITAL_BUFFER",
    title: "Operating Working Capital Buffer Maintained",
    description:
      "Maintain an operational liquidity runway sufficient to support rolling delivery cycles without disruption.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.METRIC_THRESHOLD,
    evalRuleKey: "OPERATIONAL_RUNWAY_BUFFER_MONTHS",
    evalConfig: {
      targetRunwayMonths: 2,
      configurablePerBusiness: true,
    },
    orderIndex: 3,
  },
  {
    stageId: 5,
    code: "SCALE_ORGANIZATIONAL_ACCOUNTABILITY",
    title: "Structured Roles & Accountability Matrix",
    description:
      "Implement defined team roles, management ownership, and operational performance KPIs.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 5,
    code: "SCALE_DEMAND_CAPACITY_FORECASTING",
    title: "Rolling Capacity and Demand Forecasting",
    description:
      "Forecast sales velocity and operational resource requirements across rolling operational cycles.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 5,
    code: "SCALE_QUALITY_CONTROL_PROGRAM",
    title: "Formal Quality Assurance Protocols",
    description:
      "Maintain systematic QA checklists, testing steps, or review procedures prior to customer handoff.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 6 — FUNDING
  // ===========================================================================

  {
    stageId: 6,
    code: "FUNDING_DILIGENCE_DATA_ROOM",
    title: "Institutional Diligence Data Room Organized",
    description:
      "Consolidate corporate registrations, statutory filings, commercial contracts, and IP ownership documents.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 1,
  },
  {
    stageId: 6,
    code: "FUNDING_FINANCIAL_RECONCILIATION",
    title: "Historical Financials Reconciled",
    description:
      "Reconcile recorded revenue, delivery costs, and operating expenses against verified commercial bank records.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 6,
    code: "FUNDING_UNIT_ECONOMICS_SYNTHESIS",
    title: "Unit Economics & Capital Efficiency Dossier",
    description:
      "Prepare an audited analysis of customer acquisition efficiency, gross margins, net burn rate, and payback periods.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 6,
    code: "FUNDING_CAP_TABLE_OR_OWNERSHIP_STRUCTURE",
    title: "Formalized Ownership Structure and Cap Table",
    description:
      "Document clean equity breakdown, debt or convertible agreements, and partnership distributions.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 6,
    code: "FUNDING_CAPITAL_ALLOCATION_PLAN",
    title: "Strategic Capital Allocation Plan",
    description:
      "Detail the specific deployment of target capital across hiring, infrastructure, technology, and market expansion.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 6,
    code: "FUNDING_INVESTOR_REPORTING_RHYTHM",
    title: "Stakeholder Reporting Rhythm Established",
    description:
      "Establish regular financial and operational briefing cadences for existing and prospective stakeholders.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 7 — EXPANSION
  // ===========================================================================

  {
    stageId: 7,
    code: "EXPANSION_MULTI_CHANNEL_REVENUE",
    title: "Diversified Distribution or Revenue Channels",
    description:
      "Activate secondary commercial channels beyond the primary initial sales touchpoint.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 1,
  },
  {
    stageId: 7,
    code: "EXPANSION_CORE_OFFERING_EXPANSION",
    title: "Catalog, Service, or Feature Line Expansion",
    description:
      "Monetize complementary product categories, new service packages, or adjacent software tiers.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 7,
    code: "EXPANSION_DISTRIBUTED_FULFILLMENT_OR_INFRASTRUCTURE",
    title: "Scalable Distributed Delivery Infrastructure",
    description:
      "Deploy regional warehouses, distributed server regions, or localized service teams to support expanded reach.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 7,
    code: "EXPANSION_JURISDICTIONAL_COMPLIANCE",
    title: "Cross-Territory Legal and Tax Compliance",
    description:
      "Comply with multi-state, regional, or cross-border regulatory, tax, and licensing requirements.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 7,
    code: "EXPANSION_COMMERCIAL_CREDIT_TERMS",
    title: "Commercial Contracts and Credit Accounts Governance",
    description:
      "Implement purchase order accounting, credit terms, and accounts receivable management for institutional clients.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
  {
    stageId: 7,
    code: "EXPANSION_STRATEGIC_ALLIANCES",
    title: "Strategic Partnerships or Distribution Alliances",
    description:
      "Form commercial channel alliances, enterprise distributor contracts, or institutional co-branding.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 6,
  },

  // ===========================================================================
  // STAGE 8 — MATURE / ENTERPRISE
  // ===========================================================================

  {
    stageId: 8,
    code: "ENTERPRISE_GOVERNANCE_STRUCTURE",
    title: "Formal Governance Appropriate to Business Structure",
    description:
      "Conduct recurring fiduciary reviews, formal resolution approvals, and structured stakeholder governance.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 1,
  },
  {
    stageId: 8,
    code: "ENTERPRISE_FINANCIAL_CONTROLS",
    title: "Formal Financial Approval Chains & Internal Controls",
    description:
      "Enforce separation of duties for purchase approvals, vendor disbursements, and treasury management.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 2,
  },
  {
    stageId: 8,
    code: "ENTERPRISE_CONTINUITY_RISK_MANAGEMENT",
    title: "Business Continuity & Risk Management Protocols",
    description:
      "Maintain disaster recovery systems, cybersecurity safeguards, and operational redundancy protocols.",
    type: RequirementType.MANDATORY,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 3,
  },
  {
    stageId: 8,
    code: "ENTERPRISE_AUDIT_READINESS",
    title: "Statutory Audit Readiness & Regulatory Review",
    description:
      "Undergo formal independent financial audits or legal compliance reviews appropriate to the business scale.",
    type: RequirementType.RECOMMENDED,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 4,
  },
  {
    stageId: 8,
    code: "ENTERPRISE_COMPENSATION_SUCCESSION",
    title: "Executive Compensation and Succession Planning",
    description:
      "Establish leadership succession plans and structured compensation/incentive frameworks.",
    type: RequirementType.OPTIONAL,
    evalMode: EvaluationMode.MANUAL,
    orderIndex: 5,
  },
];

async function seedStageRequirementDefinitions(
  prisma: PrismaClient
): Promise<void> {
  for (const def of stageRequirementDefinitions) {
    await prisma.stageRequirementDef.upsert({
      where: {
        code: def.code,
      },
      update: {
        stageId: def.stageId,
        title: def.title,
        description: def.description,
        type: def.type,
        evalMode: def.evalMode,
        evalRuleKey: def.evalRuleKey ?? null,
        evalConfig: def.evalConfig
          ? (def.evalConfig as any)
          : undefined,
        orderIndex: def.orderIndex,
      },
      create: {
        stageId: def.stageId,
        code: def.code,
        title: def.title,
        description: def.description,
        type: def.type,
        evalMode: def.evalMode,
        evalRuleKey: def.evalRuleKey ?? null,
        evalConfig: def.evalConfig
          ? (def.evalConfig as any)
          : undefined,
        orderIndex: def.orderIndex,
      },
    });
  }
}

async function main() {
  // ---------------------------------------------------------------------------
  // 1. Seed the 9 business stages
  // ---------------------------------------------------------------------------

  for (const stage of stages) {
    await db.stageDefinition.upsert({
      where: {
        id: stage.id,
      },
      update: {
        name: stage.name,
        description: stage.description,
      },
      create: stage,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Seed the stage requirements
  // ---------------------------------------------------------------------------

  await seedStageRequirementDefinitions(db);

  console.log("System seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });