import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../kernel/api";
import { useStore } from "../foundation/StoreContext";

export function LoginPage() {
  const { refreshUser, refreshCart } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = await api("/api/auth/login", { body: { email, password, remember } });
    if (!result.ok) { setError(result.data?.error ?? "Could not sign in"); return; }
    await refreshUser();
    await refreshCart();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Log in to your account</h1>
      <form onSubmit={submit} className="mt-6 rounded bg-white p-6 text-sm">
        <div>
          <label htmlFor="login-email" className="block font-medium">Email</label>
          <input id="login-email" type="text" value={email} placeholder="Email" onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </div>
        <div className="mt-4">
          <label htmlFor="login-password" className="block font-medium">Password</label>
          <div className="mt-1 flex">
            <input id="login-password" type={show ? "text" : "password"} role="textbox" value={password} placeholder="Password"
              onChange={(event) => setPassword(event.target.value)} className="w-full rounded-l border border-slate-300 px-3 py-2" />
            <button type="button" className="rounded-r bg-slate-500 px-4 font-semibold text-white" onClick={() => setShow((value) => !value)}>SHOW</button>
          </div>
        </div>
        <Link to="/password-recovery" className="mt-3 inline-block text-teal-700 underline">Forgot your password?</Link>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember me
        </label>
        {error && <div role="alert" className="mt-3 rounded bg-red-100 px-3 py-2 text-red-700">{error}</div>}
        <button type="submit" className="mt-4 rounded bg-teal-600 px-6 py-2 font-semibold text-white">Sign in</button>
        <div className="mt-5 border-t border-slate-200 pt-4 text-center">
          <Link to="/register" className="text-teal-700 underline">No account? Create one here</Link>
        </div>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { refreshUser, refreshCart } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", birthdate: "",
  });
  const [receiveOffers, setReceiveOffers] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = await api("/api/auth/register", {
      body: { title: "Mr.", ...form, receiveOffers, newsletter, terms },
    });
    if (!result.ok) { setError(result.data?.error ?? "Could not create the account"); return; }
    await refreshUser();
    await refreshCart();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Create an account</h1>
      <form onSubmit={submit} className="mt-6 rounded bg-white p-6 text-sm">
        <fieldset role="radiogroup" aria-label="Social title">
          <legend className="font-medium">Social title</legend>
          <label className="mt-2 flex items-center gap-2"><input type="radio" name="title" defaultChecked /> Mr.</label>
        </fieldset>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field id="register-first-name" label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
          <Field id="register-last-name" label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
          <Field id="register-email" label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <div>
            <label htmlFor="register-password" className="block font-medium">Password</label>
            <input id="register-password" type="password" role="textbox" value={form.password} placeholder="Password"
              onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <Field id="register-birthdate" label="Birthdate" value={form.birthdate} onChange={(value) => setForm({ ...form, birthdate: value })} />
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={receiveOffers} onChange={(event) => setReceiveOffers(event.target.checked)} /> Receive offers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} /> Newsletter
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /> Terms
          </label>
        </div>
        {error && <div role="alert" className="mt-3 rounded bg-red-100 px-3 py-2 text-red-700">{error}</div>}
        <button type="submit" className="mt-4 rounded bg-teal-600 px-6 py-2 font-semibold text-white">Save</button>
      </form>
    </div>
  );
}

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await api<{ message: string }>("/api/auth/forgot", { body: { email } });
    setMessage(result.ok ? result.data.message : "A reset email could not be sent.");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Forgot your password?</h1>
      <form onSubmit={submit} className="mt-6 rounded bg-white p-6 text-sm">
        <label htmlFor="recovery-email" className="block font-medium">Email</label>
        <input id="recovery-email" type="text" value={email} placeholder="Email" onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        <button type="submit" className="mt-4 rounded bg-teal-600 px-6 py-2 font-semibold text-white">Send</button>
        {message && (
          <div role="status" aria-label="Password reset confirmation" className="mt-4 rounded bg-teal-50 px-3 py-2 text-teal-800">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} type="text" value={value} placeholder={label} onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
    </div>
  );
}
