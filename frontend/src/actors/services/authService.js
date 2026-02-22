export const authService = {
    getUserInfo: () => ({ name: 'Test User', email: 'test@example.com' }),
    getToken: () => localStorage.getItem('token') || 'dummy-token',
    getUserId: () => localStorage.getItem('userId') || 'dummy-user-id',
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        console.log('Mock logout');
    },
};
