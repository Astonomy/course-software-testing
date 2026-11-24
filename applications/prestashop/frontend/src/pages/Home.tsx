import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../foundation/ProductCard";
import { useStore } from "../foundation/StoreContext";

function promoImage(label: string, background: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><rect width="1200" height="420" fill="${background}"/><text x="60" y="170" font-family="Arial" font-size="64" fill="#ffffff">${label}</text><text x="60" y="240" font-family="Arial" font-size="28" fill="#ffffff">Shop the new collection</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SLIDES = [
  { name: "Summer sale", src: promoImage("Summer sale", "#4fb3a4") },
  { name: "Autumn picks", src: promoImage("Autumn picks", "#3b5f88") },
  { name: "Winter essentials", src: promoImage("Winter essentials", "#8a5a3b") },
];

function Carousel() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SLIDES.length), 3000);
    return () => window.clearInterval(timer);
  }, []);
  const slide = SLIDES[index];
  return (
    <section aria-label="Carousel" className="relative mx-auto max-w-6xl overflow-hidden rounded bg-white p-4">
      <img src={slide.src} alt={slide.name} className="h-56 w-full object-cover md:h-80" />
      <button
        type="button"
        className="absolute bottom-8 right-8 rounded bg-white px-4 py-2 text-sm font-semibold shadow"
        onClick={() => setIndex((value) => (value + 1) % SLIDES.length)}
      >
        Next
      </button>
      <Link to="/category/men" className="absolute bottom-8 left-8 rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Shop now</Link>
    </section>
  );
}

export function HomePage() {
  const { products, catalogLoaded } = useStore();
  return (
    <div className="py-6">
      <Carousel />
      {catalogLoaded && (
        <section aria-label="Popular Products" className="mx-auto mt-8 max-w-6xl px-4">
          <h2 className="mb-4 text-center text-lg font-semibold tracking-wide">Popular Products</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}
      <section aria-label="Promotions" className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded bg-white p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-700">20% OFF ON CLOTHES</h2>
          <Link to="/category/clothes" className="mt-3 inline-block text-sm font-semibold text-teal-600">See more</Link>
        </div>
      </section>
    </div>
  );
}
