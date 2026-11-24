import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../kernel/api";
import { Select } from "../kernel/Select";
import { money, useStore } from "../foundation/StoreContext";

export function ProductPage() {
  const { id } = useParams();
  const { products, catalogLoaded, refreshCart, recentIds, addRecent, user } = useStore();
  const product = products.find((item) => item.id === Number(id));

  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [mainIdentity, setMainIdentity] = useState("Front");
  const [zoom, setZoom] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState<"review" | "wishlist" | null>(null);
  const [tab, setTab] = useState("Description");

  useEffect(() => {
    if (!product) return;
    const base = product.variants.find((variant) => variant.size === product.size && variant.color === product.color)
      ?? product.variants[0];
    setSize(base?.size ?? product.size);
    setColor(base?.color ?? product.color);
    setQuantity(1);
    setError("");
    setAdded(false);
    setMainIdentity("Front");
    setZoom(false);
    setTab("Description");
    addRecent(product.id);
  }, [product?.id, addRecent]);

  const sizes = useMemo(() => unique(product?.variants.map((variant) => variant.size) ?? []), [product]);
  const colors = useMemo(() => unique(product?.variants.map((variant) => variant.color) ?? []), [product]);
  const variant = product?.variants.find((item) => item.size === size && item.color === color) ?? product?.variants[0];

  const chooseSize = (nextSize: string) => {
    if (!product) return;
    const match = product.variants.find((item) => item.size === nextSize && item.color === color)
      ?? product.variants.find((item) => item.size === nextSize);
    setSize(nextSize);
    if (match) setColor(match.color);
    setError("");
  };
  const chooseColor = (nextColor: string) => {
    if (!product) return;
    const match = product.variants.find((item) => item.color === nextColor && item.size === size)
      ?? product.variants.find((item) => item.color === nextColor);
    setColor(nextColor);
    if (match) setSize(match.size);
    setError("");
  };

  useEffect(() => {
    setError("");
  }, [size, color]);

  if (!catalogLoaded) return <div className="mx-auto max-w-6xl px-4 py-10">Loading…</div>;
  if (!product) return <div className="mx-auto max-w-6xl px-4 py-10"><h1>Product not found</h1></div>;

  const images = product.images.length
    ? product.images
    : [{ id: 0, identity: "Front", description: `Front view of ${product.name}`, src: product.image }];
  const main = images.find((image) => image.identity === mainIdentity) ?? images[0];
  const price = variant?.price ?? product.price;
  const regularPrice = variant?.regularPrice ?? product.regularPrice;
  const stock = variant?.stock ?? product.stock;
  const discount = regularPrice && regularPrice > price ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const recent = recentIds.map((recentId) => products.find((item) => item.id === recentId)).filter(Boolean);

  const addToCart = async () => {
    setError("");
    if (!variant) return;
    if (quantity < 1) { setError("Please enter a quantity of at least 1"); return; }
    if (quantity > stock) { setError("Insufficient stock for the selected quantity"); return; }
    const result = await api("/api/cart/add", { body: { productId: product.id, size: variant.size, color: variant.color, quantity } });
    if (!result.ok) { setError(result.data?.error ?? "Insufficient stock"); return; }
    await refreshCart();
    setAdded(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section role="region" aria-label={`Product ${product.name}`}>
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <section aria-label="Product images" className="rounded bg-white p-4">
          <img src={main.src} alt={product.name} className="mx-auto h-80 object-contain" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {images.map((image) => (
              <button key={image.identity} type="button" onClick={() => setMainIdentity(image.identity)}
                className={`rounded border px-3 py-1 text-sm ${mainIdentity === image.identity ? "border-teal-500" : "border-slate-300"}`}>
                {image.identity}
              </button>
            ))}
            <button type="button" className="ml-auto rounded bg-slate-800 px-3 py-1 text-sm text-white" onClick={() => setZoom(true)}>Zoom</button>
          </div>
        </section>

        <section aria-label="Product information" className="rounded bg-white p-4">
          <p className="text-lg font-medium">{product.name}</p>
          <div className="mt-3 flex items-center gap-3">
            <div role="region" aria-label="Sale price" className="text-2xl font-semibold text-teal-700">{money(price)}</div>
            {regularPrice && regularPrice > price && (
              <div role="region" aria-label="Regular price" className="text-slate-500 line-through">{money(regularPrice)}</div>
            )}
          </div>
          {discount > 0 && <p className="mt-2 text-sm text-orange-600">{discount}% discount</p>}
          <div className="mt-2 text-sm text-slate-600">
            <p>Tax included</p>
            <p>Tax excluded: <span>{money(price / (1 + product.taxRate))}</span></p>
          </div>
          <p className="mt-3 text-sm text-slate-700">{product.description}</p>
          <div role="status" aria-label="Stock" className="mt-3 text-sm font-medium">Available stock: <span>{stock}</span></div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="size" className="block text-sm font-medium">Size</label>
              <Select id="size" value={size} onChange={(event) => chooseSize(event.target.value)} className="mt-1 rounded border border-slate-300 px-2 py-1">
                {sizes.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </div>
            <fieldset className="flex items-center gap-3" role="radiogroup" aria-label="Color">
              <legend className="text-sm font-medium">Color</legend>
              {colors.map((option) => (
                <label key={option} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="color" value={option} checked={color === option} onChange={() => chooseColor(option)} /> {option}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium">Quantity</label>
              <input id="quantity" type="number" min="1" value={quantity} aria-label="Quantity"
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                className="mt-1 w-20 rounded border border-slate-300 px-2 py-1" />
            </div>
            <button type="button" className="rounded border border-slate-300 px-3 py-1 text-lg" onClick={() => setQuantity((value) => value + 1)}>Increase quantity</button>
            <button type="button" className="rounded border border-slate-300 px-3 py-1 text-lg" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>Decrease quantity</button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" className="rounded bg-teal-600 px-5 py-2 font-semibold text-white" onClick={addToCart}>Add to cart</button>
            <Link to={`/product/${product.id}`} className="text-sm font-medium text-teal-700 underline"
              onClick={(event) => { if (!user) { event.preventDefault(); setSignInPrompt("wishlist"); } }}>Wishlist</Link>
          </div>
          {error && <div role="alert" className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
        </section>
      </div>

      <section className="mt-6 rounded bg-white p-4">
        <div role="tablist" className="flex gap-4 border-b border-slate-200">
          {["Description", "Product Details"].map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
              className={`px-2 py-2 text-sm font-medium ${tab === name ? "border-b-2 border-teal-500 text-teal-700" : "text-slate-600"}`}>
              {name}
            </button>
          ))}
        </div>
        {tab === "Description" ? (
          <div role="tabpanel" aria-label="Description" className="pt-4 text-sm text-slate-700">
            <p>{product.description}</p>
            <p className="mt-2">Regular fit.</p>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Product Details" className="pt-4 text-sm text-slate-700">
            <p>Reference <span>{product.reference}</span></p>
            <h3 className="mt-3 font-semibold">Data sheet</h3>
            <dl className="mt-1">
              <div className="flex gap-2"><dt>Composition</dt><dd>{product.composition}</dd></div>
            </dl>
            <p className="mt-1">Made of {product.composition.toLowerCase()}.</p>
            <h3 className="mt-3 font-semibold">Features</h3>
            <p>{product.features}</p>
          </div>
        )}
      </section>
      </section>

      <section aria-label="Reviews" className="mt-6 rounded bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reviews</h2>
          <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm"
            onClick={() => setSignInPrompt("review")}>Write your review</button>
        </div>
        <p className="mt-3 text-sm">Average rating: <span>{product.averageRating}</span></p>
        {product.reviews.length === 0 && <p className="mt-2 text-sm text-slate-600">No customer reviews for the moment.</p>}
        <ul className="mt-3 space-y-2">
          {product.reviews.map((review) => (
            <li key={review.id} className="rounded border border-slate-200 p-2 text-sm">
              <p className="font-medium">{review.text}</p>
              <p className="text-slate-500">{review.author} · {review.rating}/5</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Recently viewed" className="mt-6 rounded bg-white p-4">
        <h2 className="text-xl font-semibold">Recently viewed</h2>
        <ul className="mt-2 flex flex-wrap gap-4">
          {recent.map((item) => (
            <li key={item!.id}><Link to={`/product/${item!.id}`} className="text-sm text-teal-700 underline">{item!.name}</Link></li>
          ))}
        </ul>
      </section>

      <section aria-label="Related products" className="mt-6 rounded bg-white p-4">
        <h2 className="text-xl font-semibold">Related products</h2>
        <ul className="mt-2 flex flex-wrap gap-4">
          {related.map((item) => (
            <li key={item.id}><Link to={`/product/${item.id}`} className="text-sm text-teal-700 underline">{item.name}</Link></li>
          ))}
        </ul>
      </section>

      {zoom && (
        <div role="dialog" aria-label="Product image" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-w-2xl rounded bg-white p-5">
            <img src={main.src} alt="Product image" className="max-h-[70vh] object-contain" />
            <p className="mt-2 text-center text-sm">{main.identity} view</p>
            <button type="button" className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm text-white" onClick={() => setZoom(false)}>Close</button>
          </div>
        </div>
      )}

      {signInPrompt && (
        <div role="dialog" aria-label="Sign in required" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded bg-white p-5">
            <h2 className="text-lg font-semibold">Sign in required</h2>
            <p className="mt-2 text-sm font-medium">{product.name}</p>
            <p className="mt-1 text-sm">
              Sign in to {signInPrompt === "review" ? "write a review for this product." : "add this product to your wishlist."}
            </p>
            <Link to="/login" className="mt-3 inline-block text-sm font-medium text-teal-700 underline">Sign in</Link>
            <button type="button" className="ml-4 mt-3 rounded bg-slate-800 px-4 py-2 text-sm text-white" onClick={() => setSignInPrompt(null)}>Close</button>
          </div>
        </div>
      )}

      {added && (
        <div role="dialog" aria-label="Product successfully added to your shopping cart" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded bg-white p-5">
            <h2 className="text-lg font-semibold">Product successfully added to your shopping cart</h2>
            <p className="mt-2 text-sm font-medium">{product.name}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link to={`/product/${product.id}`} className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setAdded(false)}>Continue shopping</Link>
              <Link to="/cart" className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setAdded(false)}>Proceed to checkout</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
