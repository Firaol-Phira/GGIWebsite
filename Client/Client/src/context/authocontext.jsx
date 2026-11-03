import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page refresh, restore the user from the saved token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) =>
        setUser({
          ...res.data.user,
          must_change_password: !!res.data.user.must_change_password,
        }),
      )
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const passwordChanged = () =>
    setUser((u) => ({ ...u, must_change_password: false }));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, passwordChanged }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Where each role lands after login
export const homeFor = (role) =>
  ({
    admin: "/admin/users",
    finance: "/finance",
    secretary: "/secretary",
    member: "/member",
  })[role] || "/login";
