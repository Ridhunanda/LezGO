// Add animation classes when elements come into view
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Animate elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.animate__animated');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                const animationClass = element.classList.item(1);
                if (!element.classList.contains(animationClass)) {
                    element.classList.add(animationClass);
                }
            }
        });
    };
    
    // Run on load and scroll
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
    
    // Navbar background change on scroll
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = 'rgba(20, 20, 21, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.backgroundColor = 'rgb(20, 20, 21)';
            navbar.style.boxShadow = 'none';
        }
    });
     // Load the header with profile functionality
     const headerContainer = document.getElementById('header-container');
     if (headerContainer) {
         fetch('header.html')
             .then(response => response.text())
             .then(data => {
                 headerContainer.innerHTML = data;
                 initializeProfile();
             });
     }
 
     // Profile initialization function
     function initializeProfile() {
         const userProfile = document.getElementById('user-profile');
         const currentUser = JSON.parse(localStorage.getItem('currentUser'));
         
         if (currentUser) {
             userProfile.innerHTML = `
                 <div class="profile-avatar" id="profileAvatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                 <div class="profile-dropdown" id="profileDropdown">
                     <a href="profile.html">My Profile</a>
                     <a href="bookings.html">My Bookings</a>
                     <a href="#" id="logout-btn">Logout</a>
                 </div>
             `;
             
             // Toggle dropdown
             document.getElementById('profileAvatar').addEventListener('click', function(e) {
                 e.stopPropagation();
                 document.getElementById('profileDropdown').classList.toggle('show-dropdown');
             });
             
             // Logout functionality
             document.getElementById('logout-btn').addEventListener('click', function(e) {
                 e.preventDefault();
                 localStorage.removeItem('currentUser');
                 window.location.href = 'homepage.html';
             });
         } else {
             userProfile.innerHTML = `
                 <a href="log.html" class="nav-link">Login</a>
                 <a href="register.html" class="btn btn-small">Register</a>
             `;
         }
 
         // Close dropdown when clicking outside
         document.addEventListener('click', function() {
             const dropdown = document.getElementById('profileDropdown');
             if (dropdown) {
                 dropdown.classList.remove('show-dropdown');
             }
         });
     }
 });
   