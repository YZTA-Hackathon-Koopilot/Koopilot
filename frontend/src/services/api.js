import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
};

const savedToken = localStorage.getItem('koopilot_auth_token');
if (savedToken) {
  setAuthToken(savedToken);
}

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const loginDemoUser = async () => {
  const response = await api.post('/auth/demo-login');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const analyzeMessage = async (message, sessionId = null) => {
  const response = await api.post('/ai/analyze-message', {
    message,
    session_id: sessionId,
  });
  return response.data;
};
export const askStaffAssistant = async (message, sessionId = null) => {
  const response = await api.post('/ai/staff-assistant', {
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
export const getIntegrationChannels = async () => {
  const response = await api.get('/integrations/channels');
  return response.data;
};
export const getWhatsAppStatus = async () => {
  const response = await api.get('/integrations/whatsapp/status');
  return response.data;
};
export const getInventoryInsights = async () => {
  const response = await api.get('/inventory/insights');
  return response.data;
};
export const getCampaignRecommendation = async (product) => {
  const response = await api.post('/ai/campaign-recommendation', product);
  return response.data;
};
export default api;
