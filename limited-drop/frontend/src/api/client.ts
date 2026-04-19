// src/api/client.ts
import axios from "axios";
 
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
 
// Add response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
	const message = error.response?.data?.error || "Network error";
	return Promise.reject(new Error(message));
  }
);
 
export default apiClient;

