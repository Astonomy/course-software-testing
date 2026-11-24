import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../kernel/api";
import { Select } from "../kernel/Select";
import { money, useStore } from "../foundation/StoreContext";

type Address = {
  id: number;
  alias: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
};

const emptyForm = {
  alias: "", firstName: "", lastName: "", address: "", postalCode: "", city: "Shanghai", country: "China", phone: "",
};

export function CheckoutPage() {
  const { user, cart, cartLoaded, refreshCart } = useStore();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [sameAddress, setSameAddress] = useState(true);
  const [shipping, setShipping] = useState("Delivery");
  const [payment, setPayment] = useState("Bank wire");
  const [terms, setTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [placing, setPlacing] = useState(false);

  const loadAddresses = async () => {
    if (!user) return;
    const result = await api<{ addresses: Address[] }>("/api/addresses");
    if (result.ok) {
      setAddresses(result.data.addresses);
      setAddressId((current) => current ?? result.data.addresses[0]?.id ?? null);
      setInvoiceId((current) => current ?? result.data.addresses[0]?.id ?? null);
    }
  };

  useEffect(() => { void loadAddresses(); }, [user?.id]);

  const personalExpanded = editingStep === 1 || (editingStep === null && currentStep === 1);
  const addressesExpanded = editingStep === 2 || (editingStep === null && currentStep === 2);
  const shippingExpanded = editingStep === 3 || (editingStep === null && currentStep === 3);
  const paymentExpanded = editingStep === null && currentStep === 4;
  const selectedAddress = addresses.find((address) => address.id === addressId);

  const continuePersonal = () => {
    setCurrentStep((step) => Math.max(step, 2));
    setEditingStep(null);
  };
  const continueAddresses = () => {
    if (!addressId) { setNotice("Please select a shipping address"); return; }
    setNotice("");
    setCurrentStep((step) => Math.max(step, 3));
    setEditingStep(null);
  };
  const continueShipping = () => {
    setCurrentStep((step) => Math.max(step, 4));
    setEditingStep(null);
  };

  const openNewAddress = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };
  const openEditAddress = (address: Address) => {
    setEditId(address.id);
    setForm({
      alias: address.alias, firstName: address.firstName, lastName: address.lastName, address: address.address,
      postalCode: address.postalCode, city: address.city, country: address.country, phone: address.phone,
    });
    setFormOpen(true);
  };
  const saveAddress = async () => {
    const body = {
      alias: form.alias, firstName: form.firstName, lastName: form.lastName, address: form.address,
      postalCode: form.postalCode, city: form.city, country: form.country, phone: form.phone,
    };
    const result = editId
      ? await api(`/api/addresses/${editId}`, { method: "PUT", body })
      : await api("/api/addresses", { body });
    if (!result.ok) { setNotice(result.data?.error ?? "Could not save the address"); return; }
    setFormOpen(false);
    setEditId(null);
    await loadAddresses();
    setAddressId(result.data.address.id);
    setInvoiceId(result.data.address.id);
  };

  const placeOrder = async () => {
    setNotice("");
    if (!terms) { setNotice("You must agree to the Terms and conditions"); return; }
    if (!addressId) { setNotice("Please select a shipping address"); return; }
    setPlacing(true);
    const result = await api<{ order: { reference: string } }>("/api/orders", {
      body: { addressId, invoiceAddressId: sameAddress ? addressId : invoiceId, shippingMethod: shipping, payment, terms: true },
    });
    setPlacing(false);
    if (!result.ok) { setNotice(result.data?.error ?? "Could not place the order"); return; }
    await refreshCart();
    navigate(`/order-confirmation/${result.data.order.reference}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section aria-label="Personal Information" className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-medium">1. Personal Information</h2>
            {personalExpanded ? (
              <div className="mt-3 text-sm">
                {user ? (
                  <p className="font-medium">{user.email}</p>
                ) : (
                  <div className="space-y-2">
                    <p>Order as a guest</p>
                    <p className="text-slate-600">You can sign in or create an account to save your details.</p>
                  </div>
                )}
                <button type="button" className="mt-4 rounded bg-teal-600 px-5 py-2 font-semibold text-white" onClick={continuePersonal}>Continue</button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>{user?.email ?? "Guest checkout"}</span>
                <button type="button" className="text-teal-700 underline" onClick={() => setEditingStep(1)}>Edit Personal Information</button>
              </div>
            )}
          </section>

          {currentStep >= 2 && (
          <section aria-label="Addresses" className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-medium">2. Addresses</h2>
            {addressesExpanded ? (
              <div className="mt-3 space-y-3 text-sm">
                {addresses.length === 0 && <p className="text-slate-600">You have no saved addresses.</p>}
                {addresses.map((address) => (
                  <div key={address.id} className="rounded border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <input type="radio" id={`shipping-address-${address.id}`} name="shipping-address"
                        aria-label={sameAddress ? undefined : `${address.alias} shipping address`}
                        checked={addressId === address.id} onChange={() => setAddressId(address.id)} />
                      <div className="flex-1">
                        <label htmlFor={`shipping-address-${address.id}`} className="font-medium">{address.alias}</label>
                        <p className="text-slate-600">{address.address}</p>
                        <p className="text-slate-600">{address.postalCode} {address.city}, {address.country}</p>
                        <p className="text-slate-600">{address.phone}</p>
                      </div>
                      <button type="button" className="text-teal-700 underline" onClick={() => openEditAddress(address)}>
                        Edit address {address.alias}
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="rounded border border-slate-300 px-4 py-2 font-medium" onClick={openNewAddress}>Add new address</button>

                {formOpen && (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field id="alias" label="Alias" value={form.alias} onChange={(value) => setForm({ ...form, alias: value })} />
                      <Field id="firstName" label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
                      <Field id="lastName" label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
                      <Field id="address" label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
                      <Field id="postalCode" label="Postal code" value={form.postalCode} onChange={(value) => setForm({ ...form, postalCode: value })} />
                      <Field id="city" label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
                      <div>
                        <label htmlFor="country" className="block font-medium">Country</label>
                        <Select id="country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1">
                          <option>China</option>
                        </Select>
                      </div>
                      <Field id="phone" label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                    </div>
                    <div className="mt-3 flex gap-3">
                      <button type="button" className="rounded bg-teal-600 px-4 py-2 font-semibold text-white" onClick={saveAddress}>Save</button>
                      <button type="button" className="rounded border border-slate-300 px-4 py-2" onClick={() => setFormOpen(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={sameAddress} onChange={(event) => setSameAddress(event.target.checked)} /> Use same address
                </label>
                {!sameAddress && (
                  <section aria-label="Invoice address" className="rounded border border-slate-200 p-3">
                    <h3 className="font-medium">Invoice address</h3>
                    {addresses.map((address) => (
                      <div key={address.id} className="mt-2 flex items-start gap-2">
                        <input type="radio" id={`invoice-address-${address.id}`} name="invoice-address"
                          checked={invoiceId === address.id} onChange={() => setInvoiceId(address.id)} />
                        <div>
                          <label htmlFor={`invoice-address-${address.id}`} className="font-medium">{address.alias}</label>
                          <p className="text-slate-600">{address.address}</p>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                <button type="button" className="rounded bg-teal-600 px-5 py-2 font-semibold text-white" onClick={continueAddresses}>Continue</button>
              </div>
            ) : (
              currentStep > 2 && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>{selectedAddress ? `${selectedAddress.alias} — ${selectedAddress.address}, ${selectedAddress.city} ${selectedAddress.postalCode}, ${selectedAddress.country}` : "Address selected"}</span>
                  <button type="button" className="text-teal-700 underline" onClick={() => setEditingStep(2)}>Edit Addresses</button>
                </div>
              )
            )}
          </section>
          )}

          {currentStep >= 3 && (
          <section aria-label="Shipping Method" className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-medium">3. Shipping Method</h2>
            {shippingExpanded ? (
              <div className="mt-3 text-sm">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="shipping" checked={shipping === "Delivery"} onChange={() => setShipping("Delivery")} /> Delivery
                  </label>
                  <span className="font-medium">{money(5)}</span>
                </div>
                <button type="button" className="mt-4 rounded bg-teal-600 px-5 py-2 font-semibold text-white" onClick={continueShipping}>Continue</button>
              </div>
            ) : (
              currentStep > 3 && (
                <div className="mt-2 text-sm">
                  <span>{shipping}</span>
                </div>
              )
            )}
          </section>
          )}

          {currentStep >= 4 && (
          <section aria-label="Payment" className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-medium">4. Payment</h2>
            {currentStep > 3 && editingStep === null && (
              <button type="button" className="mt-2 text-sm text-teal-700 underline" onClick={() => setEditingStep(3)}>Edit Shipping Method</button>
            )}
            {paymentExpanded && (
              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="payment" checked={payment === "Bank wire"} onChange={() => setPayment("Bank wire")} /> Bank wire
                </label>
                {!termsOpen && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /> Terms and conditions
                  </label>
                )}
                <div>
                  <a href="#terms" className="text-teal-700 underline"
                    onClick={(event) => { event.preventDefault(); setTermsOpen((value) => !value); }}>
                    {termsOpen ? "Hide terms and conditions" : "Terms and conditions"}
                  </a>
                </div>
                {termsOpen && terms && <p>Agreement accepted</p>}
                {termsOpen && (
                  <section aria-label="Terms and conditions" className="rounded border border-slate-200 bg-slate-50 p-3">
                    <h3 className="font-medium">Terms and conditions</h3>
                    <p>By placing this order you agree to our terms of sale, delivery and returns policy.</p>
                  </section>
                )}
                {notice && <div role="alert" className="rounded bg-red-100 px-3 py-2 text-red-700">{notice}</div>}
                <button type="button" className="rounded bg-teal-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
                  disabled={placing} onClick={() => void placeOrder()}>Place order</button>
              </div>
            )}
          </section>
          )}
        </div>

        <section aria-label="Order summary" className="h-fit rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-xl font-medium">Order summary</h2>
          <ul className="mt-3 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-2">
                <p className="font-medium">{item.name}</p>
                <p className="text-slate-600">Size: {item.size} Color: {item.color}</p>
                <p>Quantity: <span>{item.quantity}</span></p>
                <p className="font-medium">{money(item.subtotal)}</p>
              </li>
            ))}
          </ul>
          {cartLoaded && cart.items.length === 0 && <p className="mt-3 text-slate-600">Your cart is empty.</p>}
          <div className="mt-3 flex items-center justify-between py-1">
            <span>Items subtotal</span>
            <div role="region" aria-label="Items subtotal" className="font-semibold">{money(cart.subtotal)}</div>
          </div>
          {cart.discount > 0 && (
            <div className="flex items-center justify-between py-1">
              <span>Discount</span>
              <div role="region" aria-label="Discount" className="font-semibold">{money(cart.discount)}</div>
            </div>
          )}
          <div className="flex items-center justify-between py-1">
            <span>Shipping cost</span>
            <div role="region" aria-label="Shipping cost" className="font-semibold">{money(cart.shipping)}</div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold">Total</span>
            <div role="region" aria-label="Total" className="text-lg font-semibold">{money(cart.total)}</div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Total including tax</p>
        </section>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} type="text" value={value} placeholder={label} onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
    </div>
  );
}
