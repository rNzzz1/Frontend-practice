import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api"
});

export const api = {
  getProducts: async () => {
    const res = await apiClient.get("/products");
    return res.data;
  },
  createProduct: async (product) => {
    const res = await apiClient.post("/products", product);
    return res.data;
  },
  updateProduct: async (id, product) => {
    const res = await apiClient.patch(`/products/${id}`, product);
    return res.data;
  },
  deleteProduct: async (id) => {
    await apiClient.delete(`/products/${id}`);
  }
};