import { createContext, useContext, useState, useEffect, useCallback } from "react";

import API_URL from "../config";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = useCallback(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setUser(await res.json());
            } else {
                localStorage.removeItem("access_token");
                localStorage.removeItem("is_admin");
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAuth();
    }, [refreshAuth]);

    function logout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("is_admin");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshAuth, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}