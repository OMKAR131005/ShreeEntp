import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Phone, Search, SlidersHorizontal, Users, LogOut, Check, Clock,
  XCircle, Download, ChevronRight, ArrowLeft, Upload, User,
  Smartphone, Wallet, History, ClipboardList, ShieldCheck, X, Pencil,
  UserPlus, Ban, RotateCcw, TrendingUp
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------------------------------------------------------------------- */
/* Design tokens                                                          */
/* ---------------------------------------------------------------------- */

const C = {
  ink: "#16233B",
  ink2: "#3C4A63",
  paper: "#FAF7F0",
  paperDim: "#F1ECE0",
  line: "#DCD5C4",
  ledger: "#1F6F54",
  ledgerBg: "#E7F1EB",
  amber: "#C8862B",
  amberBg: "#F6E9D3",
  rust: "#B14834",
  rustBg: "#F5E4DF",
  slate: "#6B6456",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`;

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

const pad5 = (n) => `CUST-${String(n).padStart(5, "0")}`;
const digits = (s) => (s || "").replace(/\D/g, "");
const last10 = (s) => digits(s).slice(-10);
const inr = (n) =>
  "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const isSameDay = (iso, day) => (iso || "").slice(0, 10) === day;
const startOfWeek = () => {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const STATUS_META = {
  Completed: { fg: C.ledger, bg: C.ledgerBg, Icon: Check },
  Pending: { fg: C.amber, bg: C.amberBg, Icon: Clock },
  Cancelled: { fg: C.rust, bg: C.rustBg, Icon: XCircle },
};

/* ---------------------------------------------------------------------- */
/* Small UI primitives                                                    */
/* ---------------------------------------------------------------------- */

function Badge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const { Icon } = meta;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: meta.bg, color: meta.fg,
        padding: "3px 10px", borderRadius: 20,
        fontSize: 12.5, fontWeight: 600,
      }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </span>
  );
}

function BigButton({ children, onClick, icon: Icon, style, disabled, tone = "ink" }) {
  const tones = {
    ink: { bg: C.ink, fg: "#fff" },
    ledger: { bg: C.ledger, fg: "#fff" },
    outline: { bg: "transparent", fg: C.ink },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: t.bg, color: t.fg,
        border: tone === "outline" ? `1.5px solid ${C.ink}` : "none",
        borderRadius: 10, padding: "14px 18px",
        fontSize: 16, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, width: "100%",
        fontFamily: "'IBM Plex Sans', sans-serif",
        ...style,
      }}
    >
      {Icon && <Icon size={18} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 16,
  border: `1.5px solid ${C.line}`, borderRadius: 8,
  background: "#fff", color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif",
  outline: "none", boxSizing: "border-box",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 80, ...(props.style || {}) }} />;
}
function Select({ children, ...props }) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>;
}

function StatTile({ label, value, tone }) {
  const color = tone || C.ink;
  return (
    <div style={{
      border: `1px solid ${C.line}`, borderRadius: 0, padding: "16px 18px",
      background: "#fff", minWidth: 0,
    }}>
      <div style={{ fontSize: 12.5, color: C.slate, fontWeight: 600, marginBottom: 6, letterSpacing: 0.2 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bad = toast.type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: bad ? C.rust : C.ledger, color: "#fff",
      padding: "12px 20px", borderRadius: 8, fontSize: 14.5, fontWeight: 600,
      boxShadow: "0 6px 20px rgba(0,0,0,0.18)", zIndex: 999, maxWidth: "90%",
      textAlign: "center",
    }}>
      {toast.msg}
    </div>
  );
}

function ProgressDots({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 4, flex: 1, borderRadius: 2,
          background: i <= step ? C.ink : C.line,
        }} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Supabase row <-> app-shape mapping                                     */
/* ---------------------------------------------------------------------- */
/* Postgres columns are snake_case; every screen in this app was written  */
/* against camelCase objects, so we map at the boundary and leave the     */
/* rest of the UI untouched.                                              */

const toCamelCustomer = (r) => ({
  id: r.id,
  name: r.name,
  mobile: r.mobile,
  address: r.address,
  idProofType: r.id_proof_type || "",
  idProofPath: r.id_proof_path || "",
  idProofFileName: r.id_proof_file_name || "",
  createdAt: r.created_at,
});

const toCamelLead = (r) => ({
  leadId: r.lead_id,
  customerId: r.customer_id,
  feUsername: r.fe_username,
  feName: r.fe_name,
  visitDate: r.visit_date,
  deviceBrand: r.device_brand,
  deviceModel: r.device_model,
  expectedPrice: Number(r.expected_price) || 0,
  purchasePrice: Number(r.purchase_price) || 0,
  commission: Number(r.commission) || 0,
  commissionAmount: Number(r.commission_amount) || 0,
  status: r.status,
  remarks: r.remarks || "",
  createdAt: r.created_at,
});

const toCamelFe = (r) => ({
  username: r.username,
  name: r.name,
  active: r.active,
});

/* ---------------------------------------------------------------------- */
/* Main App                                                                */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [fes, setFes] = useState([]);
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem("session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
 const [view, setView] = useState(() => {
  try {
    const saved = sessionStorage.getItem("session");
    if (!saved) return "login";
    const s = JSON.parse(saved);
    return s.role === "admin" ? "admin" : "fe-dashboard";
  } catch {
    return "login";
  }
});
  const [viewParams, setViewParams] = useState({});
  const [wizard, setWizard] = useState(null);

  const flash = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  
  useEffect(() => {
    (async () => {
      try {
        const [custRes, leadRes, feRes] = await Promise.all([
          supabase.from("customers").select("*").order("created_at", { ascending: true }),
          supabase.from("leads").select("*").order("created_at", { ascending: true }),
          supabase.from("field_executives").select("username, name, active").order("name", { ascending: true }),
        ]);
        if (custRes.error) throw custRes.error;
        if (leadRes.error) throw leadRes.error;
        if (feRes.error) throw feRes.error;
        setCustomers(custRes.data.map(toCamelCustomer));
        setLeads(leadRes.data.map(toCamelLead));
        setFes(feRes.data.map(toCamelFe));
        setReady(true);
      } catch (e) {
        setLoadError("Could not load data from Supabase. Check your connection and try again.");
        setReady(true);
      }
    })();
  }, []);

  // Insert one customer row and reflect it in local state.
  const addCustomerRow = useCallback(async (customer) => {
    const { data, error } = await supabase.from("customers").insert(customer).select().single();
    if (error) { flash("Could not save customer — try again", "error"); throw error; }
    const mapped = toCamelCustomer(data);
    setCustomers((prev) => [...prev, mapped]);
    return mapped;
  }, [flash]);

  // Patch one customer row (used for ID-proof updates) and reflect it locally.
  const updateCustomerRow = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select().single();
    if (error) { flash("Could not update customer — try again", "error"); throw error; }
    const mapped = toCamelCustomer(data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? mapped : c)));
    return mapped;
  }, [flash]);

  // Insert one lead row and reflect it in local state.
  const addLeadRow = useCallback(async (lead) => {
    const { data, error } = await supabase.from("leads").insert(lead).select().single();
    if (error) { flash("Could not save lead — try again", "error"); throw error; }
    const mapped = toCamelLead(data);
    setLeads((prev) => [...prev, mapped]);
    return mapped;
  }, [flash]);

  const goto = (v, params = {}) => { setView(v); setViewParams(params); };
  const logout = () => {
    sessionStorage.removeItem("session");
    setSession(null);
    setWizard(null);
    goto("login");
  };
  const handleLogin = (s) => {
    sessionStorage.setItem("session", JSON.stringify(s));
    setSession(s);
    goto(s.role === "admin" ? "admin" : "fe-dashboard");
  };

  
  if (!ready) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", color: C.slate }}>
          Loading workspace…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {loadError && <div style={{ background: C.rustBg, color: C.rust, padding: 10, fontSize: 13, textAlign: "center" }}>{loadError}</div>}
      {!session && <LoginScreen fes={fes} onLogin={handleLogin} />}

      {session && session.role === "fe" && !wizard && view === "fe-dashboard" && (
        <FeDashboard
          fe={session}
          leads={leads}
          customers={customers}
          onLogout={logout}
          onAddLead={() => setWizard(initialWizard())}
          onOpenCustomer={(id) => goto("customer-profile", { customerId: id, from: "fe-dashboard" })}
        />
      )}

      {session && session.role === "fe" && wizard && (
        <AddLeadWizard
          wizard={wizard}
          setWizard={setWizard}
          fe={session}
          customers={customers}
          leads={leads}
          addCustomerRow={addCustomerRow}
          updateCustomerRow={updateCustomerRow}
          addLeadRow={addLeadRow}
          flash={flash}
          onCancel={() => setWizard(null)}
          onDone={(customerId) => { setWizard(null); goto("customer-profile", { customerId, from: "fe-dashboard" }); }}
          onFinishToDashboard={() => { setWizard(null); goto("fe-dashboard"); }}
        />
      )}

      {session && view === "customer-profile" && !wizard && (
        <CustomerProfile
          customerId={viewParams.customerId}
          customers={customers}
          leads={leads}
          session={session}
          onBack={() => goto(viewParams.from === "admin" ? "admin" : "fe-dashboard")}
          onAddLead={(customerId, mobile) => setWizard(initialWizard({ customerId, mobile, skipTo: "device" }))}
        />
      )}

      {session && session.role === "admin" && view !== "customer-profile" && (
        <AdminShell
          admin={session}
          onLogout={logout}
          customers={customers}
          leads={leads}
          fes={fes}
          setFes={setFes}
          flash={flash}
          onOpenCustomer={(id) => goto("customer-profile", { customerId: id, from: "admin" })}
        />
      )}

      <Toast toast={toast} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: C.paper, minHeight: "100%", color: C.ink }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: ${C.ink} !important; }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 10px 12px; font-size: 13.5px; border-bottom: 1px solid ${C.line}; }
        th { color: ${C.slate}; font-weight: 600; font-size: 12px; text-transform: none; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
      `}</style>
      {children}
    </div>
  );
}

