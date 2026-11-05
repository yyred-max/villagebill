// src/components/Activity.tsx
import { useMemo, useState } from "react";
import {
  IconLogout,
  IconSearch,
  IconCheck,
  IconUser,
  IconFolder,
  IconAlertCircle,
  IconCreditCard,
  IconUserPlus,
} from "./Icons";
import type { Activity } from "../App";
import { truncateHash } from "../utils/format";

interface ActivityProps {
  address: string | null;
  activities: Activity[];  // ← terima activities dari App
  onDisconnect: () => void;
  onGoDashboard: () => void;
  onGoGroups: () => void;
}

type Category = "All Activity" | "Payments" | "Group Updates" | "System";

function iconFor(type: Activity['type']) {
  switch (type) {
    case 'share_paid':
      return { icon: <IconCheck />, className: "icon-success" };
    case 'member_added':
      return { icon: <IconUserPlus />, className: "icon-purple" };
    case 'group_created':
      return { icon: <IconFolder />, className: "icon-neutral" };
    default:
      return { icon: <IconAlertCircle />, className: "icon-danger" };
  }
}

function getCategory(type: Activity['type']): Category {
  switch (type) {
    case 'share_paid':
      return "Payments";
    case 'member_added':
    case 'group_created':
      return "Group Updates";
    default:
      return "System";
  }
}

export default function Activity({
  address,
  activities,
  onDisconnect,
  onGoDashboard,
  onGoGroups,
}: ActivityProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All Activity");

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                            (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === "All Activity" || getCategory(a.type) === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category, activities]);

  // Kelompokkan berdasarkan tanggal
  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filtered.forEach((a) => {
      const date = new Date(a.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="dashboard activity-page">
      {/* ===== NAVBAR ===== */}
      <header className="navbar dashboard-navbar">
        <div className="brand">
          <div className="brand-icon">
            <span className="brand-bars" />
          </div>
          <h1>SplitBill</h1>
        </div>

        <nav className="dashboard-tabs">
          <button className="dashboard-tab" onClick={onGoDashboard}>
            Dashboard
          </button>
          <button className="dashboard-tab" onClick={onGoGroups}>
            Groups
          </button>
          <button className="dashboard-tab active">Activity</button>
        </nav>

        <div className="dashboard-account">
          <span className="pulse-dot" />
          <span className="account-label">Connected</span>
          <span className="account-address">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "GABCD...7XYZ"}
          </span>
          <button className="account-logout" onClick={onDisconnect} aria-label="Disconnect">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* ===== HEADER ===== */}
      <section className="activity-header">
        <h1 className="activity-title">Recent Activity</h1>
        <p className="activity-sub">A complete history of your payments and group updates.</p>
      </section>

      {/* ===== SEARCH + FILTERS ===== */}
      <section className="activity-controls">
        <div className="activity-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search by group or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="activity-filters">
          {(["All Activity", "Payments", "Group Updates", "System"] as const).map((c) => (
            <button
              key={c}
              className={`activity-filter-pill ${category === c ? "active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      {grouped.length === 0 ? (
        <p className="groups-empty" style={{ padding: '40px 0', color: 'var(--text-muted)' }}>
          No activity found.
        </p>
      ) : (
        <section className="activity-timeline">
          {grouped.map(([date, items]) => (
            <div className="activity-group" key={date}>
              <p className="activity-date">
                <span className="date-bar" /> {date}
              </p>
              <div className="activity-card">
              {items.map((a) => {
                  const { icon, className } = iconFor(a.type);
                  return (
                    <div className="activity-row" key={a.id}>
                      <span className={`activity-row-icon ${className}`}>{icon}</span>
                      <div className="activity-row-body">
                        <p className="activity-row-text">{a.title}</p>
                        {a.description && (
                          <p className="activity-row-hash">
                            {truncateHash(a.description)}
                          </p>
                        )}
                      </div>
                      <span className="activity-row-time">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="app-footer groups-footer">
        <span className="footer-brand">Built on Stellar Soroban</span>
        <div className="footer-links">
          <a
            href="https://github.com/yyred-max/Stellar-meetup"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source Code
          </a>
          <a
            href="https://developers.stellar.org/docs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}