const API_BASE_URL = 'https://icb-trcking-backend.vercel.app/';
const socket = io(API_BASE_URL);

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
        window.location.href = '../HOME/home.html';
        return false;
    }
    return true;
}

async function fetchAndRenderBuses() {
    if (!checkAuth()) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/buses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.location.href = '../HOME/home.html';
            return;
        }

        const result = await response.json();

        // Extract the buses array from the response
        const buses = result.data?.buses || [];

        const container = document.getElementById('busContainer');
        container.innerHTML = '';

        if (buses.length) {
            buses.forEach(bus => {
                const statusClass = `status-${bus.currentStatus || 'active'}`;
                const statusText = bus.currentStatus === 'active' ? 'Active' :
                    bus.currentStatus === 'inactive' ? 'Inactive' : 'Maintenance';

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="status-indicator ${statusClass}" title="${statusText}"></div>
                    <div class="bus-number">BUS NO-${bus.busNumber}</div> 
                    <div class="route">
                        ${bus.route || 'Route not specified'}
                    </div>
                    <div class="icons">
                        <a href="tel:${bus.driverId?.contact || '+917981321536'}">
                            <i class="fas fa-phone"></i>
                        </a>
                        <a href="location.html?bus=${bus.busNumber}">
                            <i class="fas fa-map-marker-alt"></i>
                        </a>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<div class="card">No buses available</div>';
        }

        showUpdateNotification('Bus list updated');
    } catch (error) {
        console.error('Error fetching buses:', error);
        const container = document.getElementById('busContainer');
        container.innerHTML = '<div class="card">Error loading bus data</div>';
    }
}

// Show update notification
function showUpdateNotification(message) {
    const notification = document.getElementById('updateNotification');
    const updateTime = document.getElementById('updateTime');

    updateTime.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Highlight active footer item
function highlight(element) {
    if (!checkAuth()) return;
    
    document.querySelectorAll(".footer-item").forEach(item => {
        item.classList.remove("active");
    });
    element.classList.add("active");
}

// Listen for bus updates from server
socket.on('connect', () => {
    const token = getToken();
    if (token) {
        socket.emit('authenticate', { token });
    }
});

socket.on('busLocation', (data) => {
    showUpdateNotification(`Bus ${data.busNumber} location updated`);
});

socket.on('unauthorized', () => {
    localStorage.removeItem('token');
    window.location.href = 'studentlogin.html';
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    fetchAndRenderBuses();

    // Refresh bus list every 60 seconds
    setInterval(fetchAndRenderBuses, 60000);
});