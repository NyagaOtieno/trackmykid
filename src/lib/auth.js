import api from './api';
export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    // Store token in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    // Set default Authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return { token, user };
};
export const register = async (name, email, password, role, schoolId) => {
    const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
        schoolId,
    });
    const { token, user } = response.data;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return { token, user };
};
export const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    delete api.defaults.headers.common['Authorization'];
};
export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};
export const getToken = () => {
    return localStorage.getItem('authToken');
};
export const initializeAuth = () => {
    const token = getToken();
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
};
