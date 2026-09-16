import { useState } from "react";
import { ArrowLeft, Smartphone, ShieldCheck } from "lucide-react";
import { supabase } from "../supabaseClient";
import { C } from "../constants/colors";
import { Field } from "../componets/ui/Field";
import { Select } from "../componets/ui/Select";
import { TextInput } from "../componets/ui/TextInput";
import { BigButton } from "../componets/ui/BigButton";

export function LoginScreen({ fes, onLogin }) {
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