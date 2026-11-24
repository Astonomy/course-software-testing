import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../kernel/api";
import { Select } from "../kernel/Select";
import { money, useStore } from "../foundation/StoreContext";

const ACCOUNT_LINKS = [
  { to: "/account/information", label: "Information" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/orders", label: "Order history and details" },
  { to: "/account/wishlists", label: "Wishlist" },
];

function AccountNav() {
  return (
    <nav aria-label="Account links" className="mb-4 flex flex-wrap gap-4 rounded bg-white p-3 text-sm">
      {ACCOUNT_LINKS.map((item) => (
        <Link key={item.to} to={item.to} className="font-medium text-teal-700 underline">{item.label}</Link>
      ))}
    </nav>
  );
}

export function AccountPage() {
  const { user } = useStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold">My account</h1>
      <section aria-label="Account overview" className="mt-4 rounded bg-white p-5">
        {user && <p className="text-lg font-medium">{user.name}</p>}
        <nav aria-label="Account links" className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACCOUNT_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="rounded border border-slate-200 p-4 text-sm font-semibold text-teal-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}

export function InformationPage() {
  const { user, refreshUser } = useStore();
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setEmail(user?.email ?? ""); }, [user?.email]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    setError("");
    const result = await api("/api/profile", { method: "PUT", body: { email, currentPassword, newPassword } });
    if (!result.ok) { setError(result.data?.error ?? "Could not update the profile"); return; }
    setCurrentPassword("");
    setNewPassword("");
    await refreshUser();
    setStatus("Profile update success");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Your information</h1>
      <AccountNav />
      <form onSubmit={save} className="rounded bg-white p-5 text-sm">
        <div>
          <label htmlFor="info-email" className="block font-medium">Email</label>
          <input id="info-email" type="text" value={email} placeholder="Email" onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full max-w-md rounded border border-slate-300 px-3 py-2" />
        </div>
        <div className="mt-3">
          <label htmlFor="info-current-password" className="block font-medium">Current password</label>
          <input id="info-current-password" type="password" role="textbox" value={currentPassword} placeholder="Current password"
            onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full max-w-md rounded border border-slate-300 px-3 py-2" />
        </div>
        <div className="mt-3">
          <label htmlFor="info-new-password" className="block font-medium">New password</label>
          <input id="info-new-password" type="password" role="textbox" value={newPassword} placeholder="New password"
            onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full max-w-md rounded border border-slate-300 px-3 py-2" />
        </div>
        {error && <div role="alert" className="mt-3 rounded bg-red-100 px-3 py-2 text-red-700">{error}</div>}
        {status && <div role="status" aria-label="Profile update" className="mt-3 rounded bg-teal-50 px-3 py-2 text-teal-800">{status}</div>}
        <button type="submit" className="mt-4 rounded bg-teal-600 px-6 py-2 font-semibold text-white">Save</button>
      </form>
    </div>
  );
}

type Address = {
  id: number; alias: string; firstName: string; lastName: string; address: string; postalCode: string; city: string;
  country: string; phone: string;
};

const emptyAddress = {
  alias: "", firstName: "", lastName: "", address: "", postalCode: "", city: "Shanghai", country: "China", phone: "",
};

