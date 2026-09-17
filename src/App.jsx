import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { C } from "./constants/colors";
import { Shell } from "./components/ui/Shell";
import { Toast } from "./components/ui/Toast";
import { LoginScreen } from "./screens/LoginScreen";
import { FeDashboard } from "./screens/FeDashboard";
import { CustomerProfile } from "./screens/CustomerProfile";
import { AddLeadWizard } from "./screens/wizard/AddLeadWizard";
import { initialWizard } from "./screens/wizard/InitialWizard";
import { AdminShell } from "./screens/admin/AdminShell";
import { toCamelCustomer, toCamelLead, toCamelFe } from "./utils/mappers";

function loadSession() {
  try {
    const saved = sessionStorage.getItem("session");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [fes, setFes] = useState([]);
  const [session, setSession] = useState(loadSession);
  const [wizard, setWizard] = useState(null);

  const navigate = useNavigate();

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

  const addCustomerRow = useCallback(async (customer) => {
    const { data, error } = await supabase.from("customers").insert(customer).select().single();
    if (error) { flash("Could not save customer — try again", "error"); throw error; }
    const mapped = toCamelCustomer(data);
    setCustomers((prev) => [...prev, mapped]);
    return mapped;
  }, [flash]);

  const updateCustomerRow = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select().single();
    if (error) { flash("Could not update customer — try again", "error"); throw error; }
    const mapped = toCamelCustomer(data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? mapped : c)));
    return mapped;
  }, [flash]);

  const addLeadRow = useCallback(async (lead) => {
    const { data, error } = await supabase.from("leads").insert(lead).select().single();
    if (error) { flash("Could not save lead — try again", "error"); throw error; }
    const mapped = toCamelLead(data);
    setLeads((prev) => [...prev, mapped]);
    return mapped;
  }, [flash]);

  const logout = () => {
    sessionStorage.removeItem("session");
    setSession(null);
    setWizard(null);
    navigate("/login");
  };

  const handleLogin = (s) => {
    sessionStorage.setItem("session", JSON.stringify(s));
    setSession(s);
    navigate(s.role === "admin" ? "/admin" : "/fe/dashboard");
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

      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to={session.role === "admin" ? "/admin" : "/fe/dashboard"} replace /> : <LoginScreen fes={fes} onLogin={handleLogin} />}
        />

        <Route
          path="/fe/dashboard"
          element={
            session && session.role === "fe" ? (
              <FeDashboard
                fe={session}
                leads={leads}
                customers={customers}
                onLogout={logout}
                onAddLead={() => { setWizard(initialWizard()); navigate("/fe/add-lead"); }}
                onOpenCustomer={(id) => navigate(`/customer/${id}`, { state: { from: "fe-dashboard" } })}
              />
            ) : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/fe/add-lead"
          element={
            session && session.role === "fe" && wizard ? (
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
                onCancel={() => { setWizard(null); navigate("/fe/dashboard"); }}
                onDone={(customerId) => { setWizard(null); navigate(`/customer/${customerId}`, { state: { from: "fe-dashboard" } }); }}
                onFinishToDashboard={() => { setWizard(null); navigate("/fe/dashboard"); }}
              />
            ) : <Navigate to={session?.role === "fe" ? "/fe/dashboard" : "/login"} replace />
          }
        />

        <Route
          path="/customer/:customerId"
          element={
            session ? <CustomerProfileRoute customers={customers} leads={leads} session={session} setWizard={setWizard} /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/admin/*"
          element={
            session && session.role === "admin" ? (
              <AdminShell
                admin={session}
                onLogout={logout}
                customers={customers}
                leads={leads}
                fes={fes}
                setFes={setFes}
                flash={flash}
                onOpenCustomer={(id) => navigate(`/customer/${id}`, { state: { from: "admin" } })}
              />
            ) : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to={session ? (session.role === "admin" ? "/admin" : "/fe/dashboard") : "/login"} replace />} />
      </Routes>

      <Toast toast={toast} />
    </Shell>
  );
}

function CustomerProfileRoute({ customers, leads, session, setWizard }) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "fe-dashboard";

  return (
    <CustomerProfile
      customerId={customerId}
      customers={customers}
      leads={leads}
      session={session}
      onBack={() => navigate(from === "admin" ? "/admin" : "/fe/dashboard")}
      onAddLead={(cId, mobile) => {
        setWizard(initialWizard({ customerId: cId, mobile, skipTo: "device" }));
        navigate("/fe/add-lead");
      }}
    />
  );
}