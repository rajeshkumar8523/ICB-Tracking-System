const API_BASE_URL = 'https://icb-trcking-backend.vercel.app/';

// Function to get JWT token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Function to check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}

// Function to redirect to login if not authenticated
function checkAuth() {
  if (!isAuthenticated()) {
    window.location.href = '../LOCATION/location.html';
    return false;
  }
  return true;
}

// Get bus number from URL or default to 1
const urlParams = new URLSearchParams(window.location.search);
const busNumber = urlParams.get('bus') || '1';

// Initialize the map
const map = L.map('map').setView([16.6989, 77.9405], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Custom bus icon
const busIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/477/477103.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Create bus marker
let busMarker = L.marker([16.6989, 77.9405], { icon: busIcon }).addTo(map);
busMarker.bindPopup(`Bus ${busNumber}`).openPopup();

// Connect to Socket.io server with authentication
const socket = io(API_BASE_URL, {
  auth: {
    token: getToken()
  }
});

// Handle socket authentication errors
socket.on('connect_error', (err) => {
  if (err.message === 'not authorized') {
    localStorage.removeItem('token');
    window.location.href = '../LOCATION/location.html';
  }
});

// Join the bus room after connecting
socket.on('connect', () => {
  socket.emit('joinBus', busNumber);
});

// Update header with bus number
document.getElementById('busHeader').textContent = `🚌 Bus No ${busNumber}`;
document.getElementById('busNumber').textContent = `Bus No: ${busNumber}`;

// Function to handle API errors
function handleApiError(error) {
  console.error('API Error:', error);
  document.getElementById('busRoute').textContent = 'Route: Error loading data';
  document.getElementById('lastUpdate').textContent = 'Last update: Error';
}

// Fetch bus data with authentication
function fetchBusData() {
  if (!checkAuth()) return;

  const token = getToken();
  fetch(`${API_BASE_URL}/api/buses/${busNumber}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '../LOCATION/location.html';
      return;
    }
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(result => {
    if (result && result.data && result.data.bus) {
      const bus = result.data.bus;
      document.getElementById('busRoute').textContent = `Route: ${bus.route || 'Not specified'}`;

      // Update contact links if driver info exists
      if (bus.driverId && typeof bus.driverId === 'object') {
        document.querySelector('a[href^="tel:"]').href = `tel:${bus.driverId.contact || '+917981321536'}`;
        document.querySelector('a[href^="sms:"]').href = `sms:${bus.driverId.contact || '+917981321536'}`;
      } else if (bus.contactNumber) {
        // Fallback to bus contact number if driver contact not available
        document.querySelector('a[href^="tel:"]').href = `tel:${bus.contactNumber}`;
        document.querySelector('a[href^="sms:"]').href = `sms:${bus.contactNumber}`;
      }
    } else {
      throw new Error('Bus data not found in response');
    }
  })
  .catch(error => {
    console.error('Error fetching bus data:', error);
    document.getElementById('busRoute').textContent = 'Route: Information not available';
    handleApiError(error);
  });
}

// Update the fetchLatestLocation function with authentication
function fetchLatestLocation() {
  if (!checkAuth()) return;

  const token = getToken();
  fetch(`${API_BASE_URL}/api/trackers/${busNumber}?limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '../LOCATION/location.html';
      return;
    }
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(result => {
    if (result && result.data && result.data.trackers && result.data.trackers.length > 0) {
      const lastLocation = result.data.trackers[0];
      updateBusPosition(lastLocation);
    } else {
      document.getElementById('lastUpdate').textContent = 'Last update: Waiting for first signal';
    }
  })
  .catch(error => {
    console.error('Error fetching location:', error);
    document.getElementById('lastUpdate').textContent = 'Last update: Signal lost';
  });
}

// Function to update bus position on map
function updateBusPosition(data) {
  const { latitude, longitude, speed, direction, timestamp } = data;

  // Update marker position
  busMarker.setLatLng([latitude, longitude]);

  // Update info panel
  document.getElementById('busSpeed').textContent = `Speed: ${speed ? speed.toFixed(1) + ' km/h' : 'N/A'}`;

  const now = new Date();
  const updateTime = new Date(timestamp);
  const secondsAgo = Math.floor((now - updateTime) / 1000);

  let timeText;
  if (secondsAgo < 60) {
    timeText = 'Just now';
  } else if (secondsAgo < 3600) {
    timeText = `${Math.floor(secondsAgo / 60)} minutes ago`;
  } else {
    timeText = `${Math.floor(secondsAgo / 3600)} hours ago`;
  }

  document.getElementById('lastUpdate').textContent = `Last update: ${timeText}`;

  // Rotate icon based on direction if available
  if (direction !== undefined) {
    busMarker.setIcon(L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/477/477103.png',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      rotationAngle: direction
    }));
  }

  // Center map on bus if it goes out of view
  map.setView([latitude, longitude], map.getZoom());
}

// Listen for real-time updates
socket.on('busLocation', (data) => {
  if (data.busNumber === busNumber) {
    updateBusPosition(data);
  }
});

// Highlight active footer item
function highlight(element) {
  if (!checkAuth()) return;
  
  document.querySelectorAll(".footer-item").forEach(item => {
    item.classList.remove("active");
  });
  element.classList.add("active");
}

// Initial fetch and periodic updates
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  
  fetchBusData();
  fetchLatestLocation();
  setInterval(fetchLatestLocation, 30000); // Check every 30 seconds
});