export function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyAddress);
  const [notice, setNotice] = useState("");

  const load = async () => {
    const result = await api<{ addresses: Address[] }>("/api/addresses");
    if (result.ok) setAddresses(result.data.addresses);
  };
  useEffect(() => { void load(); }, []);

  const create = () => { setEditId(null); setForm(emptyAddress); setFormOpen(true); };
  const edit = (address: Address) => {
    setEditId(address.id);
    setForm({
      alias: address.alias, firstName: address.firstName, lastName: address.lastName, address: address.address,
      postalCode: address.postalCode, city: address.city, country: address.country, phone: address.phone,
    });
    setFormOpen(true);
  };
  const save = async () => {
    const body = { ...form };
    const result = editId
      ? await api(`/api/addresses/${editId}`, { method: "PUT", body })
      : await api("/api/addresses", { body });
    if (!result.ok) { setNotice(result.data?.error ?? "Could not save the address"); return; }
    setNotice("");
    setFormOpen(false);
    setEditId(null);
    await load();
  };
  const removeAddress = async (address: Address) => {
    await api(`/api/addresses/${address.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Your addresses</h1>
      <AccountNav />
      <div className="rounded bg-white p-5">
        <button type="button" className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white" onClick={create}>Create new address</button>
        {notice && <div role="alert" className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{notice}</div>}
        {addresses.length === 0 && <p className="mt-3 text-sm text-slate-600">You have no saved addresses.</p>}
        <div className="mt-4 space-y-4">
          {addresses.map((address) => (
            <article key={address.id} role="article" aria-label={address.alias} className="rounded border border-slate-200 p-4 text-sm">
              <h2 className="text-lg font-semibold">{address.alias}</h2>
              <p>{address.firstName} {address.lastName}</p>
              <p>{address.address}</p>
              <p>{address.postalCode} {address.city}</p>
              <p>{address.country}</p>
              <p>{address.phone}</p>
              <div className="mt-3 flex gap-3">
                <button type="button" className="rounded border border-slate-300 px-3 py-1 font-medium" onClick={() => edit(address)}>Update</button>
                <button type="button" className="rounded border border-red-300 px-3 py-1 font-medium text-red-700" onClick={() => void removeAddress(address)}>Delete</button>
              </div>
            </article>
          ))}
        </div>

        {formOpen && (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <AddressField id="address-alias" label="Alias" value={form.alias} onChange={(value) => setForm({ ...form, alias: value })} />
              <AddressField id="address-first-name" label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
              <AddressField id="address-last-name" label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
              <AddressField id="address-address" label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
              <AddressField id="address-postal-code" label="Postal code" value={form.postalCode} onChange={(value) => setForm({ ...form, postalCode: value })} />
              <AddressField id="address-city" label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
              <div>
                <label htmlFor="address-country" className="block font-medium">Country</label>
                <Select id="address-country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1">
                  <option>China</option>
                </Select>
              </div>
              <AddressField id="address-phone" label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            </div>
            <div className="mt-3 flex gap-3">
              <button type="button" className="rounded bg-teal-600 px-4 py-2 font-semibold text-white" onClick={save}>Save</button>
              <button type="button" className="rounded border border-slate-300 px-4 py-2" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function AddressField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} type="text" value={value} placeholder={label} onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
    </div>
  );
}

type Order = {
  reference: string; date: string; status: string; total: number; payment: string; shippingMethod: string; addressAlias: string; address: string;
  items: Array<{ id: number; name: string; quantity: number; unitPrice: number; subtotal: number }>;
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { refreshCart } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const result = await api<{ orders: Order[] }>("/api/orders");
      if (result.ok) setOrders(result.data.orders);
    })();
  }, []);

  const reorder = async (reference: string) => {
    await api(`/api/orders/${encodeURIComponent(reference)}/reorder`, { method: "POST" });
    await refreshCart();
    navigate("/cart");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Order history</h1>
      <AccountNav />
      <section aria-label="Order history" className="rounded bg-white p-5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="p-2">Order reference</th>
              <th className="p-2">Date</th>
              <th className="p-2">Total</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.reference} aria-label={order.reference} className="border-b border-slate-100 align-top">
                <td className="p-2 font-medium">{order.reference}</td>
                <td className="p-2">{order.date}</td>
                <td className="p-2"><div role="region" aria-label="Total" className="font-semibold">{money(order.total)}</div></td>
                <td className="p-2">{order.status}</td>
                <td className="p-2">
                  <div className="space-y-1">
                    {order.items.map((item) => <p key={item.id}>{item.name}</p>)}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/account/orders/${order.reference}`} className="text-teal-700 underline">Details</Link>
                      <a href="/cart" className="text-teal-700 underline" onClick={(event) => { event.preventDefault(); void reorder(order.reference); }}>Reorder</a>
                      <a href={`/api/orders/${encodeURIComponent(order.reference)}/invoice`} className="text-teal-700 underline">PDF</a>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="mt-3 text-sm text-slate-600">You have no orders.</p>}
      </section>
    </div>
  );
}

export function OrderDetailPage() {
  const { reference = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    void (async () => {
      const result = await api<{ order: Order }>(`/api/orders/${encodeURIComponent(reference)}`);
      if (result.ok) setOrder(result.data.order);
    })();
  }, [reference]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Order details</h1>
      <AccountNav />
      {order && (
        <section aria-label="Order details" className="rounded bg-white p-5 text-sm">
          <p className="text-lg font-semibold">{order.reference}</p>
          <p className="mt-1">{order.date} · {order.status}</p>
          <ul className="mt-3 space-y-2">
            {order.items.map((item) => (
              <li key={item.id}>
                <section role="region" aria-label={`Product ${item.name}`}>
                  <p className="font-medium">{item.name}</p>
                  <p>Quantity: <span>{item.quantity}</span></p>
                  <div role="region" aria-label="Unit price" className="font-medium">{money(item.unitPrice)}</div>
                </section>
              </li>
            ))}
          </ul>
          <p className="mt-3">Shipping method <span>{order.shippingMethod}</span></p>
          <p>Payment <span>{order.payment}</span></p>
          {order.addressAlias && <p>Address alias <span>{order.addressAlias}</span></p>}
          <p>Shipping address <span>{order.address}</span></p>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-semibold">Total</span>
            <div role="region" aria-label="Total" className="font-semibold">{money(order.total)}</div>
          </div>
        </section>
      )}
    </div>
  );
}

