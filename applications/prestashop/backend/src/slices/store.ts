import type { Express, Request, Response } from "express";
import type { Db } from "../kernel/db";
import { clearCookie, getCookie, hashPassword, newToken, setCookie, verifyPassword } from "../kernel/http";

type Row = Record<string, any>;

const SESSION_COOKIE = "session";
const CART_COOKIE = "cart_token";
const SHIPPING = 5;

type ProductFull = Row & {
  variants: Row[];
  images: Row[];
  reviews: Row[];
  averageRating: number;
  categoryName: string;
};

function userFor(db: Db, request: Request): Row | null {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(token) as Row | undefined;
  return row ?? null;
}

function publicUser(user: Row | null) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    name: `${user.first_name} ${user.last_name}`,
    title: user.title,
    birthdate: user.birthdate,
  };
}

function startSession(db: Db, response: Response, userId: number): string {
  const token = newToken();
  db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, userId, new Date().toISOString());
  setCookie(response, SESSION_COOKIE, token);
  return token;
}

function cartOwner(db: Db, request: Request, response: Response): string {
  const user = userFor(db, request);
  if (user) return `user:${user.id}`;
  let token = getCookie(request, CART_COOKIE);
  if (!token) {
    token = newToken();
    setCookie(response, CART_COOKIE, token);
  }
  return `anon:${token}`;
}

function loadProduct(db: Db, id: number): ProductFull | null {
  const product = db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?").get(id) as Row | undefined;
  if (!product) return null;
  const variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY id").all(id) as Row[];
  const images = db.prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY id").all(id) as Row[];
  const reviews = db.prepare("SELECT * FROM reviews WHERE product_id = ? ORDER BY id").all(id) as Row[];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  return {
    ...product,
    variants,
    images,
    reviews,
    averageRating: Math.round(average * 10) / 10,
    categoryName: product.category_name,
  };
}

function serializeProduct(product: ProductFull) {
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    size: variant.size,
    color: variant.color,
    price: Number(variant.price),
    regularPrice: variant.regular_price === null ? null : Number(variant.regular_price),
    stock: Number(variant.stock),
  }));
  const images = product.images.map((image) => ({
    id: image.id,
    identity: image.identity,
    description: image.description,
    src: image.src,
  }));
  const reviews = product.reviews.map((review) => ({
    id: review.id,
    author: review.author,
    rating: Number(review.rating),
    text: review.text,
  }));
  return {
    id: product.id,
    name: product.name,
    categoryId: product.category_id,
    category: product.categoryName,
    price: Number(product.price),
    regularPrice: product.regular_price === null ? null : Number(product.regular_price),
    stock: Number(product.stock),
    size: product.size,
    color: product.color,
    composition: product.composition,
    brand: product.brand,
    purchasable: Boolean(product.purchasable),
    reference: product.reference,
    description: product.description,
    features: product.features,
    taxRate: Number(product.tax_rate),
    image: product.image,
    variants,
    images,
    reviews,
    averageRating: product.averageRating,
  };
}

function variantFor(db: Db, productId: number, size: string, color: string): Row | null {
  const row = db.prepare("SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color = ?").get(productId, size, color) as Row | undefined;
  return row ?? null;
}

function cartData(db: Db, owner: string) {
  const rows = db.prepare("SELECT * FROM cart_items WHERE owner = ? ORDER BY id").all(owner) as Row[];
  const items = rows.map((row) => {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(row.product_id) as Row | undefined;
    if (!product) return null;
    const variant = variantFor(db, row.product_id, row.size, row.color);
    const unitPrice = Number(variant?.price ?? product.price);
    const regularPrice = variant?.regular_price === null || variant?.regular_price === undefined ? null : Number(variant.regular_price);
    const quantity = Number(row.quantity);
    return {
      id: row.id,
      productId: product.id,
      name: product.name,
      image: product.image,
      size: row.size,
      color: row.color,
      quantity,
      unitPrice,
      regularPrice,
      subtotal: Math.round(unitPrice * quantity * 100) / 100,
      discount: regularPrice && regularPrice > unitPrice ? Math.round((regularPrice - unitPrice) * quantity * 100) / 100 : 0,
      stock: Number(variant?.stock ?? product.stock),
    };
  }).filter(Boolean) as Row[];
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  const discount = Math.round(items.reduce((sum, item) => sum + item.discount, 0) * 100) / 100;
  const shipping = items.length ? SHIPPING : 0;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    items,
    count,
    subtotal,
    discount,
    shipping,
    total: Math.round((subtotal + shipping) * 100) / 100,
  };
}

