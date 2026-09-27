
import type {
  InvestorMetric,
  InvestorMetricGroup,
} from "@/modules/investor-metrics/types";

interface InvestorMetricsChartsProps {
  groups: InvestorMetricGroup[];
  currencyCode: string;
}

interface ChartItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

const CHART_COLORS = {
  emerald: "#059669",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
};

function findMetric(
  groups: InvestorMetricGroup[],
  keys: string[],
): InvestorMetric | undefined {
  return groups
    .flatMap((group) => group.metrics)
    .find((metric) => keys.includes(metric.key));
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      notation: Math.abs(value) >= 10000000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}`;
  }
}

function getChartItems(
  groups: InvestorMetricGroup[],
  definitions: {
    keys: string[];
    label: string;
    color: string;
  }[],
): ChartItem[] {
  return definitions.flatMap((definition) => {
    const metric = findMetric(groups, definition.keys);

    if (
      !metric ||
      metric.value === null ||
      !Number.isFinite(metric.value)
    ) {
      return [];
    }

    return [
      {
        key: metric.key,
        label: definition.label,
        value: metric.value,
        color: definition.color,
      },
    ];
  });
}

function ColumnChart({
  items,
  currencyCode,
}: {
  items: ChartItem[];
  currencyCode: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[230px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
        <p className="max-w-xs text-xs leading-5 text-slate-500">
          Not enough recorded data to visualize these metrics for the
          selected period.
        </p>
      </div>
    );
  }

  const width = 600;
  const height = 270;
  const left = 16;
  const right = 16;
  const top = 30;
  const bottom = 64;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;

  const minValue = Math.min(0, ...items.map((item) => item.value));
  const maxValue = Math.max(0, ...items.map((item) => item.value));

  const range = maxValue - minValue || 1;
  const paddedMin = minValue < 0 ? minValue - range * 0.08 : 0;
  const paddedMax = maxValue > 0 ? maxValue + range * 0.12 : 1;
  const paddedRange = paddedMax - paddedMin || 1;

  const yForValue = (value: number) =>
    top + ((paddedMax - value) / paddedRange) * plotHeight;

  const baseline = yForValue(0);
  const slotWidth = plotWidth / items.length;
  const barWidth = Math.min(74, slotWidth * 0.48);

  const gridValues = Array.from({ length: 5 }, (_, index) =>
    paddedMax - (paddedRange * index) / 4,
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Column chart comparing ${items
          .map((item) => `${item.label}: ${formatCurrency(item.value, currencyCode)}`)
          .join(", ")}`}
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          {items.map((item) => (
            <linearGradient
              key={`gradient-${item.key}`}
              id={`bar-gradient-${item.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={item.color} stopOpacity="1" />
              <stop offset="100%" stopColor={item.color} stopOpacity=".68" />
            </linearGradient>
          ))}
        </defs>

        {gridValues.map((value, index) => {
          const y = yForValue(value);

          return (
            <g key={`grid-${index}`}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke={index === 4 ? "#94a3b8" : "#e8edf2"}
                strokeWidth={index === 4 ? 1.2 : 1}
                strokeDasharray={index === 4 ? undefined : "4 5"}
              />
              <text
                x={left + 2}
                y={Math.max(12, y - 5)}
                fontSize="10"
                fill="#94a3b8"
              >
                {formatCurrency(value, currencyCode)}
              </text>
            </g>
          );
        })}

        <line
          x1={left}
          x2={width - right}
          y1={baseline}
          y2={baseline}
          stroke="#94a3b8"
          strokeWidth="1.4"
        />

        {items.map((item, index) => {
          const centerX = left + slotWidth * (index + 0.5);
          const valueY = yForValue(item.value);
          const barY = Math.min(valueY, baseline);
          const barHeight = Math.max(Math.abs(baseline - valueY), 2);
          const labelY =
            item.value >= 0
              ? Math.max(top + 12, barY - 9)
              : Math.min(height - bottom - 4, barY + barHeight + 15);

          return (
            <g key={item.key}>
              <rect
                x={centerX - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx="9"
                fill={`url(#bar-gradient-${item.key})`}
              />

              <text
                x={centerX}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#334155"
              >
                {formatCurrency(item.value, currencyCode)}
              </text>

              <text
                x={centerX}
                y={height - 35}
                textAnchor="middle"
                fontSize={items.length > 3 ? "10" : "11"}
                fontWeight="600"
                fill="#64748b"
              >
                {item.label.length > 19
                  ? `${item.label.slice(0, 17)}…`
                  : item.label}
              </text>

              <circle
                cx={centerX}
                cy={height - 16}
                r="4"
                fill={item.color}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  items,
  currencyCode,
  accent,
}: {
  title: string;
  subtitle: string;
  items: ChartItem[];
  currencyCode: string;
  accent: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5 pb-1 sm:p-6 sm:pb-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="px-3 pb-2 pt-4 sm:px-5">
        <ColumnChart items={items} currencyCode={currencyCode} />
      </div>

      {items.length > 0 && (
        <div className="mx-5 mb-5 rounded-xl bg-slate-50 px-4 py-3 sm:mx-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Combined displayed values
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-900">
              {formatCurrency(total, currencyCode)}
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            A simple sum of the plotted values, not an accounting subtotal.
          </p>
        </div>
      )}
    </article>
  );
}

export default function InvestorMetricsCharts({
  groups,
  currencyCode,
}: InvestorMetricsChartsProps) {
  const revenueItems = getChartItems(groups, [
    {
      keys: ["earnedRevenue"],
      label: "Earned revenue",
      color: CHART_COLORS.emerald,
    },
    {
      keys: ["paidCollections"],
      label: "Paid collections",
      color: CHART_COLORS.blue,
    },
  ]);

  const operatingItems = getChartItems(groups, [
    {
      keys: ["grossProfit"],
      label: "Gross profit",
      color: CHART_COLORS.emerald,
    },
    {
      keys: ["recordedExpenses"],
      label: "Recorded expenses",
      color: CHART_COLORS.amber,
    },
    {
      keys: ["ledgerNetCashMovement"],
      label: "Ledger net cash",
      color: CHART_COLORS.violet,
    },
  ]);

  return (
    <section className="mt-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-emerald-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19V5M4 19h17" />
              <path d="M8 15v-4M13 15V7M18 15V9" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
              Financial visualizations
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Explore how the selected period&apos;s financial metrics compare.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-500">
          Selected period · No fabricated trends
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Revenue & collections"
          subtitle="Delivered-order earned revenue and recorded paid collections."
          items={revenueItems}
          currencyCode={currencyCode}
          accent={CHART_COLORS.emerald}
        />

        <ChartCard
          title="Profit & cash activity"
          subtitle="Recorded gross profit, expenses, and ledger cash movement."
          items={operatingItems}
          currencyCode={currencyCode}
          accent={CHART_COLORS.violet}
        />
      </div>

      <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] leading-5 text-slate-500">
        These charts compare period totals, not monthly performance. Earned
        revenue and paid collections are distinct measures; gross profit,
        expenses, and ledger cash movement are displayed separately and should
        not be interpreted as additive accounting components.
      </p>
    </section>
  );
}