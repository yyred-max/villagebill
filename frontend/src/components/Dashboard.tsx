// src/components/Dashboard.tsx
import { useState } from "react";
import CreateGroupModal from "./CreateGroupModal";
import {
  IconPlus,
  IconLogout,
  IconCreditCard,
  IconUserPlus,
} from "./Icons";
import { createGroup } from "../lib/contract";
import { truncateHash } from "../utils/format";
import type { Activity, Group, Member } from "../App"; // 🔥 import dari App

// ============================================================
//  PROPS DASHBOARD
// ============================================================
interface DashboardProps {
  address: string | null;
  groups: Group[];
  activities: Activity[];
  onAddGroup: (group: Group) => void;
  onDisconnect: () => void;
  onGoGroups: () => void;
  onGoActivity: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 19) return "Good evening";
  return "Good night";
}

export default function Dashboard({
  address,
  groups,
  activities,
  onAddGroup,
  onDisconnect,
  onGoGroups,
  onGoActivity,
}: DashboardProps) {
  const tab: "Dashboard" | "Groups" | "Activity" = "Dashboard";
  const [showCreateModal, setShowCreateModal] = useState(false);

  // === HITUNG STATISTIK DARI GROUPS PROP ===
  const totalGroups = groups.length;
  let totalMembers = 0;
  let totalOutstanding = 0;
  let totalPaid = 0;

  groups.forEach((g) => {
    totalMembers += g.members.length;
    g.members.forEach((m) => {
      if (m.paid) {
        totalPaid += m.share;
      } else {
        totalOutstanding += m.share;
      }
    });
  });

  const userName = address ? address.slice(0, 6) : "Yuli";

  // === HANDLER SAAT GROUP BERHASIL DIBUAT ===
  const handleGroupCreated = (data: { name: string; hash: string; groupId?: string; isRecurring?: boolean }) => {
    const newGroup: Group = {
      id: data.groupId || data.hash,
      name: data.name,
      owner: address!,
      totalShare: 0,
      members: [],
      settled: false,
      isRecurring: data.isRecurring ?? false,
      cycle: 1,
    };
    onAddGroup(newGroup);
    setShowCreateModal(false);
  };
  // Ambil 5 aktivitas terbaru
  const recentActivities = activities.slice(0, 5);

  return (
    <div className="dashboard">
      {/* ===== NAVBAR ===== */}
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
                if (t === "Groups") onGoGroups();
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

      {/* ===== GREETING ===== */}
      <section className="dashboard-greeting">
        <div>
          <p className="greeting-title">
            {getGreeting()}, {userName} 👋
          </p>
          <p className="greeting-sub">
            Manage shared bills easily and transparently using Stellar.
          </p>
        </div>
        <button className="btn-primary btn-create-group" onClick={() => setShowCreateModal(true)}>
          <IconPlus /> Create Group
        </button>
      </section>

      {/* ===== STAT CARDS (dinamis) ===== */}
      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">TOTAL GROUPS</span>
          <strong className="stat-value">{totalGroups}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">TOTAL MEMBERS</span>
          <strong className="stat-value">{totalMembers}</strong>
        </div>
        <div className="stat-card outstanding">
          <span className="stat-label">TOTAL OUTSTANDING</span>
          <strong className="stat-value">{totalOutstanding.toFixed(2)} XLM</strong>
        </div>
        <div className="stat-card paid">
          <span className="stat-label">TOTAL PAID</span>
          <strong className="stat-value">{totalPaid.toFixed(2)} XLM</strong>
        </div>
      </section>

      {/* ===== GROUPS LIST + ACTIVITY FEED ===== */}
      <section className="dashboard-content">
        <div className="dashboard-groups">
          <h2>Your Groups</h2>
          {groups.length === 0 ? (
            <p className="empty-state">No groups yet. Create your first group!</p>
          ) : (
            <div className="group-list">
              {groups.map((g) => {
                const total = g.members.length;
                const paid = g.members.filter((m) => m.paid).length;
                const percent = total > 0 ? (paid / total) * 100 : 0;
                const completed = total > 0 && paid === total;

                return (
                  <div className="group-card" key={g.id}>
                    <div className="group-card-top">
                      <div>
                        <span className="group-name">
                          {g.name}
                          {completed && <span className="badge-completed">Completed</span>}
                        </span>
                        <span className="group-meta">
                          {total} members • Total: {g.totalShare.toFixed(2)} XLM
                        </span>
                      </div>
                      <div className="group-share">
                        <span>Your Share</span>
                        <strong className={completed ? "share-paid" : "share-pending"}>
                          {(g.totalShare / (total || 1)).toFixed(2)} XLM
                        </strong>
                      </div>
                    </div>

                    <div className="group-status-row">
                      <span>
                        Status: {paid} Paid
                        {total - paid > 0 && `, ${total - paid} Pending`}
                      </span>
                      <span>{Math.round(percent)}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${percent === 100 ? "is-complete" : ""}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <button className="btn-secondary btn-view-group" onClick={onGoGroups}>
                      View Group
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-activity">
          <h2>Recent Activity</h2>
          {recentActivities.length === 0 ? (
            <p className="activity-empty" style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
              No recent activity
            </p>
          ) : (
            <div className="activity-feed">
              {recentActivities.map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className={`activity-icon ${a.type === 'share_paid' ? 'pay' : 'add'}`}>
                    {a.type === 'share_paid' ? <IconCreditCard /> : <IconUserPlus />}
                  </span>
                  <div>
                    <p className="activity-title">{a.title}</p>
                    <p className="activity-sub">
                    {a.description && a.description.includes('Transaction:')
                          ? a.description.replace(/Transaction: /, '') 
                          : a.description}
                        {a.description?.includes('Transaction:') && (
                          <span> • {truncateHash(a.description.replace(/Transaction: /, ''))}</span>
                        )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== MODAL CREATE GROUP ===== */}
      {showCreateModal && (
        <CreateGroupModal
          address={address}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGroupCreated}
          onCreateGroup={async (data) => {
            if (!address) throw new Error("Wallet not connected");
            const result = await createGroup(address, data.name, data.isRecurring ?? false);
            return { hash: result.hash, result: result.result };
          }}
          onViewGroup={() => {
            setShowCreateModal(false);
            onGoGroups();
          }}
        />
      )}
    </div>
  );
}