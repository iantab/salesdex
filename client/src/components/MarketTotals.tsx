import type { MarketTotals as MarketTotalsType } from "../api/types";
import "./MarketTotals.css";

interface Props {
  totals: MarketTotalsType;
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">
        {value != null ? fmt.format(value) : "—"}
      </span>
    </div>
  );
}

export function MarketTotals({ totals }: Props) {
  return (
    <div className="market-totals">
      <StatCard label="Total Market" value={totals.total_market_spend} />
      <StatCard label="Content" value={totals.content_spend} />
      <StatCard label="Hardware" value={totals.hardware_spend} />
      <StatCard label="Accessories" value={totals.accessory_spend} />
    </div>
  );
}
