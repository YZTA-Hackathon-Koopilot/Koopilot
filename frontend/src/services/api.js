import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
export const analyzeMessage = async (message, sessionId = null) => {
  const response = await api.post('/ai/analyze-message', {
    message,
    session_id: sessionId,
  });
  return response.data;
};
export const getInventory = async () => {
  const response = await api.get('/inventory');
  return response.data;
};
export const updateProduct = async (productId, productData) => {
  const response = await api.put(`/inventory/${productId}`, productData);
  return response.data;
};
export const createProduct = async (productData) => {
  const response = await api.post('/inventory', productData);
  return response.data;
};
export const uploadInventory = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/inventory/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
export const getInventoryAlerts = async () => {
  const response = await api.get('/inventory/alerts');
  return response.data;
};
export const getOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};
export const approveOrder = async (orderId) => {
  const response = await api.put(`/orders/${orderId}/approve`);
  return response.data;
};
export const rejectOrder = async (orderId) => {
  const response = await api.put(`/orders/${orderId}/reject`);
  return response.data;
};
export const deleteOrder = async (orderId) => {
  const response = await api.delete(`/orders/${orderId}`);
  return response.data;
};
export const getShippingStatus = async (orderId) => {
  const response = await api.get(`/shipping/status/${orderId}`);
  return response.data;
};
export const getActiveShipments = async () => {
  const response = await api.get('/shipping/active');
  return response.data;
};
export const updateShippingStatus = async (orderId, status) => {
  const response = await api.put(`/shipping/${orderId}/status`, null, {
    params: { status }
  });
  return response.data;
};
export const getDailySummary = async () => {
  const response = await api.get('/ai/daily-summary');
  return response.data;
};
export default api;