import { useState } from "react";
import { Link } from "react-router-dom";
import { money, type Product } from "./StoreContext";

export function ProductCard({ product }: { product: Product }) {
  const [quickView, setQuickView] = useState(false);
  const discounted = product.regularPrice !== null && product.regularPrice > product.price;
  return (
    <section
      role={quickView ? undefined : "region"}
      aria-label={quickView ? undefined : `Product ${product.name}`}
      className="group relative rounded border border-slate-200 bg-white p-3"
    >
      <div className="relative">
        <img src={product.image} alt={product.name} className="mx-auto h-48 w-full object-contain" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discounted && <span className="rounded bg-orange-400 px-2 py-0.5 text-xs font-semibold text-white">Sale</span>}
        </div>
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button type="button" className="rounded bg-white/95 px-2 py-1 text-xs shadow" onClick={() => setQuickView(true)}>Quick view</button>
          <Link to={`/product/${product.id}`} className="rounded bg-white/95 px-2 py-1 text-xs shadow">Wishlist</Link>
          <button type="button" className="rounded bg-white/95 px-2 py-1 text-xs shadow">{product.color}</button>
        </div>
      </div>
      <div className="mt-3 text-center">
        <Link to={`/product/${product.id}`} className="text-sm font-medium text-slate-800 hover:text-teal-600">{product.name}</Link>
        <div className="mt-1 flex items-center justify-center gap-2">
          {discounted && <div role="region" aria-label="Regular price" className="text-xs text-slate-400 line-through">{money(product.regularPrice!)}</div>}
          <div role="region" aria-label="Sale price" className="text-sm font-semibold">{money(product.price)}</div>
        </div>
      </div>
      {quickView && (
        <div role="dialog" aria-label={`Quick view ${product.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-5 shadow-xl">
            <section role="region" aria-label={`Product ${product.name}`}>
              <img src={product.image} alt={`Quick view ${product.name}`} className="mx-auto h-52 object-contain" />
              <h2 className="mt-3 text-lg font-semibold">{product.name}</h2>
              <div className="mt-2 flex items-center gap-3">
                <div role="region" aria-label="Sale price" className="font-semibold">{money(product.price)}</div>
                {discounted && <div role="region" aria-label="Regular price" className="text-sm text-slate-500">{money(product.regularPrice!)}</div>}
              </div>
            </section>
            <button type="button" className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white" onClick={() => setQuickView(false)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
