import React from 'react';
import './Loding.css'; // Spinner ki styling ke liye

// loading ko prop ke roop me accept kiya
function Loding({ loading }) {
  if (!loading) return null; // Agar loading false hai toh kuch bhi render mat karo

  return (
    <div className="loading-container">
      <span className="spinner"></span> कृपया प्रतीक्षा करें...
    </div>
  );
}

export default Loding;
