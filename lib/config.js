// Configuration for API endpoints
const config = {
  // API URL - will use the deployed backend URL in production
  // and localhost in development
  // apiUrl: process.env.NEXT_PUBLIC_API_URL || 
  //         (process.env.NODE_ENV === 'production' 
  //           ? 'https://trading-agent-kk3z.onrender.com' // Replace with your actual deployed URL
  //           : 'http://localhost:4000'),
  apiUrl: 'http://localhost:4000',
};

export default config; 
