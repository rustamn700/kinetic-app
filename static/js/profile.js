/**
 * Profile Management Module
 * Handles dropdown toggles, fetching user data, and logout.
 */

const API_URL = "https://kinetic-fp1n.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

function initProfile() {
    const profileBtn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');

    // Toggle Dropdown
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    loadUserData();
}

async function loadUserData() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL_PROFILE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const user = await res.json();
            
            // Update Dropdown UI
            document.getElementById('dropName').innerText = user.username || "User";
            document.getElementById('dropEmail').innerText = user.email || "";
            document.getElementById('dropGoal').innerText = user.daily_goal || 2500;
            
            // Update Profile Icon Initials
            const initial = (user.username || "U").charAt(0).toUpperCase();
            document.getElementById('navUserInitials').innerText = initial;
            
            // Save goal globally for dashboard usage if needed
            window.userDailyGoal = user.daily_goal || 2500;
        } else {
            console.error("Failed to load user data");
        }
    } catch (e) {
        console.error("Profile Error:", e);
    }
}

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = 'login.html';
}

// Экспорт для использования в других модулях если нужно
window.loadUserData = loadUserData;
window.logout = logout;