function initialWizard({ customerId, mobile, skipTo } = {}) {
  return {
    step: skipTo === "device" ? "device" : "mobile",
    mobile: mobile || "",
    customerId: customerId || null,
    isNewCustomer: false,
    customerDraft: { name: "", address: "" },
    idProofType: "", idProofPath: "", idProofFileName: "",
    leadId: "", deviceBrand: "", deviceModel: "", expectedPrice: "", purchasePrice: "",
    commission: "", status: "Pending", remarks: "",
    saved: false,
  };
}

/* ---------------------------------------------------------------------- */
/* Login                                                                   */
/* ---------------------------------------------------------------------- */

function LoginScreen({ fes, onLogin }) {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const activeFes = fes.filter((f) => f.active);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (role === "admin") {
        const { data, error } = await supabase.rpc("verify_admin_login", {
          p_username: username.trim(), p_password: password,
        });
        if (error || !data || data.length === 0) { setErr("Incorrect username or password."); return; }
        onLogin({ role: "admin", username: data[0].username, name: "Admin" });
      } else {
        if (!username) { setErr("Select a field executive."); return; }
        const { data, error } = await supabase.rpc("verify_fe_login", {
          p_username: username, p_password: password,
        });
        if (error || !data || data.length === 0) { setErr("Incorrect password."); return; }
        onLogin({ role: "fe", username: data[0].username, name: data[0].name });
      }
    } catch (e) {
      setErr("Could not reach the server — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: C.ink }}>
            Field Ledger
          </div>
          <div style={{ fontSize: 13.5, color: C.slate, marginTop: 4 }}>Customer &amp; lead tracking for device pickups</div>
        </div>

        {!role && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BigButton icon={Smartphone} onClick={() => setRole("fe")}>Field Executive</BigButton>
            <BigButton icon={ShieldCheck} tone="outline" onClick={() => setRole("admin")}>Admin</BigButton>
          </div>
        )}

        {role && (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 22 }}>
            <button
              onClick={() => { setRole(null); setUsername(""); setPassword(""); setErr(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.slate, fontSize: 13, marginBottom: 14, cursor: "pointer", padding: 0 }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            {role === "fe" ? (
              <Field label="Field executive">
                <Select value={username} onChange={(e) => setUsername(e.target.value)}>
                  <option value="">Select your name</option>
                  {activeFes.map((f) => <option key={f.username} value={f.username}>{f.name}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Username">
                <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
              </Field>
            )}

            <Field label="Password">
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
            </Field>

            {err && <div style={{ color: C.rust, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{err}</div>}

            <BigButton onClick={submit} disabled={busy}>{busy ? "Checking…" : "Log in"}</BigButton>
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.slate, textAlign: "center", marginTop: 22, lineHeight: 1.5 }}>
          Demo logins: field executives use <b>firstname123</b>; admin uses <b>admin123</b>.
          Change these in Supabase before sharing this app with real users.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* FE Dashboard                                                            */
/* ---------------------------------------------------------------------- */

function FeDashboard({ fe, leads, customers, onLogout, onAddLead, onOpenCustomer }) {
  const mine = useMemo(() => leads.filter((l) => l.feUsername === fe.username), [leads, fe]);
  const today = todayISO();
  const counts = useMemo(() => ({
    today: mine.filter((l) => isSameDay(l.visitDate, today)).length,
    completed: mine.filter((l) => l.status === "Completed").length,
    pending: mine.filter((l) => l.status === "Pending").length,
    cancelled: mine.filter((l) => l.status === "Cancelled").length,
    total: mine.length,
  }), [mine, today]);

  const recent = useMemo(
    () => [...mine].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)).slice(0, 8),
    [mine]
  );
  const custById = (id) => customers.find((c) => c.id === id);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.paper }}>
      <div style={{ padding: "20px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: C.slate }}>Welcome back</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 21 }}>{fe.name}</div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div style={{ padding: "8px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <StatTile label="Today's leads" value={counts.today} />
          <StatTile label="Total leads" value={counts.total} />
          <StatTile label="Completed" value={counts.completed} tone={C.ledger} />
          <StatTile label="Pending" value={counts.pending} tone={C.amber} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <StatTile label="Cancelled" value={counts.cancelled} tone={C.rust} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <BigButton icon={Plus} onClick={onAddLead} style={{ padding: "18px 18px", fontSize: 17.5 }}>
            Add new lead
          </BigButton>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 10, letterSpacing: 0.2 }}>
          Recent visits
        </div>
        {recent.length === 0 && (
          <div style={{ color: C.slate, fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
            No leads yet. Tap "Add new lead" to record your first visit.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map((l) => {
            const cust = custById(l.customerId);
            return (
              <button key={l.leadId} onClick={() => onOpenCustomer(l.customerId)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8,
                  padding: "12px 14px", cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{cust ? cust.name : "Unknown customer"}</div>
                  <div style={{ fontSize: 12.5, color: C.slate }}>{l.deviceBrand} {l.deviceModel} · {l.leadId}</div>
                </div>
                <Badge status={l.status} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Add Lead Wizard                                                         */
/* ---------------------------------------------------------------------- */

const STEPS = ["mobile", "customer", "device", "leadid", "commission", "idproof", "finish"];
const BRAND_MODELS = {
  Apple: ["iPhone 11", "iPhone 11 Pro", "iPhone 12", "iPhone 12 Pro", "iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro"],
  Samsung: ["Galaxy S21", "Galaxy S22", "Galaxy S23", "Galaxy S24", "Galaxy Note 20", "Galaxy A54", "Galaxy A34", "Galaxy M54", "Galaxy Z Flip", "Galaxy Z Fold"],
  Redmi: ["Redmi Note 10", "Redmi Note 11", "Redmi Note 12", "Redmi Note 13", "Redmi 10", "Redmi 12", "Redmi K50"],
  Xiaomi: ["Xiaomi 11", "Xiaomi 12", "Xiaomi 13", "Xiaomi 14"],
  OnePlus: ["OnePlus Nord", "OnePlus Nord 2", "OnePlus 9", "OnePlus 10", "OnePlus 11", "OnePlus 12"],
  Vivo: ["Vivo Y series", "Vivo V series", "Vivo X series", "Vivo T series"],
  Oppo: ["Oppo A series", "Oppo F series", "Oppo Reno series"],
  Realme: ["Realme Narzo", "Realme GT", "Realme C series", "Realme Number series"],
  Motorola: ["Moto G series", "Moto Edge series"],
  Google: ["Pixel 6", "Pixel 7", "Pixel 8", "Pixel 9"],
  Nothing: ["Phone 1", "Phone 2", "Phone 2a"],
  Other: [],
};

function AddLeadWizard({ wizard, setWizard, fe, customers, leads, addCustomerRow, updateCustomerRow, addLeadRow, flash, onCancel, onDone, onFinishToDashboard }) {
  const w = wizard;
  const stepIndex = STEPS.indexOf(w.step);
  const set = (patch) => setWizard((cur) => ({ ...cur, ...patch }));

  const findExisting = (mobile) => customers.find((c) => last10(c.mobile) === last10(mobile) && last10(mobile).length === 10);

  const goStep = (s) => set({ step: s });

  const handleMobileNext = () => {
    if (last10(w.mobile).length !== 10) return flash("Enter a valid 10-digit mobile number.", "error");
    const existing = findExisting(w.mobile);
    set({ isNewCustomer: !existing, customerId: existing ? existing.id : null, step: "customer" });
  };

  const handleNewCustomerNext = async () => {
    if (!w.customerDraft.name.trim()) return flash("Customer name is required.", "error");
    if (!w.customerDraft.address.trim()) return flash("Pickup address is required.", "error");
    try {
      const { data: nextSeq, error: seqError } = await supabase.rpc("next_customer_seq");
      if (seqError) throw seqError;
      const saved = await addCustomerRow({
        id: pad5(nextSeq),
        name: w.customerDraft.name.trim(),
        mobile: w.mobile,
        address: w.customerDraft.address.trim(),
        id_proof_type: "", id_proof_path: "", id_proof_file_name: "",
        created_at: new Date().toISOString(),
      });
      set({ customerId: saved.id, step: "device" });
      flash(`Customer created — ${saved.id}`);
    } catch (e) {
      /* addCustomerRow already flashed an error; sequence errors fall through here */
    }
  };

  const customer = customers.find((c) => c.id === w.customerId);
  const customerHistory = customer ? leads.filter((l) => l.customerId === customer.id) : [];

  const handleDeviceNext = () => {
  if (!w.deviceBrand || !w.deviceModel) return flash("Select device brand and model.", "error");
  if (w.purchasePrice === "" || Number(w.purchasePrice) < 0) return flash("Enter a valid purchase price.", "error");
  goStep("leadid");
};

  const handleLeadIdNext = () => {
    if (!w.leadId.trim()) return flash("Lead ID is required.", "error");
    if (leads.some((l) => l.leadId.toLowerCase() === w.leadId.trim().toLowerCase())) {
      return flash("This Lead ID already exists — check with Cashify.", "error");
    }
    goStep("commission");
  };

  const commissionAmount = (Number(w.commission) || 0) * 13;

  const handleCommissionNext = () => {
    if (w.commission === "" || Number(w.commission) < 0) return flash("Enter the commission number.", "error");
    goStep("idproof");
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1_500_000) return flash("Image too large — choose a file under 1.5 MB.", "error");
    try {
      const path = `${w.customerId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("id-proofs").upload(path, file, { upsert: true });
      if (error) throw error;
      set({ idProofPath: path, idProofFileName: file.name });
    } catch (err) {
      flash("Could not upload that file — try again.", "error");
    }
  };

  const handleSave = async () => {
    try {
      await addLeadRow({
        lead_id: w.leadId.trim(),
        customer_id: w.customerId,
        fe_username: fe.username,
        fe_name: fe.name,
        visit_date: new Date().toISOString(),
        device_brand: w.deviceBrand.trim(),
        device_model: w.deviceModel.trim(),
        expected_price: Number(w.purchasePrice),
        purchase_price: Number(w.purchasePrice),
        commission: Number(w.commission),
        commission_amount: commissionAmount,
        status: w.status,
        remarks: w.remarks.trim(),
        created_at: new Date().toISOString(),
      });

      if (w.idProofType || w.idProofPath) {
        await updateCustomerRow(w.customerId, {
          id_proof_type: w.idProofType || customer?.idProofType || "",
          id_proof_path: w.idProofPath || customer?.idProofPath || "",
          id_proof_file_name: w.idProofFileName || customer?.idProofFileName || "",
        });
      }
      flash("Lead saved.");
      set({ step: "saved" });
    } catch (e) {
      /* addLeadRow / updateCustomerRow already flashed an error */
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.paper, padding: "18px 18px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.slate, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 13.5, padding: 0 }}>
          <ArrowLeft size={16} /> Cancel
        </button>
        <div style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>
          {w.step !== "saved" && `Step ${Math.max(stepIndex, 0) + 1} of ${STEPS.length}`}
        </div>
      </div>
      {w.step !== "saved" && <ProgressDots step={stepIndex} total={STEPS.length} />}

      {w.step === "mobile" && (
        <div>
          <SectionTitle icon={Phone} title="Customer mobile number" subtitle="We'll check if this customer already exists." />
          <Field label="Mobile number">
            <TextInput inputMode="numeric" autoFocus value={w.mobile}
              onChange={(e) => set({ mobile: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleMobileNext()}
              placeholder="10-digit mobile number" />
          </Field>
          <BigButton onClick={handleMobileNext}>Continue</BigButton>
        </div>
      )}

      {w.step === "customer" && w.isNewCustomer && (
        <div>
          <SectionTitle icon={UserPlus} title="New customer" subtitle="No record found for this number — enter their details." />
          <Field label="Customer name">
            <TextInput autoFocus value={w.customerDraft.name} onChange={(e) => set({ customerDraft: { ...w.customerDraft, name: e.target.value } })} placeholder="Full name" />
          </Field>
          <Field label="Pickup address">
            <TextArea value={w.customerDraft.address} onChange={(e) => set({ customerDraft: { ...w.customerDraft, address: e.target.value } })} placeholder="Address for pickup" />
          </Field>
          <BigButton onClick={handleNewCustomerNext}>Create customer &amp; continue</BigButton>
        </div>
      )}

      {w.step === "customer" && !w.isNewCustomer && customer && (
        <div>
          <div style={{ background: C.ledgerBg, color: C.ledger, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 14, display: "inline-block" }}>
            Existing customer found
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Row label="Name" value={customer.name} />
            <Row label="Customer ID" value={customer.id} />
            <Row label="Mobile" value={customer.mobile} />
            <Row label="Address" value={customer.address} />
            <Row label="Previous visits" value={String(customerHistory.length)} />
            {customerHistory.length > 0 && (
              <Row label="Last device" value={`${customerHistory[customerHistory.length - 1].deviceBrand} ${customerHistory[customerHistory.length - 1].deviceModel}`} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BigButton icon={Plus} onClick={() => goStep("device")}>Add new lead for this customer</BigButton>
            <BigButton tone="outline" icon={History} onClick={() => onDone(customer.id)}>View customer history</BigButton>
          </div>
        </div>
      )}

      {w.step === "device" && (
        <div>
          <SectionTitle icon={Smartphone} title="Device details" />
          <Field label="Device brand">
            <Select autoFocus value={w.deviceBrand in BRAND_MODELS ? w.deviceBrand : (w.deviceBrand ? "Other" : "")}
              onChange={(e) => set({ deviceBrand: e.target.value === "Other" ? "" : e.target.value, deviceModel: "" })}>
              <option value="">Select brand</option>
              {Object.keys(BRAND_MODELS).map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>

          {(!( w.deviceBrand in BRAND_MODELS) || w.deviceBrand === "") && (
            <Field label="Enter brand name">
              <TextInput value={w.deviceBrand} onChange={(e) => set({ deviceBrand: e.target.value })} placeholder="Type brand name" />
            </Field>
          )}

          {w.deviceBrand in BRAND_MODELS && BRAND_MODELS[w.deviceBrand].length > 0 ? (
            <Field label="Device model">
              <Select value={w.deviceModel} onChange={(e) => set({ deviceModel: e.target.value === "Other" ? "" : e.target.value })}>
                <option value="">Select model</option>
                {BRAND_MODELS[w.deviceBrand].map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="Other">Other</option>
              </Select>
              {!BRAND_MODELS[w.deviceBrand].includes(w.deviceModel) && (
                <TextInput style={{ marginTop: 8 }} value={w.deviceModel} onChange={(e) => set({ deviceModel: e.target.value })} placeholder="Type model name" />
              )}
            </Field>
          ) : (
            <Field label="Device model">
              <TextInput value={w.deviceModel} onChange={(e) => set({ deviceModel: e.target.value })} placeholder="Type model name" />
            </Field>
          )}

          <Field label="Purchase price">
            <TextInput inputMode="decimal" value={w.purchasePrice} onChange={(e) => set({ purchasePrice: e.target.value })} placeholder="₹" />
          </Field>
          <BigButton onClick={handleDeviceNext}>Continue</BigButton>
        </div>
    )}

      {w.step === "leadid" && (
        <div>
          <SectionTitle icon={ClipboardList} title="Lead ID" subtitle="Enter the Lead ID exactly as provided by Cashify." />
          <Field label="Lead ID">
            <TextInput autoFocus value={w.leadId} onChange={(e) => set({ leadId: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleLeadIdNext()} placeholder="e.g. CF12345678" />
          </Field>
          <BigButton onClick={handleLeadIdNext}>Continue</BigButton>
        </div>
      )}
      {w.step === "commission" && (
        <div>
          <SectionTitle icon={Wallet} title="Commission" subtitle="Purchase price has no effect on commission." />
          <Field label="Commission">
            <TextInput autoFocus inputMode="decimal" value={w.commission} onChange={(e) => set({ commission: e.target.value })} placeholder="Enter commission number" />
          </Field>
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 18, textAlign: "center" }}>
            <div style={{ fontSize: 12.5, color: C.slate, fontWeight: 600, marginBottom: 4 }}>Commission amount (× 13)</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: C.amber }}>{inr(commissionAmount)}</div>
          </div>
          <BigButton onClick={handleCommissionNext}>Continue</BigButton>
        </div>
      )}

      {w.step === "idproof" && (
        <div>
          <SectionTitle icon={ClipboardList} title="ID proof" subtitle="Optional — add if required for this visit." />
          <Field label="ID proof type">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Driving Licence", "Aadhaar Card", "Passport"].map((t) => (
                <button key={t} onClick={() => set({ idProofType: t })}
                  style={{
                    textAlign: "left", padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${w.idProofType === t ? C.ink : C.line}`,
                    background: w.idProofType === t ? C.paperDim : "#fff", fontSize: 15, fontWeight: 600,
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Upload document (optional)">
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: `1.5px dashed ${C.line}`, borderRadius: 8, padding: "16px", cursor: "pointer", color: C.slate,
            }}>
              <Upload size={16} />
              {w.idProofFileName ? w.idProofFileName : "Choose image"}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </Field>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BigButton onClick={() => goStep("finish")}>Continue</BigButton>
          </div>
        </div>
      )}

      {w.step === "finish" && (
        <div>
          <SectionTitle icon={ClipboardList} title="Status &amp; remarks" />
          <Field label="Status">
            <div style={{ display: "flex", gap: 8 }}>
              {["Pending", "Completed", "Cancelled"].map((s) => {
                const meta = STATUS_META[s];
                const active = w.status === s;
                return (
                  <button key={s} onClick={() => set({ status: s })}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 700,
                      border: `1.5px solid ${active ? meta.fg : C.line}`,
                      background: active ? meta.bg : "#fff", color: active ? meta.fg : C.ink2,
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Remarks (optional)">
            <TextArea value={w.remarks} onChange={(e) => set({ remarks: e.target.value })} placeholder="Anything worth noting about this visit" />
          </Field>

          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.slate, marginBottom: 10 }}>Review</div>
            <Row label="Customer" value={customer ? `${customer.name} (${customer.id})` : "—"} />
            <Row label="Device" value={`${w.deviceBrand} ${w.deviceModel}`} />
            <Row label="Lead ID" value={w.leadId} />
            <Row label="Expected price" value={inr(w.expectedPrice)} />
            <Row label="Purchase price" value={inr(w.purchasePrice)} />
            <Row label="Commission amount" value={inr(commissionAmount)} />
            <Row label="ID proof" value={w.idProofType || "Not provided"} />
          </div>

          <BigButton tone="ledger" onClick={handleSave}>Save lead</BigButton>
        </div>
      )}

      {w.step === "saved" && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: C.ledgerBg, color: C.ledger,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
          }}>
            <Check size={30} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Lead saved</div>
          <div style={{ color: C.slate, fontSize: 14, marginBottom: 30 }}>{w.leadId} has been recorded for {customer?.name}.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BigButton icon={History} tone="outline" onClick={() => onDone(w.customerId)}>View customer history</BigButton>
            <BigButton onClick={onFinishToDashboard}>Back to dashboard</BigButton>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: subtitle ? 4 : 0 }}>
        <Icon size={19} color={C.ink} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700 }}>{title}</div>
      </div>
      {subtitle && <div style={{ fontSize: 13, color: C.slate }}>{subtitle}</div>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px solid ${C.paperDim}`, fontSize: 13.5 }}>
      <span style={{ color: C.slate }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Customer Profile                                                        */
/* ---------------------------------------------------------------------- */

function CustomerProfile({ customerId, customers, leads, session, onBack, onAddLead }) {
  const customer = customers.find((c) => c.id === customerId);
  const history = useMemo(
    () => leads.filter((l) => l.customerId === customerId).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)),
    [leads, customerId]
  );
  const latest = history[0];

  if (!customer) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
        <BackBtn onBack={onBack} />
        <div style={{ color: C.slate, marginTop: 20 }}>Customer not found.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 18px 50px" }}>
      <BackBtn onBack={onBack} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700 }}>{customer.name}</div>
          <div style={{ color: C.slate, fontSize: 13.5 }}>{customer.id}</div>
        </div>
        {latest && <Badge status={latest.status} />}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <Row label="Mobile" value={customer.mobile} />
        <Row label="Address" value={customer.address} />
        <Row label="ID proof" value={customer.idProofType || "Not provided"} />
        <Row label="Customer since" value={fmtDate(customer.createdAt)} />
        <div style={{ marginTop: 12 }}>
          <a href={`tel:${customer.mobile}`} style={{ textDecoration: "none" }}>
            <BigButton icon={Phone} tone="ledger">Call customer</BigButton>
          </a>
        </div>
      </div>

      {latest && (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.slate, marginBottom: 10 }}>Latest lead</div>
          <Row label="Lead ID" value={latest.leadId} />
          <Row label="Device" value={`${latest.deviceBrand} ${latest.deviceModel}`} />
          <Row label="Expected price" value={inr(latest.expectedPrice)} />
          <Row label="Purchase price" value={inr(latest.purchasePrice)} />
          <Row label="Commission" value={`${latest.commission} → ${inr(latest.commissionAmount)}`} />
          <Row label="Field executive" value={latest.feName} />
          <Row label="Visit date" value={fmtDateTime(latest.visitDate)} />
          {latest.remarks && <Row label="Remarks" value={latest.remarks} />}
        </div>
      )}

      {session.role === "fe" && (
        <div style={{ marginBottom: 22 }}>
          <BigButton icon={Plus} onClick={() => onAddLead(customer.id, customer.mobile)}>Add new lead for this customer</BigButton>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 10 }}>
        History ({history.length} visit{history.length !== 1 ? "s" : ""})
      </div>
      {history.length === 0 ? (
        <div style={{ color: C.slate, fontSize: 13.5 }}>No leads recorded yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map((l) => (
            <div key={l.leadId} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{l.deviceBrand} {l.deviceModel}</div>
                <Badge status={l.status} />
              </div>
              <Row label="Lead ID" value={l.leadId} />
              <Row label="Purchase price" value={inr(l.purchasePrice)} />
              <Row label="Commission" value={inr(l.commissionAmount)} />
              <Row label="Field executive" value={l.feName} />
              <Row label="Visit" value={fmtDateTime(l.visitDate)} />
              {l.remarks && <Row label="Remarks" value={l.remarks} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} style={{ background: "none", border: "none", color: C.slate, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5, padding: 0 }}>
      <ArrowLeft size={16} /> Back
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/* Admin shell                                                             */
/* ---------------------------------------------------------------------- */

const ADMIN_TABS = [
  { id: "overview", label: "Overview", Icon: TrendingUp },
  { id: "search", label: "Search", Icon: Search },
  { id: "leads", label: "Leads & filters", Icon: SlidersHorizontal },
  { id: "fes", label: "Field executives", Icon: Users },
];

function AdminShell({ admin, onLogout, customers, leads, fes, setFes, flash, onOpenCustomer }) {
  const [tab, setTab] = useState("overview");

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${C.line}`, background: "#fff" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19 }}>Field Ledger · Admin</div>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13.5 }}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 24px 0", borderBottom: `1px solid ${C.line}`, background: "#fff", overflowX: "auto" }}>
        {ADMIN_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", cursor: "pointer",
              background: "none", border: "none", whiteSpace: "nowrap",
              borderBottom: tab === t.id ? `2.5px solid ${C.ink}` : "2.5px solid transparent",
              color: tab === t.id ? C.ink : C.slate, fontWeight: 600, fontSize: 13.5,
            }}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "22px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
        {tab === "overview" && <AdminOverview customers={customers} leads={leads} fes={fes} />}
        {tab === "search" && <AdminSearch customers={customers} leads={leads} onOpenCustomer={onOpenCustomer} />}
        {tab === "leads" && <AdminLeadsFilters customers={customers} leads={leads} fes={fes} flash={flash} onOpenCustomer={onOpenCustomer} />}
        {tab === "fes" && <AdminFes fes={fes} setFes={setFes} leads={leads} flash={flash} />}
      </div>
    </div>
  );
}

