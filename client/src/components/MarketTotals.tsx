import {
  BarChart3,
  Gamepad2,
  Cpu,
  Package,
  type LucideIcon,
} from "lucide-react";
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: LucideIcon;
}) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">
        <Icon size={14} className="stat-card__icon" />
        {label}
      </span>
      <span className="stat-card__value">
        {value != null ? fmt.format(value) : "—"}
      </span>
    </div>
  );
}

export function MarketTotals({ totals }: Props) {
  return (
    <div className="market-totals">
      <StatCard
        label="Total Market"
        value={totals.total_market_spend}
        icon={BarChart3}
      />
      <StatCard label="Content" value={totals.content_spend} icon={Gamepad2} />
      <StatCard label="Hardware" value={totals.hardware_spend} icon={Cpu} />
      <StatCard
        label="Accessories"
        value={totals.accessory_spend}
        icon={Package}
      />
    </div>
  );
}
