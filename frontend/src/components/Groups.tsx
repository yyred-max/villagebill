// src/components/Groups.tsx
import { useMemo, useState } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { IconPlus, IconLogout, IconSearch, IconChevronDown, IconUsers, IconSpinner } from "./Icons";
import type { Group, Member } from "../App";

interface GroupsProps {
  address: string | null;
  groups: Group[];
  onAddGroup: (group: Group) => void;
  onViewGroup: (groupId: string) => void;
  onDisconnect: () => void;
  onGoHome: () => void;
  onGoActivity: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

type Status = "Active" | "Pending" | "Completed";

export default function Groups({
  address,
  groups,
  onAddGroup,
  onViewGroup,
  onDisconnect,
  onGoHome,
  onGoActivity,
  isLoading = false,
  error = null,
  onRefresh,
}: GroupsProps) {
  const tab: "Dashboard" | "Groups" | "Activity" = "Groups";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All Groups" | Status>("All Groups");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groupItems = useMemo(() => {
    return groups.map((g) => {
      const totalMembers = g.members.length;
      const paid = g.members.filter((m) => m.paid).length;
      const percent = totalMembers > 0 ? (paid / totalMembers) * 100 : 0;
      const status: Status =
        percent === 100 ? "Completed" : percent > 0 ? "Active" : "Pending";
      const yourShare = totalMembers > 0 ? g.totalShare / totalMembers : 0;

      return {
        id: g.id,
        name: g.name,
        status,
        members: totalMembers,
        total: g.totalShare,
        share: yourShare,
        percent,
        settled: g.settled,
        isRecurring: g.isRecurring,
        cycle: g.cycle,
      };
    });
  }, [groups]);

  const filtered = useMemo(() => {
    return groupItems.filter((g) => {
      const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All Groups" || g.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, groupItems]);

  const handleGroupCreated = (data: { name: string; hash: string }) => {
    const newGroup: Group = {
      id: data.hash,
      name: data.name,
      owner: address!,
      totalShare: 0,
      members: [],
      settled: false,
      isRecurring: false,
      cycle: 1,
    };
    onAddGroup(newGroup);
    setShowCreateModal(false);
  };

  let content;
  if (isLoading) {
    content = (
      <div className="groups-loading">
        <IconSpinner size={32} />
        <p>Loading your groups...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="groups-error">
        <p>⚠️ {error}</p>
        {onRefresh && (
          <button className="btn-secondary" onClick={onRefresh}>
            🔄 Retry
          </button>
        )}
      </div>
    );
  } else if (filtered.length === 0) {
    content = <p className="groups-empty">No groups match your search/filter.</p>;
  } else {
    content = (
      <section className="groups-grid">
        {filtered.map((g) => (
          <div
            className={`group-card ${g.status === "Completed" ? "completed" : ""}`}
            key={g.id}
          >
            <div className="group-card-top">
              <div>
                <span className="group-name-lg">{g.name}</span>
                <span className="group-meta">
                  <IconUsers /> {g.members} members
                </span>
              </div>
              <span className={`status-pill status-${g.status.toLowerCase()}`}>
                {g.status}
              </span>
              {g.settled && (
                <span className="status-pill" style={{ background: 'var(--green)', color: '#fff' }}>
                  ✅ Settled
                </span>
              )}
            </div>

            <div className="group-amounts">
              <div>
                <span>TOTAL AMOUNT</span>
                <strong>{g.total.toLocaleString()} XLM</strong>
              </div>
              <div className="align-right">
                <span>YOUR SHARE</span>
                <strong className="share-value">{g.share.toLocaleString()} XLM</strong>
              </div>
            </div>

            <div className="group-status-row">
              <span>Progress</span>
              <span className={g.percent === 100 ? "progress-complete-text" : "progress-text"}>
                {Math.round(g.percent)}% Paid
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${g.percent === 100 ? "is-complete" : ""}`}
                style={{ width: `${g.percent}%` }}
              />
            </div>

            <button
              className="btn-view-details"
              onClick={() => onViewGroup(g.id)}
            >
              View Details
            </button>
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="dashboard groups-page">
      <header className="navbar dashboard-navbar">
        <div className="brand">
          <div className="brand-icon">
            <span className="brand-bars" />
          </div>
          <h1>SplitBill</h1>
        </div>

        <nav className="dashboard-tabs">
          {(["Dashboard", "Groups", "Activity"] as const).map((t) => (
            <button
              key={t}
              className={`dashboard-tab ${tab === t ? "active" : ""}`}
              onClick={() => {
                if (t === "Dashboard") onGoHome();
                else if (t === "Activity") onGoActivity();
              }}
            >
              {t}
            </button>
          ))}
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

      <section className="groups-header">
        <div>
          <h1 className="groups-title">Your Groups</h1>
          <p className="groups-sub">Manage and track all your shared expenses.</p>
        </div>

        <div className="groups-controls">
          <div className="groups-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="groups-select-wrap">
            <select
              className="groups-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option>All Groups</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <IconChevronDown />
          </div>

          <button className="btn-primary btn-new-group" onClick={() => setShowCreateModal(true)}>
            <IconPlus /> New Group
          </button>
        </div>
      </section>

      {content}

      <footer className="app-footer groups-footer">
        <span className="footer-brand">Built on Stellar Soroban</span>
        <div className="footer-links">
          <a href="https://github.com/yyred-max/Stellar-meetup" target="_blank" rel="noopener noreferrer">
            Source Code
          </a>
          <a href="https://developers.stellar.org/docs/" target="_blank" rel="noopener noreferrer">
            Documentation
          </a>
        </div>
      </footer>

      {showCreateModal && (
        <CreateGroupModal
          address={address}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGroupCreated}
          onViewGroup={() => {
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}