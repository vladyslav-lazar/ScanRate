import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Home             from "./pages/Home";
import Scanner          from "./pages/Scanner";
import Search           from "./pages/Search";
import Product          from "./pages/Product";
import Login            from "./pages/Login";
import AuthVerify       from "./pages/AuthVerify";
import Navbar           from "./components/Navbar";
import DesktopWarning   from "./components/DesktopWarning";
import AdminLayout      from "./pages/admin/AdminLayout";
import AdminReviews     from "./pages/admin/AdminReviews";
import AdminRequests    from "./pages/admin/AdminRequests";
import AdminAddProduct  from "./pages/admin/AdminAddProduct";
import AdminEditProduct from "./pages/admin/AdminEditProduct";
import AdminStats       from "./pages/admin/AdminStats";


function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user)   return <Navigate to="/login" replace />;
    return children;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading)        return null;
    if (!user)          return <Navigate to="/login" replace />;
    if (!user.is_admin) return <Navigate to="/" replace />;
    return children;
}

function Layout() {
    const location = useLocation();
    const hideNav  = ["/scan", "/login", "/auth/verify", "/grafana-redirect"].includes(location.pathname)
        || location.pathname.startsWith("/admin");

    return (
        <>
            <DesktopWarning />
            <Routes>
                {/* Public */}
                <Route path="/"             element={<Home />} />
                <Route path="/search"       element={<Search />} />
                <Route path="/product/:ean" element={<Product />} />
                <Route path="/login"        element={<Login />} />
                <Route path="/auth/verify"  element={<AuthVerify />} />

                {/* Requires login */}
                <Route path="/scan" element={
                    <ProtectedRoute><Scanner /></ProtectedRoute>
                } />

                {/* Requires admin */}
                <Route path="/admin" element={
                    <AdminRoute><AdminLayout /></AdminRoute>
                }>
                    <Route index            element={<AdminStats />} />
                    <Route path="stats"     element={<AdminStats />} />
                    <Route path="reviews"   element={<AdminReviews />} />
                    <Route path="requests"  element={<AdminRequests />} />
                    <Route path="add"       element={<AdminAddProduct />} />
                    <Route path="edit"      element={<AdminEditProduct />} />
                </Route>
            </Routes>
            {!hideNav && <Navbar />}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        </AuthProvider>
    );
}