function AdminOverview({ customers, leads, fes }) {
  const today = todayISO();
  const stats = useMemo(() => ({
    totalCustomers: customers.length,
    totalLeads: leads.length,
    today: leads.filter((l) => isSameDay(l.visitDate, today)).length,
    completed: leads.filter((l) => l.status === "Completed").length,
    pending: leads.filter((l) => l.status === "Pending").length,
    cancelled: leads.filter((l) => l.status === "Cancelled").length,
    purchaseValue: leads.reduce((s, l) => s + (Number(l.purchasePrice) || 0), 0),
    commissionValue: leads.reduce((s, l) => s + (Number(l.commissionAmount) || 0), 0),
  }), [customers, leads, today]);

  const perf = useMemo(() => fes.map((f) => {
    const mine = leads.filter((l) => l.feUsername === f.username);
    return {
      ...f,
      total: mine.length,
      completed: mine.filter((l) => l.status === "Completed").length,
      pending: mine.filter((l) => l.status === "Pending").length,
      cancelled: mine.filter((l) => l.status === "Cancelled").length,
      purchaseValue: mine.reduce((s, l) => s + (Number(l.purchasePrice) || 0), 0),
      commissionValue: mine.reduce((s, l) => s + (Number(l.commissionAmount) || 0), 0),
    };
  }), [fes, leads]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 30 }}>
        <StatTile label="Total customers" value={stats.totalCustomers} />
        <StatTile label="Total leads" value={stats.totalLeads} />
        <StatTile label="Today's leads" value={stats.today} />
        <StatTile label="Completed" value={stats.completed} tone={C.ledger} />
        <StatTile label="Pending" value={stats.pending} tone={C.amber} />
        <StatTile label="Cancelled" value={stats.cancelled} tone={C.rust} />
        <StatTile label="Total purchase value" value={inr(stats.purchaseValue)} />
        <StatTile label="Total commission" value={inr(stats.commissionValue)} tone={C.amber} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>Executive performance</div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Status</th><th>Total</th><th>Completed</th><th>Pending</th><th>Cancelled</th><th>Purchase value</th><th>Commission</th>
            </tr>
          </thead>
          <tbody>
            {perf.map((f) => (
              <tr key={f.username}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td>{f.active ? <span style={{ color: C.ledger, fontWeight: 600 }}>Active</span> : <span style={{ color: C.rust, fontWeight: 600 }}>Inactive</span>}</td>
                <td>{f.total}</td><td>{f.completed}</td><td>{f.pending}</td><td>{f.cancelled}</td>
                <td>{inr(f.purchaseValue)}</td><td>{inr(f.commissionValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSearch({ customers, leads, onOpenCustomer }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return customers
      .map((c) => {
        const custLeads = leads.filter((l) => l.customerId === c.id).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
        const matches =
          c.name.toLowerCase().includes(term) ||
          c.mobile.includes(term) ||
          c.id.toLowerCase().includes(term) ||
          custLeads.some((l) =>
            l.leadId.toLowerCase().includes(term) ||
            l.deviceModel.toLowerCase().includes(term) ||
            l.deviceBrand.toLowerCase().includes(term) ||
            l.feName.toLowerCase().includes(term)
          );
        return matches ? { customer: c, latest: custLeads[0] } : null;
      })
      .filter(Boolean);
  }, [q, customers, leads]);

  return (
    <div>
      <Field label="Search by customer name, mobile, customer ID, lead ID, device or executive">
        <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing to search…" />
      </Field>
      {q.trim() && (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Customer</th><th>Customer ID</th><th>Mobile</th><th>Latest device</th><th>Status</th><th>Latest visit</th><th>FE</th><th>Lead ID</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr><td colSpan={8} style={{ color: C.slate, textAlign: "center", padding: 20 }}>No matches found.</td></tr>
              )}
              {results.map(({ customer, latest }) => (
                <tr key={customer.id} onClick={() => onOpenCustomer(customer.id)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 600 }}>{customer.name}</td>
                  <td>{customer.id}</td>
                  <td>{customer.mobile}</td>
                  <td>{latest ? `${latest.deviceBrand} ${latest.deviceModel}` : "—"}</td>
                  <td>{latest ? <Badge status={latest.status} /> : "—"}</td>
                  <td>{latest ? fmtDate(latest.visitDate) : "—"}</td>
                  <td>{latest ? latest.feName : "—"}</td>
                  <td>{latest ? latest.leadId : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminLeadsFilters({ customers, leads, fes, flash, onOpenCustomer }) {
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exec, setExec] = useState("all");
  const [status, setStatus] = useState("all");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  const custById = (id) => customers.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const now = new Date();
    let from = null, to = null;
    if (datePreset === "today") { from = todayISO(); to = todayISO(); }
    else if (datePreset === "yesterday") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      from = y.toISOString().slice(0, 10); to = from;
    } else if (datePreset === "week") { from = startOfWeek().toISOString().slice(0, 10); to = todayISO(); }
    else if (datePreset === "month") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      from = m.toISOString().slice(0, 10); to = todayISO();
    } else if (datePreset === "custom") { from = customFrom || null; to = customTo || null; }

    return leads.filter((l) => {
      const day = (l.visitDate || "").slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (exec !== "all" && l.feUsername !== exec) return false;
      if (status !== "all" && l.status !== status) return false;
      if (brand.trim() && !l.deviceBrand.toLowerCase().includes(brand.trim().toLowerCase())) return false;
      if (model.trim() && !l.deviceModel.toLowerCase().includes(model.trim().toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
  }, [leads, datePreset, customFrom, customTo, exec, status, brand, model]);

  const exportCsv = () => {
    if (filtered.length === 0) return flash("Nothing to export for these filters.", "error");
    const cols = ["Customer ID", "Customer Name", "Mobile Number", "Address", "Lead ID", "Device Brand", "Device Model",
      "Expected Price", "Purchase Price", "Commission", "Commission Amount", "ID Proof Type", "FE Name", "Visit Date", "Status", "Remarks"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((l) => {
      const c = custById(l.customerId) || {};
      return [c.id, c.name, c.mobile, c.address, l.leadId, l.deviceBrand, l.deviceModel, l.expectedPrice, l.purchasePrice,
        l.commission, l.commissionAmount, c.idProofType, l.feName, l.visitDate, l.status, l.remarks].map(esc).join(",");
    });
    const csv = [cols.map(esc).join(","), ...rows].join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `leads-export-${todayISO()}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash(`Exported ${filtered.length} lead${filtered.length !== 1 ? "s" : ""}.`);
    } catch (e) {
      flash("Export failed in this environment.", "error");
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginBottom: 16, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 16 }}>
        <Field label="Date range">
          <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </Select>
        </Field>
        {datePreset === "custom" && (
          <>
            <Field label="From"><TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
            <Field label="To"><TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
          </>
        )}
        <Field label="Executive">
          <Select value={exec} onChange={(e) => setExec(e.target.value)}>
            <option value="all">All executives</option>
            {fes.map((f) => <option key={f.username} value={f.username}>{f.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option>Pending</option><option>Completed</option><option>Cancelled</option>
          </Select>
        </Field>
        <Field label="Device brand"><TextInput value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Apple" /></Field>
        <Field label="Device model"><TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 14" /></Field>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, color: C.slate }}>{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</div>
        <button onClick={exportCsv} style={{
          display: "flex", alignItems: "center", gap: 6, background: C.ink, color: "#fff", border: "none",
          padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Lead ID</th><th>Customer</th><th>Mobile</th><th>FE</th><th>Device</th><th>Purchase</th><th>Commission</th><th>Status</th><th>Visit date</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: C.slate, padding: 20 }}>No leads match these filters.</td></tr>}
            {filtered.map((l) => {
              const c = custById(l.customerId);
              return (
                <tr key={l.leadId} onClick={() => onOpenCustomer(l.customerId)} style={{ cursor: "pointer" }}>
                  <td>{l.leadId}</td>
                  <td style={{ fontWeight: 600 }}>{c ? c.name : "—"}</td>
                  <td>{c ? c.mobile : "—"}</td>
                  <td>{l.feName}</td>
                  <td>{l.deviceBrand} {l.deviceModel}</td>
                  <td>{inr(l.purchasePrice)}</td>
                  <td>{inr(l.commissionAmount)}</td>
                  <td><Badge status={l.status} /></td>
                  <td>{fmtDate(l.visitDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminFes({ fes, setFes, leads, flash }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", username: "", password: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const addFe = async () => {
    if (!draft.name.trim() || !draft.username.trim() || !draft.password.trim()) return flash("All fields are required.", "error");
    const uname = draft.username.trim().toLowerCase();
    if (fes.some((f) => f.username === uname)) return flash("That username is already taken.", "error");
    try {
      const { error } = await supabase.rpc("add_field_executive", {
        p_username: uname, p_name: draft.name.trim(), p_password: draft.password,
      });
      if (error) throw error;
      setFes((prev) => [...prev, { username: uname, name: draft.name.trim(), active: true }]);
      setDraft({ name: "", username: "", password: "" });
      setAdding(false);
      flash("Field executive added.");
    } catch (e) {
      flash("Could not add field executive — try again.", "error");
    }
  };

  // Password field starts blank on edit — the hash isn't readable, and leaving it
  // blank means "keep the current password".
  const startEdit = (f) => { setEditingUser(f.username); setEditDraft({ name: f.name, password: "" }); };
  const saveEdit = async () => {
    try {
      const { error: nameErr } = await supabase.rpc("update_fe_name", {
        p_username: editingUser, p_name: editDraft.name.trim(),
      });
      if (nameErr) throw nameErr;
      if (editDraft.password && editDraft.password.trim()) {
        const { error: pwErr } = await supabase.rpc("set_fe_password", {
          p_username: editingUser, p_password: editDraft.password.trim(),
        });
        if (pwErr) throw pwErr;
      }
      setFes((prev) => prev.map((f) => (f.username === editingUser ? { ...f, name: editDraft.name.trim() } : f)));
      setEditingUser(null);
      flash("Updated.");
    } catch (e) {
      flash("Could not update — try again.", "error");
    }
  };
  const toggleActive = async (username) => {
    const target = fes.find((f) => f.username === username);
    if (!target) return;
    try {
      const { error } = await supabase.rpc("set_fe_active", { p_username: username, p_active: !target.active });
      if (error) throw error;
      setFes((prev) => prev.map((f) => (f.username === username ? { ...f, active: !f.active } : f)));
    } catch (e) {
      flash("Could not update status — try again.", "error");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Field executives</div>
        <button onClick={() => setAdding((v) => !v)} style={{
          display: "flex", alignItems: "center", gap: 6, background: C.ink, color: "#fff", border: "none",
          padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          <Plus size={15} /> Add field executive
        </button>
      </div>

      {adding && (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
          <Field label="Name"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Username"><TextInput value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} /></Field>
          <Field label="Password"><TextInput value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></Field>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <BigButton onClick={addFe} style={{ padding: "12px" }}>Save</BigButton>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Leads</th><th>Actions</th></tr></thead>
          <tbody>
            {fes.map((f) => {
              const count = leads.filter((l) => l.feUsername === f.username).length;
              const editing = editingUser === f.username;
              return (
                <tr key={f.username}>
                  <td>
                    {editing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <TextInput value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} style={{ padding: "6px 8px" }} />
                        <TextInput type="password" placeholder="New password (optional)" value={editDraft.password} onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })} style={{ padding: "6px 8px" }} />
                      </div>
                    ) : f.name}
                  </td>
                  <td>{f.username}</td>
                  <td>{f.active ? <span style={{ color: C.ledger, fontWeight: 600 }}>Active</span> : <span style={{ color: C.rust, fontWeight: 600 }}>Inactive</span>}</td>
                  <td>{count}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editing ? (
                        <>
                          <IconBtn onClick={saveEdit} label="Save" />
                          <IconBtn onClick={() => setEditingUser(null)} label="Cancel" />
                        </>
                      ) : (
                        <>
                          <IconBtn onClick={() => startEdit(f)} Icon={Pencil} label="Edit" />
                          <IconBtn onClick={() => toggleActive(f.username)} Icon={f.active ? Ban : RotateCcw} label={f.active ? "Deactivate" : "Reactivate"} tone={f.active ? C.rust : C.ledger} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ onClick, Icon, label, tone }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${C.line}`,
      borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", color: tone || C.ink2, fontWeight: 600,
    }}>
      {Icon && <Icon size={12} />}{label}
    </button>
  );
}
