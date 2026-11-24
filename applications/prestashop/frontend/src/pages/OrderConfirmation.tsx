import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../kernel/api";
import { money } from "../foundation/StoreContext";

type Order = {
  reference: string; date: string; status: string; itemsTotal: number; discount: number; shipping: number; total: number;
  payment: string; shippingMethod: string; addressAlias: string; address: string;
  items: Array<{ id: number; name: string; quantity: number; unitPrice: number; subtotal: number; size: string; color: string }>;
};

export function OrderConfirmationPage() {
  const { reference = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await api<{ order: Order }>(`/api/orders/${encodeURIComponent(reference)}`);
      if (result.ok) setOrder(result.data.order);
      else setError("Order not found");
    })();
  }, [reference]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Order confirmation</h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {order && (
        <div className="mt-5 space-y-4">
          <section className="rounded bg-white p-4">
            <span className="text-sm font-medium">Order reference </span>
            <div role="region" aria-label="Order reference" className="mt-1 text-xl font-semibold">{order.reference}</div>
          </section>
          <section aria-label="Order details" className="rounded bg-white p-4 text-sm">
            <h2 className="text-xl font-semibold">Order details</h2>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="border-b border-slate-100 pb-2">
                  <section role="region" aria-label={`Product ${item.name}`}>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-slate-600">Size: {item.size} Color: {item.color}</p>
                    <p>Quantity: <span>{item.quantity}</span></p>
                    <div role="region" aria-label="Unit price" className="font-medium">{money(item.unitPrice)}</div>
                    <div role="region" aria-label="Subtotal" className="font-medium">{money(item.subtotal)}</div>
                  </section>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between">
              <span>Items subtotal</span>
              <div role="region" aria-label="Items subtotal" className="font-semibold">{money(order.itemsTotal)}</div>
            </div>
            {order.discount > 0 && (
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <div role="region" aria-label="Discount" className="font-semibold">{money(order.discount)}</div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <div role="region" aria-label="Shipping cost" className="font-semibold">{money(order.shipping)}</div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold">Total</span>
              <div role="region" aria-label="Total" className="text-lg font-semibold">{money(order.total)}</div>
            </div>
            <p className="mt-3">Shipping method <span>{order.shippingMethod}</span></p>
            <p>Payment <span>{order.payment}</span></p>
            {order.addressAlias && <p>Address alias <span>{order.addressAlias}</span></p>}
            <p>Shipping address <span>{order.address}</span></p>
            <p>Status <span>{order.status}</span></p>
          </section>
          <Link to="/" className="inline-block rounded bg-teal-600 px-5 py-2 font-semibold text-white">Continue shopping</Link>
        </div>
      )}
    </div>
  );
}