function addToCart(db: Db, owner: string, productId: number, size: string, color: string, quantity: number): { ok: boolean; error?: string } {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as Row | undefined;
  if (!product) return { ok: false, error: "Product not found" };
  const variant = variantFor(db, productId, size, color) ?? db.prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY id LIMIT 1").get(productId) as Row | undefined;
  if (!variant) return { ok: false, error: "Variant not found" };
  const existing = db.prepare("SELECT * FROM cart_items WHERE owner = ? AND product_id = ? AND size = ? AND color = ?").get(owner, productId, variant.size, variant.color) as Row | undefined;
  // Adding the same combination again keeps the requested quantity, so repeated set-up steps stay idempotent.
  const requested = Number(quantity);
  if (requested > Number(variant.stock) || requested < 1) return { ok: false, error: "Insufficient stock" };
  if (existing) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(requested, existing.id);
  } else {
    db.prepare("INSERT INTO cart_items (owner, product_id, size, color, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(owner, productId, variant.size, variant.color, requested, new Date().toISOString());
  }
  return { ok: true };
}

function orderData(db: Db, reference: string, user: Row | null) {
  const order = db.prepare("SELECT * FROM orders WHERE reference = ?").get(reference) as Row | undefined;
  if (!order) return null;
  if (order.user_id && (!user || Number(order.user_id) !== Number(user.id))) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(order.id) as Row[];
  const address = db.prepare("SELECT * FROM addresses WHERE user_id = ? AND alias = 'Home' LIMIT 1").get(order.user_id) as Row | undefined;
  return {
    id: order.id,
    reference: order.reference,
    date: order.order_date,
    status: order.status,
    itemsTotal: Number(order.items_total),
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    total: Number(order.total),
    payment: order.payment,
    shippingMethod: order.shipping_method,
    addressAlias: order.address_alias || "",
    address: order.address_text || (address ? `${address.address}, ${address.city} ${address.postal_code}, ${address.country}` : ""),
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      subtotal: Math.round(Number(item.unit_price) * Number(item.quantity) * 100) / 100,
      size: item.size,
      color: item.color,
    })),
  };
}

function serializeAddress(address: Row) {
  return {
    id: address.id,
    alias: address.alias,
    firstName: address.first_name,
    lastName: address.last_name,
    address: address.address,
    postalCode: address.postal_code,
    city: address.city,
    country: address.country,
    phone: address.phone,
  };
}

