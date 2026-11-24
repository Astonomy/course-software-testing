import type { RouteObject } from "react-router-dom";
import { HomePage } from "../pages/Home";
import { CategoryPage, SearchPage } from "../pages/Catalog";
import { ProductPage } from "../pages/Product";
import { CartPage } from "../pages/Cart";
import { CheckoutPage } from "../pages/Checkout";
import { OrderConfirmationPage } from "../pages/OrderConfirmation";
import { LoginPage, PasswordRecoveryPage, RegisterPage } from "../pages/Auth";
import {
  AccountPage, AddressesPage, InformationPage, OrderDetailPage, OrdersPage, WishlistPage, WishlistsPage,
} from "../pages/Account";

export const sliceRoutes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/category/:slug", element: <CategoryPage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/product/:id", element: <ProductPage /> },
  { path: "/cart", element: <CartPage /> },
  { path: "/checkout", element: <CheckoutPage /> },
  { path: "/order-confirmation/:reference", element: <OrderConfirmationPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/password-recovery", element: <PasswordRecoveryPage /> },
  { path: "/account", element: <AccountPage /> },
  { path: "/account/information", element: <InformationPage /> },
  { path: "/account/addresses", element: <AddressesPage /> },
  { path: "/account/orders", element: <OrdersPage /> },
  { path: "/account/orders/:reference", element: <OrderDetailPage /> },
  { path: "/account/wishlists", element: <WishlistsPage /> },
  { path: "/account/wishlists/:id", element: <WishlistPage /> },
];
