import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, LogOut, Search, X } from "lucide-react";
import { C } from "../constants/colors";
import { StatTile } from "../components/ui/StatTile";
import { BigButton } from "../components/ui/BigButton";
import { Badge } from "../components/ui/Badge";
import { todayISO, isSameDay } from "../utils/formatters";

const PAGE_SIZE = 8;

const STAT_CONFIG = [
  { key: "today", label: "Today's leads" },
  { key: "total", label: "Total leads" },
  { key: "completed", label: "Completed", tone: "ledger" },
  { key: "pending", label: "Pending", tone: "amber" },
];

function formatVisitDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function FeDashboard({ fe, leads, customers, onLogout, onAddLead, onOpenCustomer }) {
  const mine = useMemo(() => leads.filter((l) => l.feUsername === fe.username), [leads, fe]);
  const today = todayISO();

  const counts = useMemo(() => ({
    today: mine.filter((l) => isSameDay(l.visitDate, today)).length,
    completed: mine.filter((l) => l.status === "Completed").length,
    pending: mine.filter((l) => l.status === "Pending").length,
    cancelled: mine.filter((l) => l.status === "Cancelled").length,
    total: mine.length,
  }), [mine, today]);

  // O(1) customer lookup instead of scanning the full array on every row render.
  const customerMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);
  const custById = (id) => customerMap.get(id);

  const sortedAll = useMemo(
    () => [...mine].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)),
    [mine]
  );

  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();

  const filteredAll = useMemo(() => {
    if (!trimmedQuery) return sortedAll;
    return sortedAll.filter((l) => {
      const cust = custById(l.customerId);
      const haystack = [
        cust?.name,
        l.deviceBrand,
        l.deviceModel,
        l.leadId,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [sortedAll, trimmedQuery, customerMap]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const recent = filteredAll.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAll.length;

  // Reset pagination whenever the underlying list or search query changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mine, trimmedQuery]);

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { root: node.parentElement, rootMargin: "80px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.paper }}>
      <div style={{ padding: "20px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: C.slate }}>Welcome back</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 21 }}>{fe.name}</div>
        </div>
        <button
          onClick={onLogout}
          aria-label="Log out"
          style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
        >
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div style={{ padding: "8px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {STAT_CONFIG.map((s) => (
            <StatTile key={s.key} label={s.label} value={counts[s.key]} tone={s.tone ? C[s.tone] : undefined} />
          ))}
        </div>
        <div style={{ marginBottom: 18 }}>
          <StatTile label="Cancelled" value={counts.cancelled} tone={C.rust} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <BigButton icon={Plus} onClick={onAddLead} style={{ padding: "18px 18px", fontSize: 17.5 }}>
            Add new lead
          </BigButton>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, letterSpacing: 0.2 }}>
            Recent visits
          </div>
          {sortedAll.length > 0 && (
            <div style={{ fontSize: 12, color: C.slate }}>
              {filteredAll.length} {filteredAll.length === 1 ? "result" : "results"}
            </div>
          )}
        </div>

        {sortedAll.length > 0 && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.slate, pointerEvents: "none" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by customer, device or lead ID"
              aria-label="Search recent visits"
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 34px", borderRadius: 8,
                border: `1px solid ${C.line}`, fontSize: 13.5, background: "#fff", color: C.ink,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.slate,
                  display: "flex", alignItems: "center", padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {sortedAll.length === 0 && (
          <div style={{ color: C.slate, fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
            No leads yet. Tap "Add new lead" to record your first visit.
          </div>
        )}

        {sortedAll.length > 0 && filteredAll.length === 0 && (
          <div style={{ color: C.slate, fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
            No visits match "{query.trim()}".
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto", paddingRight: 2 }}>
          {recent.map((l) => {
            const cust = custById(l.customerId);
            return (
              <button
                key={l.id ?? l.leadId}
                onClick={() => onOpenCustomer(l.customerId)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8,
                  padding: "12px 14px", cursor: "pointer", textAlign: "left", width: "100%", flexShrink: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cust ? cust.name : "Unknown customer"}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.deviceBrand} {l.deviceModel} · {l.leadId} · {formatVisitDate(l.visitDate)}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 10 }}>
                  <Badge status={l.status} />
                </div>
              </button>
            );
          })}

          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px 0", color: C.slate, fontSize: 12.5, flexShrink: 0 }}>
              Loading more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}