export const getConfig = () => {
    const useMockData = localStorage.getItem('useMockData') !== 'false';
    const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'https://schooltransport-production.up.railway.app/api';
    return {
        useMockData,
        apiBaseUrl,
    };
};
export const setConfig = (useMockData, apiBaseUrl) => {
    localStorage.setItem('useMockData', String(useMockData));
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
};
