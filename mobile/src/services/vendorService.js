import api from '../config/api';

const vendorService = {
  getAll: async () => {
    const response = await api.get('/vendors');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },

  create: async (vendorData) => {
    const response = await api.post('/vendors', vendorData);
    return response.data;
  },

  update: async (id, vendorData) => {
    const response = await api.put(`/vendors/${id}`, vendorData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },
};

export default vendorService;
