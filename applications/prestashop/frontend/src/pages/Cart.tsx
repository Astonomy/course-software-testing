import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../kernel/api";
import { money, useStore } from "../foundation/StoreContext";

export function CartPage() {
  const { cart, cartLoaded, refreshCart, catalogLoaded } = useStore();
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const visibleItems = cart.items.filter((item) => !hiddenIds.includes(item.id));

  const update = async (id: number, quantity: number) => {
    await api(`/api/cart/items/${id}`, { method: "PATCH", body: { quantity } });
    await refreshCart();
  };
  const remove = async (id: number) => {
    setHiddenIds((current) => [...current, id]);
    await api(`/api/cart/items/${id}`, { method: "DELETE" });
    await refreshCart();
    setHiddenIds((current) => current.filter((value) => value !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Shopping cart</h1>
      {catalogLoaded && cartLoaded && (
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_300px]">
          <div>
            {visibleItems.length === 0 ? (
              <p className="rounded bg-white p-6 text-sm text-slate-600">Your shopping cart is empty.</p>
            ) : (
              <table className="w-full rounded bg-white text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="p-3">Product</th>
                    <th className="p-3">Unit price</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id} aria-label={item.name} className="border-b border-slate-100 align-top">
                      <td className="p-3">
                        <div role="region" aria-label={`Product ${item.name}`} className="flex gap-3">
                          <img src={item.image} alt={item.name} className="h-20 w-20 object-contain" />
                          <div>
                            <Link to={`/product/${item.productId}`} className="font-medium text-slate-800">{item.name}</Link>
                            <div className="mt-1 text-slate-600">Size: {item.size}</div>
                            <div className="text-slate-600">Color: {item.color}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div role="region" aria-label="Unit price" className="font-medium">{money(item.unitPrice)}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <input type="number" min="1" aria-label="Quantity" value={item.quantity}
                            onChange={(event) => void update(item.id, Number(event.target.value) || 1)}
                            className="w-16 rounded border border-slate-300 px-2 py-1" />
                          <div className="flex flex-col">
                            <button type="button" className="rounded border border-slate-300 px-2 text-xs"
                              onClick={() => void update(item.id, item.quantity + 1)}>Increase quantity</button>
                            <button type="button" className="rounded border border-slate-300 px-2 text-xs"
                              onClick={() => void update(item.id, Math.max(1, item.quantity - 1))}>Decrease quantity</button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div role="region" aria-label="Subtotal" className="font-medium">{money(item.subtotal)}</div>
                      </td>
                      <td className="p-3">
                        <button type="button" className="text-sm font-medium text-red-600" onClick={() => void remove(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex flex-wrap gap-6">
              <Link to="/category/men" className="text-sm font-medium text-teal-700 underline">Continue shopping</Link>
              <Link to="/checkout" className="text-sm font-medium text-teal-700 underline">Proceed to checkout</Link>
            </div>
          </div>

          <section aria-label="Cart summary" className="h-fit rounded bg-white p-4 text-sm">
            <div className="flex items-center justify-between py-1">
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
              <span>Shipping</span>
              <div role="region" aria-label="Shipping" className="font-semibold">{money(cart.shipping)}</div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold">Total</span>
              <div role="region" aria-label="Total" className="text-lg font-semibold">{money(cart.total)}</div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Total including tax</p>
          </section>
        </div>
      )}
    </div>
  );
}
