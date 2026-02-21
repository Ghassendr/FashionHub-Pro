// Auth Service - Manage authentication state and API calls
const API_URL = "http://localhost:5000/api/auth";

export const authService = {
  // Check if user is logged in
  isAuthenticated() {
    return !!localStorage.getItem("token");
  },

  // Get token
  getToken() {
    return localStorage.getItem("token");
  },

  // Get user ID
  getUserId() {
    return localStorage.getItem("user_id");
  },

  // Get user info
  getUserInfo() {
    return {
      id: localStorage.getItem("user_id"),
      email: localStorage.getItem("user_email"),
      name: localStorage.getItem("user_name"),
    };
  },

  // Login
  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await response.json();

    // Store token and user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_id", data.user.id);
    localStorage.setItem("user_email", data.user.email);
    localStorage.setItem("user_name", `${data.user.prenom} ${data.user.nom}`);

    return data;
  },

  // Signup
  async signup(formData) {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Registration failed");
    }

    const data = await response.json();

    // Store token and user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_id", data.user.id);
    localStorage.setItem("user_email", data.user.email);

    return data;
  },

  // Verify token
  async verifyToken(token) {
    const response = await fetch(`${API_URL}/verify-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  },

  // Get user profile
  async getUserProfile(userId) {
    const token = this.getToken();

    const response = await fetch(`${API_URL}/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }

    return response.json();
  },

  // Logout
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
  },
};