function makeReference(db: Db): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const reference = `PS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
    const exists = db.prepare("SELECT 1 FROM orders WHERE reference = ?").get(reference);
    if (!exists) return reference;
  }
  return `PS-${Date.now()}`;
}

function invoicePdf(reference: string): Buffer {
  const lines = [
    "BT /F1 20 Tf 72 720 Td (PrestaShop invoice) Tj ET",
    `BT /F1 14 Tf 72 680 Td (Order reference: ${reference}) Tj ET`,
    "BT /F1 12 Tf 72 650 Td (Thank you for your order.) Tj ET",
  ];
  const stream = lines.join("\n");
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}

export function registerStore(app: Express, db: Db): void {
  app.get("/api/me", (request, response) => {
    response.json({ user: publicUser(userFor(db, request)) });
  });

  app.post("/api/auth/login", (request, response) => {
    const email = String(request.body?.email ?? "").trim().toLowerCase();
    const password = String(request.body?.password ?? "");
    const user = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(email) as Row | undefined;
    if (!user || !verifyPassword(password, user.password)) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    // Merge an anonymous cart into the signed-in customer's cart.
    const anonToken = getCookie(request, CART_COOKIE);
    const userOwner = `user:${user.id}`;
    if (anonToken) {
      const anonOwner = `anon:${anonToken}`;
      const anonItems = db.prepare("SELECT * FROM cart_items WHERE owner = ?").all(anonOwner) as Row[];
      for (const item of anonItems) {
        const existing = db.prepare("SELECT * FROM cart_items WHERE owner = ? AND product_id = ? AND size = ? AND color = ?")
          .get(userOwner, item.product_id, item.size, item.color) as Row | undefined;
        if (existing) {
          db.prepare("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?").run(item.quantity, existing.id);
          db.prepare("DELETE FROM cart_items WHERE id = ?").run(item.id);
        } else {
          db.prepare("UPDATE cart_items SET owner = ? WHERE id = ?").run(userOwner, item.id);
        }
      }
    }
    startSession(db, response, user.id);
    response.json({ user: publicUser(user) });
  });

  app.post("/api/auth/register", (request, response) => {
    const body = request.body ?? {};
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password || !body.firstName || !body.lastName) {
      response.status(400).json({ error: "Please complete all required fields" });
      return;
    }
    const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email);
    if (existing) {
      response.status(409).json({ error: "An account already exists for this email" });
      return;
    }
    const info = db.prepare(`INSERT INTO users (email, password, title, first_name, last_name, birthdate, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)`).run(email, hashPassword(password), String(body.title ?? "Mr."), String(body.firstName),
      String(body.lastName), String(body.birthdate ?? ""), new Date().toISOString());
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as Row;
    startSession(db, response, user.id);
    response.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", (request, response) => {
    const token = getCookie(request, SESSION_COOKIE);
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    clearCookie(response, SESSION_COOKIE);
    response.json({ ok: true });
  });

  app.post("/api/auth/forgot", (request, response) => {
    const email = String(request.body?.email ?? "").trim();
    response.json({ message: `A reset email has been sent to ${email}.` });
  });

  app.put("/api/profile", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const body = request.body ?? {};
    const current = String(body.currentPassword ?? "");
    if (!verifyPassword(current, user.password)) return response.status(400).json({ error: "Current password is incorrect" });
    const email = String(body.email ?? user.email).trim().toLowerCase();
    if (!email) return response.status(400).json({ error: "Email is required" });
    const clash = db.prepare("SELECT id FROM users WHERE lower(email) = ? AND id <> ?").get(email, user.id);
    if (clash) return response.status(409).json({ error: "This email is already used" });
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, user.id);
    const newPassword = String(body.newPassword ?? "");
    if (newPassword) db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(newPassword), user.id);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as Row;
    response.json({ user: publicUser(updated), updated: true });
  });

  app.get("/api/categories", (_request, response) => {
    response.json({ categories: db.prepare("SELECT * FROM categories ORDER BY id").all() });
  });

  app.get("/api/products", (request, response) => {
    const q = String(request.query.q ?? "").trim().toLowerCase();
    const category = String(request.query.category ?? "").trim();
    let rows = db.prepare("SELECT id FROM products ORDER BY id").all() as Array<{ id: number }>;
    let products = rows.map((row) => loadProduct(db, row.id)).filter(Boolean) as ProductFull[];
    if (category) {
      products = products.filter((product) => product.categoryName.toLowerCase() === category.toLowerCase());
    }
    if (q) products = products.filter((product) => product.name.toLowerCase().includes(q));
    response.json({ products: products.map(serializeProduct) });
  });

  app.get("/api/products/:id", (request, response) => {
    const product = loadProduct(db, Number(request.params.id));
    if (!product) return response.status(404).json({ error: "Product not found" });
    response.json({ product: serializeProduct(product) });
  });

  app.get("/api/cart", (request, response) => {
    const owner = cartOwner(db, request, response);
    response.json(cartData(db, owner));
  });

  app.post("/api/cart/add", (request, response) => {
    const owner = cartOwner(db, request, response);
    const body = request.body ?? {};
    const result = addToCart(db, owner, Number(body.productId), String(body.size ?? ""), String(body.color ?? ""), Number(body.quantity ?? 1));
    if (!result.ok) return response.status(400).json({ error: result.error });
    response.json(cartData(db, owner));
  });

  app.patch("/api/cart/items/:id", (request, response) => {
    const owner = cartOwner(db, request, response);
    const item = db.prepare("SELECT * FROM cart_items WHERE id = ? AND owner = ?").get(Number(request.params.id), owner) as Row | undefined;
    if (!item) return response.status(404).json({ error: "Cart item not found" });
    const variant = variantFor(db, item.product_id, item.size, item.color);
    const quantity = Math.max(1, Number(request.body?.quantity ?? item.quantity));
    if (variant && quantity > Number(variant.stock)) return response.status(400).json({ error: "Insufficient stock" });
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(quantity, item.id);
    response.json(cartData(db, owner));
  });

  app.delete("/api/cart/items/:id", (request, response) => {
    const owner = cartOwner(db, request, response);
    db.prepare("DELETE FROM cart_items WHERE id = ? AND owner = ?").run(Number(request.params.id), owner);
    response.json(cartData(db, owner));
  });

  app.get("/api/addresses", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const rows = db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY id").all(user.id) as Row[];
    response.json({ addresses: rows.map(serializeAddress) });
  });

  app.post("/api/addresses", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const body = request.body ?? {};
    const alias = String(body.alias ?? "").trim();
    if (!alias) return response.status(400).json({ error: "Alias is required" });
    const existing = db.prepare("SELECT * FROM addresses WHERE user_id = ? AND alias = ?").get(user.id, alias) as Row | undefined;
    const values = [String(body.firstName ?? ""), String(body.lastName ?? ""), String(body.address ?? ""), String(body.postalCode ?? ""),
      String(body.city ?? ""), String(body.country ?? ""), String(body.phone ?? "")];
    if (existing) {
      db.prepare("UPDATE addresses SET first_name = ?, last_name = ?, address = ?, postal_code = ?, city = ?, country = ?, phone = ? WHERE id = ?")
        .run(...values, existing.id);
      const updated = db.prepare("SELECT * FROM addresses WHERE id = ?").get(existing.id) as Row;
      return response.json({ address: serializeAddress(updated) });
    }
    const info = db.prepare(`INSERT INTO addresses (user_id, alias, first_name, last_name, address, postal_code, city, country, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(user.id, alias, ...values, new Date().toISOString());
    const created = db.prepare("SELECT * FROM addresses WHERE id = ?").get(info.lastInsertRowid) as Row;
    response.json({ address: serializeAddress(created) });
  });

  app.put("/api/addresses/:id", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const address = db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!address) return response.status(404).json({ error: "Address not found" });
    const body = request.body ?? {};
    db.prepare("UPDATE addresses SET alias = ?, first_name = ?, last_name = ?, address = ?, postal_code = ?, city = ?, country = ?, phone = ? WHERE id = ?")
      .run(String(body.alias ?? address.alias), String(body.firstName ?? address.first_name), String(body.lastName ?? address.last_name),
        String(body.address ?? address.address), String(body.postalCode ?? address.postal_code), String(body.city ?? address.city),
        String(body.country ?? address.country), String(body.phone ?? address.phone), address.id);
    const updated = db.prepare("SELECT * FROM addresses WHERE id = ?").get(address.id) as Row;
    response.json({ address: serializeAddress(updated) });
  });

  app.delete("/api/addresses/:id", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(Number(request.params.id), user.id);
    response.json({ ok: true });
  });

  app.get("/api/orders", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const rows = db.prepare("SELECT reference FROM orders WHERE user_id = ? ORDER BY order_date DESC, id DESC").all(user.id) as Row[];
    response.json({ orders: rows.map((row) => orderData(db, row.reference, user)).filter(Boolean) });
  });

  app.get("/api/orders/:reference", (request, response) => {
    const user = userFor(db, request);
    const order = orderData(db, String(request.params.reference), user);
    if (!order) return response.status(404).json({ error: "Order not found" });
    response.json({ order });
  });

  app.post("/api/orders", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Sign in to place an order" });
    const body = request.body ?? {};
    if (!body.terms) return response.status(400).json({ error: "You must agree to the Terms and conditions" });
    const cart = cartData(db, `user:${user.id}`);
    if (!cart.items.length) return response.status(400).json({ error: "Your cart is empty" });
    const address = db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?").get(Number(body.addressId), user.id) as Row | undefined;
    if (!address) return response.status(400).json({ error: "Please select a shipping address" });
    const payment = String(body.payment ?? "Bank wire");
    const shippingMethod = String(body.shippingMethod ?? "Delivery");
    const addressText = `${address.first_name} ${address.last_name}, ${address.address}, ${address.city} ${address.postal_code}, ${address.country}`;
    // An identical order returns the existing row instead of adding a duplicate.
    const existingOrders = db.prepare("SELECT * FROM orders WHERE user_id = ? AND status NOT IN ('cancelled', 'refunded') ORDER BY id").all(user.id) as Row[];
    for (const existing of existingOrders) {
      if (existing.address_text !== addressText || existing.payment !== payment || existing.shipping_method !== shippingMethod) continue;
      if (Math.abs(Number(existing.total) - cart.total) > 0.001) continue;
      const existingItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(existing.id) as Row[];
      if (existingItems.length !== cart.items.length) continue;
      const same = existingItems.every((item, index) => {
        const current = cart.items[index];
        return Number(item.product_id) === current.productId && item.size === current.size && item.color === current.color
          && Number(item.quantity) === current.quantity && Math.abs(Number(item.unit_price) - current.unitPrice) < 0.001;
      });
      if (same) {
        db.prepare("DELETE FROM cart_items WHERE owner = ?").run(`user:${user.id}`);
        return response.json({ order: orderData(db, existing.reference, user) });
      }
    }
    const reference = makeReference(db);
    const orderDate = new Date().toISOString().slice(0, 10);
    const status = "Pending";
    const info = db.prepare(`INSERT INTO orders
      (user_id, reference, order_date, status, items_total, discount, shipping, total, payment, shipping_method, address_alias, address_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(user.id, reference, orderDate, status, cart.subtotal, cart.discount,
      cart.shipping, cart.total, payment, shippingMethod, address.alias, addressText, new Date().toISOString());
    for (const item of cart.items) {
      db.prepare("INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, size, color) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(info.lastInsertRowid, item.productId, item.name, item.quantity, item.unitPrice, item.size, item.color);
    }
    db.prepare("DELETE FROM cart_items WHERE owner = ?").run(`user:${user.id}`);
    response.json({ order: orderData(db, reference, user) });
  });

  app.post("/api/orders/:reference/reorder", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const order = orderData(db, String(request.params.reference), user);
    if (!order) return response.status(404).json({ error: "Order not found" });
    const owner = `user:${user.id}`;
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.productId) as Row | undefined;
      if (!product || !product.purchasable) continue;
      const variant = variantFor(db, item.productId, item.size, item.color) ??
        db.prepare("SELECT * FROM product_variants WHERE product_id = ? AND stock > 0 ORDER BY id LIMIT 1").get(item.productId) as Row | undefined;
      if (!variant) continue;
      addToCart(db, owner, item.productId, variant.size, variant.color, item.quantity);
    }
    response.json(cartData(db, owner));
  });

  app.get("/api/orders/:reference/invoice", (request, response) => {
    const user = userFor(db, request);
    const order = orderData(db, String(request.params.reference), user);
    if (!order) return response.status(404).json({ error: "Order not found" });
    response.type("application/pdf")
      .set("Content-Disposition", `attachment; filename="${order.reference}.pdf"`)
      .send(invoicePdf(order.reference));
  });

  app.get("/api/wishlists", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const rows = db.prepare("SELECT * FROM wishlists WHERE user_id = ? ORDER BY id").all(user.id) as Row[];
    const wishlists = rows.map((row) => ({
      id: row.id,
      name: row.name,
      count: Number((db.prepare("SELECT COUNT(*) AS count FROM wishlist_items WHERE wishlist_id = ?").get(row.id) as Row).count),
    }));
    response.json({ wishlists });
  });

  app.post("/api/wishlists", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const name = String(request.body?.name ?? "").trim();
    if (!name) return response.status(400).json({ error: "Name is required" });
    const existing = db.prepare("SELECT * FROM wishlists WHERE user_id = ? AND name = ?").get(user.id, name) as Row | undefined;
    if (existing) return response.json({ wishlist: { id: existing.id, name: existing.name } });
    const info = db.prepare("INSERT INTO wishlists (user_id, name, created_at) VALUES (?, ?, ?)").run(user.id, name, new Date().toISOString());
    response.json({ wishlist: { id: Number(info.lastInsertRowid), name } });
  });

  app.put("/api/wishlists/:id", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const list = db.prepare("SELECT * FROM wishlists WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!list) return response.status(404).json({ error: "Wishlist not found" });
    const name = String(request.body?.name ?? "").trim();
    if (!name) return response.status(400).json({ error: "Name is required" });
    const clash = db.prepare("SELECT * FROM wishlists WHERE user_id = ? AND name = ? AND id <> ?").get(user.id, name, list.id) as Row | undefined;
    if (clash) {
      const items = db.prepare("SELECT * FROM wishlist_items WHERE wishlist_id = ?").all(list.id) as Row[];
      for (const item of items) {
        db.prepare("INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id, created_at) VALUES (?, ?, ?)")
          .run(clash.id, item.product_id, new Date().toISOString());
      }
      db.prepare("DELETE FROM wishlist_items WHERE wishlist_id = ?").run(list.id);
      db.prepare("DELETE FROM wishlists WHERE id = ?").run(list.id);
      return response.json({ wishlist: { id: clash.id, name: clash.name } });
    }
    db.prepare("UPDATE wishlists SET name = ? WHERE id = ?").run(name, list.id);
    response.json({ wishlist: { id: list.id, name } });
  });

  app.delete("/api/wishlists/:id", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const list = db.prepare("SELECT * FROM wishlists WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!list) return response.status(404).json({ error: "Wishlist not found" });
    db.prepare("DELETE FROM wishlist_items WHERE wishlist_id = ?").run(list.id);
    db.prepare("DELETE FROM wishlists WHERE id = ?").run(list.id);
    response.json({ ok: true });
  });

  app.get("/api/wishlists/:id", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const list = db.prepare("SELECT * FROM wishlists WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!list) return response.status(404).json({ error: "Wishlist not found" });
    const rows = db.prepare("SELECT * FROM wishlist_items WHERE wishlist_id = ? ORDER BY id").all(list.id) as Row[];
    const items = rows.map((row) => {
      const product = loadProduct(db, row.product_id);
      return product ? serializeProduct(product) : null;
    }).filter(Boolean);
    response.json({ wishlist: { id: list.id, name: list.name, items } });
  });

  app.post("/api/wishlists/:id/items", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const list = db.prepare("SELECT * FROM wishlists WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!list) return response.status(404).json({ error: "Wishlist not found" });
    db.prepare("INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id, created_at) VALUES (?, ?, ?)")
      .run(list.id, Number(request.body?.productId), new Date().toISOString());
    response.json({ ok: true });
  });

  app.delete("/api/wishlists/:id/items/:productId", (request, response) => {
    const user = userFor(db, request);
    if (!user) return response.status(401).json({ error: "Not signed in" });
    const list = db.prepare("SELECT * FROM wishlists WHERE id = ? AND user_id = ?").get(Number(request.params.id), user.id) as Row | undefined;
    if (!list) return response.status(404).json({ error: "Wishlist not found" });
    db.prepare("DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?").run(list.id, Number(request.params.productId));
    response.json({ ok: true });
  });
}
