import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductCard } from "../foundation/ProductCard";
import { useStore, type Product } from "../foundation/StoreContext";
import { Select } from "../kernel/Select";

const CATEGORY_INFO: Record<string, string> = {
  CLOTHES: "CLOTHES: discover our favourite fashionable discoveries, a selection of cool items to integrate in your wardrobe.",
  Men: "Men: everyday clothing and accessories. Discover regular-fit t-shirts and useful everyday objects.",
  Women: "Women: a selection of everyday clothing and accessories.",
  ACCESSORIES: "ACCESSORIES: practical accessories for everyday use.",
  ART: "ART: framed prints and creative pieces for your home.",
};

const SLUGS: Record<string, string> = {
  clothes: "CLOTHES",
  men: "Men",
  women: "Women",
  accessories: "ACCESSORIES",
  art: "ART",
};

function Breadcrumb({ name, parent }: { name: string; parent?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link to="/" className="hover:text-teal-600">Home</Link></li>
        {parent && <li><Link to={`/category/${parent.toLowerCase()}`} className="hover:text-teal-600">{parent}</Link></li>}
        <li>{name}</li>
      </ol>
    </nav>
  );
}

function toggleValue(values: string[], value: string, checked: boolean): string[] {
  if (checked) return values.includes(value) ? values : [...values, value];
  return values.filter((item) => item !== value);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

type FiltersProps = {
  products: Product[];
  inStock: boolean; setInStock: (value: boolean) => void;
  onSale: boolean; setOnSale: (value: boolean) => void;
  categories: string[]; setCategories: (value: string[]) => void;
  sizes: string[]; setSizes: (value: string[]) => void;
  colors: string[]; setColors: (value: string[]) => void;
  compositions: string[]; setCompositions: (value: string[]) => void;
  brands: string[]; setBrands: (value: string[]) => void;
  minPrice: string; setMinPrice: (value: string) => void;
  clearAll: () => void;
};

function Filters({ products, inStock, setInStock, onSale, setOnSale, categories, setCategories, sizes, setSizes,
  colors, setColors, compositions, setCompositions, brands, setBrands, minPrice, setMinPrice, clearAll }: FiltersProps) {
  const sizeOptions = unique(products.flatMap((product) => product.variants.map((variant) => variant.size)));
  const colorOptions = unique(products.flatMap((product) => product.variants.map((variant) => variant.color)));
  const compositionOptions = unique(products.map((product) => product.composition));
  const brandOptions = unique(products.map((product) => product.brand));
  return (
    <section aria-label="Filters" className="rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button type="button" className="text-teal-600 underline" onClick={clearAll}>Clear all</button>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Availability</h3>
        <label className="mt-1 flex items-center gap-2">
          <input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> In stock
        </label>
        <label className="mt-1 flex items-center gap-2">
          <input type="checkbox" checked={onSale} onChange={(event) => setOnSale(event.target.checked)} /> On sale
        </label>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Categories</h3>
        {["Men", "Women"].map((option) => (
          <label key={option} className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={categories.includes(option)}
              onChange={(event) => setCategories(toggleValue(categories, option, event.target.checked))} /> {option}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Size</h3>
        {sizeOptions.map((option) => (
          <label key={option} className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={sizes.includes(option)}
              onChange={(event) => setSizes(toggleValue(sizes, option, event.target.checked))} /> {option}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Color</h3>
        {colorOptions.map((option) => (
          <label key={option} className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={colors.includes(option)}
              onChange={(event) => setColors(toggleValue(colors, option, event.target.checked))} /> {option}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Composition</h3>
        {compositionOptions.map((option) => (
          <label key={option} className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={compositions.includes(option)}
              onChange={(event) => setCompositions(toggleValue(compositions, option, event.target.checked))} /> {option}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Brand</h3>
        {brandOptions.map((option) => (
          <label key={option} className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={brands.includes(option)}
              onChange={(event) => setBrands(toggleValue(brands, option, event.target.checked))} /> {option}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Price</h3>
        <label htmlFor="minimum-price" className="mt-1 block">Minimum price</label>
        <input id="minimum-price" type="number" min="0" value={minPrice} placeholder="Minimum price"
          onChange={(event) => setMinPrice(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
      </div>
    </section>
  );
}

export function CategoryPage() {
  const { slug = "men" } = useParams();
  const name = SLUGS[slug] ?? "Men";
  const parent = name === "Men" || name === "Women" ? "CLOTHES" : undefined;
  const { products, catalogLoaded } = useStore();
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [compositions, setCompositions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [sort, setSort] = useState("Relevance");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const clearAll = () => {
    setInStock(false); setOnSale(false); setCategories([]); setSizes([]); setColors([]);
    setCompositions([]); setBrands([]); setMinPrice(""); setPage(1);
  };

  useEffect(() => {
    clearAll();
    setSort("Relevance");
    // Reset whenever the category changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => { setPage(1); }, [inStock, onSale, categories, sizes, colors, compositions, brands, minPrice, sort]);

  const categoryProducts = useMemo(() => products.filter((product) => product.category.toLowerCase() === name.toLowerCase()), [products, name]);

  const filtered = useMemo(() => {
    let result = [...categoryProducts];
    if (inStock) result = result.filter((product) => product.stock > 0 && product.purchasable);
    if (onSale) result = result.filter((product) => product.regularPrice !== null && product.regularPrice > product.price);
    if (categories.length) result = result.filter((product) => categories.includes(product.category));
    if (sizes.length) result = result.filter((product) => product.variants.some((variant) => sizes.includes(variant.size)));
    if (colors.length) result = result.filter((product) => product.variants.some((variant) => colors.includes(variant.color)));
    if (compositions.length) result = result.filter((product) => compositions.includes(product.composition));
    if (brands.length) result = result.filter((product) => brands.includes(product.brand));
    if (minPrice !== "" && !Number.isNaN(Number(minPrice))) result = result.filter((product) => product.price >= Number(minPrice));
    if (sort === "Price, low to high") result.sort((a, b) => a.price - b.price || a.id - b.id);
    else if (sort === "Price, high to low") result.sort((a, b) => b.price - a.price || a.id - b.id);
    return result;
  }, [categoryProducts, inStock, onSale, categories, sizes, colors, compositions, brands, minPrice, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (name === "CLOTHES") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Breadcrumb name="CLOTHES" />
        <h1 className="mt-3 text-3xl font-semibold">{name}</h1>
        <section aria-label="Category description" className="mt-3 max-w-3xl text-sm text-slate-600">{CATEGORY_INFO.CLOTHES}</section>
        <section aria-label="Subcategories" className="mt-6 rounded bg-white p-5">
          <h2 className="text-xl font-semibold">Subcategories</h2>
          <ul className="mt-3 flex gap-6">
            <li><Link to="/category/men" className="font-semibold text-teal-600">Men</Link></li>
            <li><Link to="/category/women" className="font-semibold text-teal-600">Women</Link></li>
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumb name={name} parent={parent} />
      <h1 className="mt-3 text-3xl font-semibold">{name}</h1>
      <section aria-label="Category description" className="mt-3 max-w-3xl text-sm text-slate-600">{CATEGORY_INFO[name]}</section>
      <div className="mt-6 grid gap-6 md:grid-cols-[250px_1fr]">
        {catalogLoaded && (
          <Filters products={categoryProducts} inStock={inStock} setInStock={setInStock} onSale={onSale} setOnSale={setOnSale}
            categories={categories} setCategories={setCategories} sizes={sizes} setSizes={setSizes} colors={colors}
            setColors={setColors} compositions={compositions} setCompositions={setCompositions} brands={brands}
            setBrands={setBrands} minPrice={minPrice} setMinPrice={setMinPrice} clearAll={clearAll} />
        )}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-white px-4 py-3">
            {catalogLoaded && (
              <div role="status" aria-label="Product count" className="text-sm text-slate-600">
                Showing {start}-{end} of {total} item(s)
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-sm">Sort by</label>
              <Select id="sort-by" value={sort} onChange={(event) => setSort(event.target.value)}
                className="rounded border border-slate-300 px-2 py-1 text-sm">
                <option>Relevance</option>
                <option>Price, low to high</option>
                <option>Price, high to low</option>
              </Select>
            </div>
          </div>
          {catalogLoaded && (
            <section aria-label="Product list" className="mt-4">
              {visible.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {visible.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : <p className="rounded bg-white p-6 text-sm text-slate-600">No products found.</p>}
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3">
                  <button type="button" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-40"
                    disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
                  <button type="button" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-40"
                    disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
                </nav>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { products, catalogLoaded } = useStore();
  const results = products.filter((product) => product.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Search results</h1>
      <p className="mt-2 text-sm text-slate-600">Results for {q}</p>
      {catalogLoaded && (
        <section aria-label="Product list" className="mt-6">
          {results.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {results.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : <p className="rounded bg-white p-6 text-sm text-slate-600">No products found.</p>}
        </section>
      )}
    </div>
  );
}
