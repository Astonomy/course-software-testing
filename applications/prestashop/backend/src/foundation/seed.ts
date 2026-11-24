import type { Db } from "../kernel/db";
import { hashPassword } from "../kernel/http";

type SeedProduct = {
  name: string;
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
  variants?: Array<{ size: string; color: string; price: number; regularPrice: number | null; stock: number }>;
  images?: Array<{ identity: string; description: string }>;
};

const MEN_DESCRIPTION = "Men: everyday clothing and accessories. Discover regular-fit t-shirts and useful everyday objects.";

const PRODUCTS: SeedProduct[] = [
  {
    name: "Hummingbird detail t-shirt",
    price: 24,
    regularPrice: 30,
    stock: 50,
    size: "M",
    color: "White",
    composition: "Cotton",
    brand: "Hummingbird",
    purchasable: true,
    reference: "HB-DETAIL",
    description: "A regular-fit t-shirt with a detailed Hummingbird print. Regular fit, soft cotton jersey, made for everyday wear.",
    features: "Regular fit",
    variants: [
      { size: "M", color: "White", price: 24, regularPrice: 30, stock: 50 },
      { size: "L", color: "Black", price: 36, regularPrice: 45, stock: 2 },
    ],
    images: [
      { identity: "Front", description: "Front view of Hummingbird detail t-shirt" },
      { identity: "Back", description: "Back view of Hummingbird detail t-shirt" },
    ],
  },
  { name: "Hummingbird cart t-shirt", price: 25, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-CART", description: "A regular-fit cart t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "Hummingbird checkout-step t-shirt", price: 26, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-CHECKOUT", description: "A regular-fit checkout-step t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "Hummingbird order-confirmation t-shirt", price: 27, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-CONFIRM", description: "A regular-fit order-confirmation t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "Hummingbird order-complete t-shirt", price: 28, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-COMPLETE", description: "A regular-fit order-complete t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "Hummingbird order-history t-shirt", price: 29, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-HISTORY", description: "A regular-fit order-history t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "Hummingbird wishlist t-shirt", price: 23, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Polyester", brand: "Hummingbird", purchasable: true, reference: "HB-WISHLIST", description: "A regular-fit wishlist t-shirt in soft polyester. Regular fit.", features: "Regular fit" },
  { name: "White t-shirt", price: 22, regularPrice: null, stock: 50, size: "M", color: "White", composition: "Cotton", brand: "Benchmark Basics", purchasable: true, reference: "BB-WHITE", description: "A regular-fit white t-shirt in cotton. Regular fit.", features: "Regular fit" },
  { name: "Black mug", price: 12, regularPrice: null, stock: 0, size: "One size", color: "Black", composition: "Ceramic", brand: "Benchmark Basics", purchasable: false, reference: "BB-MUG", description: "A black ceramic mug for everyday use.", features: "Ceramic mug" },
  { name: "Catalog item 1", price: 11, regularPrice: null, stock: 50, size: "One size", color: "Black", composition: "Ceramic", brand: "Benchmark Basics", purchasable: true, reference: "BB-C1", description: "A representative catalog item in ceramic.", features: "Ceramic" },
  { name: "Catalog item 2", price: 12, regularPrice: null, stock: 50, size: "One size", color: "Black", composition: "Ceramic", brand: "Benchmark Basics", purchasable: true, reference: "BB-C2", description: "A representative catalog item in ceramic.", features: "Ceramic" },
  { name: "Catalog item 3", price: 13, regularPrice: null, stock: 50, size: "One size", color: "Black", composition: "Ceramic", brand: "Benchmark Basics", purchasable: true, reference: "BB-C3", description: "A representative catalog item in ceramic.", features: "Ceramic" },
  { name: "Catalog item 4", price: 14, regularPrice: null, stock: 50, size: "One size", color: "Black", composition: "Ceramic", brand: "Benchmark Basics", purchasable: true, reference: "BB-C4", description: "A representative catalog item in ceramic.", features: "Ceramic" },
];

const ACCOUNTS = [
  "prestashop_checkout_user@example.com",
  "prestashop_checkout_address_user@example.com",
  "prestashop_checkout_new_address_user@example.com",
  "prestashop_checkout_invoice_user@example.com",
  "prestashop_checkout_6_6_user@example.com",
  "prestashop_checkout_6_7_user@example.com",
  "prestashop_user@example.com",
  "prestashop_profile_user@example.com",
  "prestashop_address_view_user@example.com",
  "prestashop_address_create_user@example.com",
  "prestashop_address_edit_user@example.com",
  "prestashop_address_delete_user@example.com",
  "prestashop_order_history_user@example.com",
  "prestashop_wishlist_view_user@example.com",
  "prestashop_wishlist_create_user@example.com",
  "prestashop_wishlist_rename_user@example.com",
  "prestashop_wishlist_delete_user@example.com",
  "prestashop_wishlist_remove_user@example.com",
  "prestashop_wishlist_cart_user@example.com",
];

const COLORS = ["#e7f4ef", "#f7e8e1", "#e8eef8", "#f5f0dc", "#efe8f6", "#e3f0f7"];

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function imageData(name: string, view: string, index: number): string {
  const bg = COLORS[index % COLORS.length];
  const fg = view === "Back" ? "#234" : "#2b4d5c";
  const label = escapeXml(name).replace(/'/g, "&apos;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${bg}"/><circle cx="300" cy="255" r="150" fill="${view === "Back" ? "#9bb7c4" : "#ffffff"}" stroke="${fg}" stroke-width="6"/><text x="300" y="440" font-family="Arial" font-size="28" fill="${fg}" text-anchor="middle">${label}</text><text x="300" y="485" font-family="Arial" font-size="22" fill="${fg}" text-anchor="middle">${view} view</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Insert every source requirement record. Safe to run repeatedly. */
export function seed(db: Db): void {
  const now = new Date().toISOString();

  const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name, parent_id, description, image) VALUES (?, ?, ?, ?)");
  const categoryId = (name: string): number => {
    const row = db.prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number } | undefined;
    if (row) return row.id;
    insertCategory.run(name, null, "", "");
    return (db.prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number }).id;
  };

  const clothes = categoryId("CLOTHES");
  db.prepare("UPDATE categories SET parent_id = NULL, description = ? WHERE id = ?").run("CLOTHES: discover our favourite fashionable discoveries and a unique style with personality.", clothes);
  const men = categoryId("Men");
  db.prepare("UPDATE categories SET parent_id = ?, description = ? WHERE id = ?").run(clothes, MEN_DESCRIPTION, men);
  const women = categoryId("Women");
  db.prepare("UPDATE categories SET parent_id = ?, description = ? WHERE id = ?").run(clothes, "Women: a selection of everyday clothing and accessories.", women);
  categoryId("ACCESSORIES");
  categoryId("ART");

  const productByName = db.prepare("SELECT id FROM products WHERE name = ?");
  const insertProduct = db.prepare(`INSERT INTO products
    (name, category_id, price, regular_price, stock, size, color, composition, brand, purchasable, reference, description, features, tax_rate, image, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertVariant = db.prepare("INSERT OR IGNORE INTO product_variants (product_id, size, color, price, regular_price, stock) VALUES (?, ?, ?, ?, ?, ?)");
  const insertImage = db.prepare("INSERT OR IGNORE INTO product_images (product_id, identity, description, src) VALUES (?, ?, ?, ?)");

  PRODUCTS.forEach((product, index) => {
    let row = productByName.get(product.name) as { id: number } | undefined;
    if (!row) {
      const variants = product.variants ?? [{ size: product.size, color: product.color, price: product.price, regularPrice: product.regularPrice, stock: product.stock }];
      const first = variants[0];
      const mainImage = imageData(product.name, "Front", index);
      insertProduct.run(product.name, men, first.price, first.regularPrice, first.stock, first.size, first.color,
        product.composition, product.brand, product.purchasable ? 1 : 0, product.reference, product.description,
        product.features, 0.2, mainImage, now);
      row = productByName.get(product.name) as { id: number };
    }
    const id = row.id;
    const variants = product.variants ?? [{ size: product.size, color: product.color, price: product.price, regularPrice: product.regularPrice, stock: product.stock }];
    for (const variant of variants) {
      insertVariant.run(id, variant.size, variant.color, variant.price, variant.regularPrice, variant.stock);
    }
    const images = product.images && product.images.length
      ? product.images
      : [{ identity: "Front", description: `Front view of ${product.name}` }];
    for (const image of images) {
      insertImage.run(id, image.identity, image.description, imageData(product.name, image.identity, index));
    }
  });

  // One seeded review on the detail t-shirt.
  const detail = productByName.get("Hummingbird detail t-shirt") as { id: number };
  const reviewCount = db.prepare("SELECT COUNT(*) AS count FROM reviews WHERE product_id = ?").get(detail.id) as { count: number };
  if (!reviewCount.count) {
    db.prepare("INSERT INTO reviews (product_id, author, rating, text) VALUES (?, ?, ?, ?)").run(detail.id, "Store User", 4, "Good fit");
  }

  const insertUser = db.prepare(`INSERT OR IGNORE INTO users
    (email, password, title, first_name, last_name, birthdate, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)`);
  const userByName = db.prepare("SELECT id, email FROM users WHERE email = ?");
  const accountId = (email: string): number => {
    const existing = userByName.get(email) as { id: number } | undefined;
    if (existing) return existing.id;
    insertUser.run(email, hashPassword("ShopPass123!"), "Mr.", "Store", "User", "1995-08-21", now);
    return (userByName.get(email) as { id: number }).id;
  };
  for (const email of ACCOUNTS) accountId(email);

  const historyUser = customUserId(db, "prestashop_order_history_user@example.com");
  const historyProduct = productByName.get("Hummingbird order-history t-shirt") as { id: number };
  const historyOrder = db.prepare("SELECT id FROM orders WHERE reference = ?").get("PS-HISTORY-001") as { id: number } | undefined;
  if (!historyOrder && historyUser) {
    const info = db.prepare(`INSERT INTO orders
      (user_id, reference, order_date, status, items_total, discount, shipping, total, payment, shipping_method, address_text, created_at)
      VALUES (?, 'PS-HISTORY-001', '2026-07-18', 'Delivered', 29, 0, 5, 34, 'Bank wire', 'Delivery', '1 Commerce Road, Shanghai 200000, China', ?)`)
      .run(historyUser, now);
    db.prepare("INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, size, color) VALUES (?, ?, ?, 1, 29, 'M', 'White')")
      .run(info.lastInsertRowid, historyProduct.id, "Hummingbird order-history t-shirt");
  }

  // Seeded Favorites wishlists with one membership.
  for (const email of ["prestashop_wishlist_view_user@example.com", "prestashop_wishlist_remove_user@example.com", "prestashop_wishlist_cart_user@example.com"]) {
    const userId = customUserId(db, email);
    if (!userId) continue;
    let list = db.prepare("SELECT id FROM wishlists WHERE user_id = ? AND name = 'Favorites'").get(userId) as { id: number } | undefined;
    if (!list) {
      const info = db.prepare("INSERT INTO wishlists (user_id, name, created_at) VALUES (?, 'Favorites', ?)").run(userId, now);
      list = { id: Number(info.lastInsertRowid) };
    }
    const wishProduct = productByName.get("Hummingbird wishlist t-shirt") as { id: number };
    db.prepare("INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id, created_at) VALUES (?, ?, ?)").run(list.id, wishProduct.id, now);
  }
}

function customUserId(db: Db, email: string): number | undefined {
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
  return row?.id;
}
