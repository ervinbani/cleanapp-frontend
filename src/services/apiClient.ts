import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("brillo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// check for 401 errors and if token exists, remove it and redirect to login page
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("brillo_token")) {
      localStorage.removeItem("brillo_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default apiClient;