type Wishlist = { id: number; name: string; count: number };

export function WishlistsPage() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Wishlist | null>(null);
  const [name, setName] = useState("");


  const load = async () => {
    const result = await api<{ wishlists: Wishlist[] }>("/api/wishlists");
    if (result.ok) setWishlists(result.data.wishlists);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    await api("/api/wishlists", { body: { name } });
    setName("");
    setCreateOpen(false);
    await load();
  };
  const rename = async () => {
    if (!editTarget) return;
    await api(`/api/wishlists/${editTarget.id}`, { method: "PUT", body: { name } });
    setEditTarget(null);
    setName("");
    await load();
  };
  const remove = async (wishlist: Wishlist) => {
    await api(`/api/wishlists/${wishlist.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">My wishlists</h1>
      <AccountNav />
      <div className="rounded bg-white p-5">
        <button type="button" className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => { setName(""); setCreateOpen(true); }}>Create new wishlist</button>
        <ul className="mt-4 space-y-3">
          {wishlists.map((wishlist) => (
            <li key={wishlist.id} role="listitem" aria-label={wishlist.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-4">
              <Link to={`/account/wishlists/${wishlist.id}`} className="text-lg font-medium text-teal-700 underline">{wishlist.name}</Link>
              <div className="flex gap-3 text-sm">
                <button type="button" className="rounded border border-slate-300 px-3 py-1"
                  onClick={() => { setEditTarget(wishlist); setName(wishlist.name); }}>Edit</button>
                <button type="button" className="rounded border border-red-300 px-3 py-1 text-red-700"
                  onClick={() => void remove(wishlist)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
        {wishlists.length === 0 && <p className="mt-3 text-sm text-slate-600">You have no wishlists.</p>}
      </div>

      {createOpen && (
        <div role="dialog" aria-label="Create new wishlist" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded bg-white p-5 text-sm">
            <label htmlFor="wishlist-name" className="block font-medium">Name</label>
            <input id="wishlist-name" type="text" value={name} placeholder="Name" onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            <div className="mt-4 flex gap-3">
              <button type="button" className="rounded bg-teal-600 px-4 py-2 font-semibold text-white" onClick={() => void create()}>Save</button>
              <button type="button" className="rounded border border-slate-300 px-4 py-2" onClick={() => setCreateOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div role="dialog" aria-label="Edit wishlist" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded bg-white p-5 text-sm">
            <label htmlFor="wishlist-edit-name" className="block font-medium">Name</label>
            <input id="wishlist-edit-name" type="text" value={name} placeholder="Name" onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            <div className="mt-4 flex gap-3">
              <button type="button" className="rounded bg-teal-600 px-4 py-2 font-semibold text-white" onClick={() => void rename()}>Save</button>
              <button type="button" className="rounded border border-slate-300 px-4 py-2" onClick={() => setEditTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export function WishlistPage() {
  const { id = "" } = useParams();
  const [wishlist, setWishlist] = useState<{ id: number; name: string; items: any[] } | null>(null);
  const { refreshCart } = useStore();

  const load = async () => {
    const result = await api<{ wishlist: { id: number; name: string; items: any[] } }>(`/api/wishlists/${id}`);
    if (result.ok) setWishlist(result.data.wishlist);
  };
  useEffect(() => { void load(); }, [id]);

  const remove = async (productId: number) => {
    await api(`/api/wishlists/${id}/items/${productId}`, { method: "DELETE" });
    await load();
  };
  const addToCart = async (product: any) => {
    const variant = product.variants[0];
    await api("/api/cart/add", { body: { productId: product.id, size: variant?.size ?? product.size, color: variant?.color ?? product.color, quantity: 1 } });
    await refreshCart();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">{wishlist?.name ?? "Wishlist"}</h1>
      <AccountNav />
      <div className="rounded bg-white p-5">
        {wishlist && wishlist.items.length === 0 && <p className="text-sm text-slate-600">This wishlist is empty.</p>}
        <ul className="space-y-3">
          {wishlist?.items.map((product) => (
            <li key={product.id} role="listitem" aria-label={product.name} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-4">
              <div role="region" aria-label={`Product ${product.name}`}>
                <Link to={`/product/${product.id}`} className="font-medium text-teal-700 underline">{product.name}</Link>
                <div role="region" aria-label="Sale price" className="mt-1 font-semibold">{money(product.price)}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" className="rounded border border-slate-300 px-3 py-1" onClick={() => void remove(product.id)}>Remove</button>
                <button type="button" className="rounded bg-teal-600 px-3 py-1 font-semibold text-white" onClick={() => void addToCart(product)}>Add to cart</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
