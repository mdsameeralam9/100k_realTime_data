export const fetchStocks = async () => {
  const response = await fetch('http://localhost:5000/api/stocks');
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
