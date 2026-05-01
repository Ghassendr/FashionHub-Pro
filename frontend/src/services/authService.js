// Auth Service - Manage authentication state and API calls
const API_URL = "http://localhost:8000/api/auth";

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
    const response = await fetch(`${API_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || "Login failed");
    }

    const data = await response.json();

    // Store token and user info (SimpleJWT returns access/refresh)
    localStorage.setItem("token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    // Decode token to get role and status if needed, or use a separate profile call
    // For now, let's assume we store what we get
    return data;
  },

  // Signup
  async signup(payload) {
    const response = await fetch(`${API_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      // Handle Django Rest Framework error format (can be object or list)
      const errorMsg = typeof data === 'object' ? Object.values(data).flat()[0] : "Registration failed";
      throw new Error(errorMsg);
    }

    return response.json();
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

    const response = await fetch(`${API_URL}/profile/${userId}/`, {
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
