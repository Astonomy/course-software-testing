import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../kernel/api";

export type Variant = { id: number; size: string; color: string; price: number; regularPrice: number | null; stock: number };
export type ProductImage = { id: number; identity: string; description: string; src: string };
export type Review = { id: number; author: string; rating: number; text: string };
export type Product = {
  id: number;
  name: string;
  categoryId: number;
  category: string;
  price: number;
  regularPrice: number | null;
  stock: number;
  size: string;
  color: string;
  composition: string;
  brand: string;
  purchasable: boolean;
  reference: string;
  description: string;
  features: string;
  taxRate: number;
  image: string;
  variants: Variant[];
  images: ProductImage[];
  reviews: Review[];
  averageRating: number;
};

export type User = { id: number; email: string; firstName: string; lastName: string; name: string; title: string; birthdate: string };
export type CartItem = {
  id: number; productId: number; name: string; image: string; size: string; color: string; quantity: number;
  unitPrice: number; regularPrice: number | null; subtotal: number; discount: number; stock: number;
};
export type Cart = { items: CartItem[]; count: number; subtotal: number; discount: number; shipping: number; total: number };

type StoreValue = {
  user: User | null;
  userLoaded: boolean;
  cart: Cart;
  cartLoaded: boolean;
  products: Product[];
  catalogLoaded: boolean;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  recentIds: number[];
  addRecent: (id: number) => void;
  language: string;
  setLanguage: (value: string) => void;
};

const emptyCart: Cart = { items: [], count: 0, subtotal: 0, discount: 0, shipping: 0, total: 0 };

const StoreContext = createContext<StoreValue | null>(null);

export function money(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [language, setLanguage] = useState("English");
  const [recentIds, setRecentIds] = useState<number[]>(() => {
    try {
      const value = sessionStorage.getItem("recent");
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  });

  const refreshUser = useCallback(async () => {
    const result = await api<{ user: User | null }>("/api/me");
    setUser(result.ok ? result.data.user : null);
    setUserLoaded(true);
  }, []);

  const refreshCart = useCallback(async () => {
    const result = await api<Cart>("/api/cart");
    if (result.ok) setCart(result.data);
    setCartLoaded(true);
  }, []);

  const refreshProducts = useCallback(async () => {
    const result = await api<{ products: Product[] }>("/api/products");
    if (result.ok) {
      setProducts(result.data.products);
      setCatalogLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    void refreshCart();
    void refreshProducts();
  }, [refreshUser, refreshCart, refreshProducts]);

  const addRecent = useCallback((id: number) => {
    setRecentIds((current) => {
      const next = [id, ...current.filter((value) => value !== id)].slice(0, 8);
      try { sessionStorage.setItem("recent", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(() => ({
    user, userLoaded, cart, cartLoaded, products, catalogLoaded, refreshUser, refreshCart, refreshProducts, recentIds, addRecent,
    language, setLanguage,
  }), [user, userLoaded, cart, cartLoaded, products, catalogLoaded, refreshUser, refreshCart, refreshProducts, recentIds, addRecent, language]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider missing");
  return value;
}
