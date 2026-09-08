export const getConfig = () => {
  const useMockData = localStorage.getItem('useMockData') !== 'false';
  const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'https://tmk-api.joshpitah.co.ke/api';
  
  return {
    useMockData,
    apiBaseUrl,
  };
};

export const setConfig = (useMockData: boolean, apiBaseUrl: string) => {
  localStorage.setItem('useMockData', String(useMockData));
  localStorage.setItem('apiBaseUrl', apiBaseUrl);
};
