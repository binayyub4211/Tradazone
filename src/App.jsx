/**
 * App routing — React Router stack
 *
 * ADR-002: docs/adr/002-app-routing-stack.md (Issue #202)
 * - BrowserRouter + nested Routes; protected shell via PrivateRoute + Layout.
 *
 * PERFORMANCE: Checkout route components are loaded via React.lazy() so the
 * JS for that flow is fetched on-demand, not bundled with the initial payload.
 * Chart.js (used within the checkout flow) is further isolated in its own
 * `chartjs` Rollup chunk — see src/components/ui/LazyChart.jsx and
 * vite.config.js for details.
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Home from './pages/dashboard/Home';
import CustomerList from './pages/customers/CustomerList';
import AddCustomer from './pages/customers/AddCustomer';
import CustomerDetail from './pages/customers/CustomerDetail';
import InvoiceList from './pages/invoices/InvoiceList';
import CreateInvoice from './pages/invoices/CreateInvoice';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoicePreview from './pages/invoices/InvoicePreview';
import ItemsList from './pages/items/ItemsList';
import AddItem from './pages/items/AddItem';
import ItemDetail from './pages/items/ItemDetail';
import Settings from './pages/settings/Settings';
import ProfileSettings from './pages/settings/ProfileSettings';
import PaymentSettings from './pages/settings/PaymentSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import PasswordSettings from './pages/settings/PasswordSettings';
// ---------------------------------------------------------------------------
// Checkout route components — lazy-loaded
//
// These four components are split into their own dynamic chunks so users who
// never visit the Checkout flow pay zero JS parsing cost for that code.  When
// any checkout route is first navigated to, React suspends the subtree, loads
// the chunk, then resumes rendering — giving a fast initial load for every
// other page of the app.
// ---------------------------------------------------------------------------
const CheckoutList   = lazy(() => import('./pages/checkouts/CheckoutList'));
const CreateCheckout = lazy(() => import('./pages/checkouts/CreateCheckout'));
const CheckoutDetail = lazy(() => import('./pages/checkouts/CheckoutDetail'));
const MailCheckout   = lazy(() => import('./pages/checkouts/MailCheckout'));

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

/**
 * Webhook integration — checkout events
 *
 * The following checkout lifecycle events are dispatched via
 * `src/services/webhook.js` (dispatchWebhook) at the route level:
 *
 * | Event              | Route / Component         | Trigger                          |
 * |--------------------|---------------------------|----------------------------------|
 * | checkout.created   | /checkout/create          | Form submit in CreateCheckout    |
 * | checkout.viewed    | /pay/:checkoutId          | Mount of MailCheckout            |
 * | checkout.paid      | /pay/:checkoutId          | Successful wallet connect        |
 *
 * The webhook endpoint is configured via `VITE_WEBHOOK_URL` (build-time) or
 * through Settings > Payments at runtime. See `src/services/webhook.js` for
 * the full dispatch contract and retry logic.
 */

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename="/Tradazone">
          <Routes>
            {/* Public routes — checkout payment page is lazy-loaded */}
            <Route
              path="/pay/:checkoutId"
              element={
                <Suspense fallback={<div className="min-h-screen bg-brand" aria-busy="true" aria-label="Loading…" />}>
                  <MailCheckout />
                </Suspense>
              }
            />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/invoice/:id" element={<InvoicePreview />} />

            {/* Protected routes — require authentication */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/add" element={<AddCustomer />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              {/* Checkout routes — wrapped in Suspense so the lazy chunks
                  resolve gracefully while the user navigates */}
              <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400" aria-busy="true">Loading…</div>}>
                <Route path="checkout" element={<CheckoutList />} />
                <Route path="checkout/create" element={<CreateCheckout />} />
                <Route path="checkout/:id" element={<CheckoutDetail />} />
              </Suspense>
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoice />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="items" element={<ItemsList />} />
              <Route path="items/add" element={<AddItem />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route path="settings" element={<Settings />}>
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="payments" element={<PaymentSettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
                <Route path="password" element={<PasswordSettings />} />
              </Route>
            </Route>

            {/* Catch-all — redirect to signin */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
