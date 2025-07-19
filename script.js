let allVehicles = [];
let filteredVehicles = [];
let displayedVehicles = [];
let currentIndex = 0;
const batchSize = 36;

document.addEventListener("DOMContentLoaded", function () {
    // Debugging: Check if script is loading
    console.log("Script loaded and DOM ready");

    // Fetch vehicles
    fetch("http://localhost:4000/vehicles")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Vehicles data received:", data);
            allVehicles = data;
            filteredVehicles = [...allVehicles];
            loadMoreVehicles(); // Initial load
            
            // Debugging: Check if buttons exist
            console.log("Apply Filters button:", document.getElementById("apply-filters"));
            console.log("Reset Filters button:", document.getElementById("reset-filters"));
            
            // Add event listeners after data is loaded
            setupEventListeners();
        })
        .catch(error => {
            console.error("Error fetching vehicles:", error);
            // Display error to user
            document.getElementById("vehicle-list").innerHTML = 
                `<p class="error">Error loading vehicles. Please try again later.</p>`;
        });

    function setupEventListeners() {
        // Load More button
        const loadMoreBtn = document.getElementById("loadMoreBtn");
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener("click", loadMoreVehicles);
        }

        // Filter buttons
        const applyFiltersBtn = document.getElementById("apply-filters");
        const resetFiltersBtn = document.getElementById("reset-filters");
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener("click", applyFilters);
        }
        
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener("click", resetFilters);
        }
    }

    function applyFilters() {
        console.log("Applying filters...");
        
        const typeFilter = document.getElementById("vehicle_type").value;
        const transmissionFilter = document.getElementById("transmission").value;
        const fuelTypeFilter = document.getElementById("fuel_type").value;
        const priceFilter = document.getElementById("rental_price_per_day").value;
        const seatsFilter = document.getElementById("seats").value;
    
        console.log("Current filter values:", {
            typeFilter,
            transmissionFilter,
            fuelTypeFilter,
            priceFilter,
            seatsFilter
        });
    
        filteredVehicles = allVehicles.filter(vehicle => {
            console.log("Checking vehicle:", {
                id: vehicle.registration_number,
                type: vehicle.vehicle_type,
                transmission: vehicle.transmission,
                fuel: vehicle.fuel_type,
                price: vehicle.rental_price_per_day,
                seats: vehicle.seats
            });
    
            // Type filter (case insensitive)
            if (typeFilter !== 'all' && 
                vehicle.vehicle_type?.toLowerCase() !== typeFilter.toLowerCase()) {
                console.log("Failed type filter");
                return false;
            }
    
            // Transmission filter (case insensitive)
            if (transmissionFilter !== 'all' && 
                vehicle.transmission?.toLowerCase() !== transmissionFilter.toLowerCase()) {
                console.log("Failed transmission filter");
                return false;
            }
    
            // Fuel type filter (case insensitive)
            if (fuelTypeFilter !== 'all' && 
                vehicle.fuel_type?.toLowerCase() !== fuelTypeFilter.toLowerCase()) {
                console.log("Failed fuel type filter");
                return false;
            }
    
            // Price filter (handle decimal values)
            if (priceFilter !== 'all') {
                // Safely parse price even if it comes as formatted string
                const price = parseFloat(vehicle.rental_price_per_day.toString().replace(/[^\d.-]/g, '')) || 0;
                
                console.log(`Checking price ${price} against filter ${priceFilter}`);
                
                if (priceFilter.includes('-')) {
                    const [min, max] = priceFilter.split('-').map(Number);
                    if (price < min || price > max) {
                        console.log(`Price ${price} outside range ${min}-${max}`);
                        return false;
                    }
                } 
                else if (priceFilter.endsWith('+')) {
                    const minPrice = parseFloat(priceFilter);
                    if (price < minPrice) {
                        console.log(`Price ${price} below minimum ${minPrice}`);
                        return false;
                    }
                }
                else {
                    // Handle exact match case if needed
                    if (price !== parseFloat(priceFilter)) {
                        return false;
                    }
                }
            }
    
            // Seats filter (handle string/number conversion)
            if (seatsFilter !== 'all') {
                const vehicleSeats = vehicle.seats || "";
                
                
                if (seatsFilter === "7+ Seater") {
                    // Check if seats contains "7+" or similar
                    if (!vehicleSeats.includes("7+") && 
                        !vehicleSeats.includes("8") && 
                        !vehicleSeats.includes("9") && 
                        !vehicleSeats.includes("10")) {
                        console.log("Failed 7+ seats filter");
                        return false;
                    }
                } 
                else if (vehicleSeats !== seatsFilter) {
                    console.log("Failed seats filter");
                    return false;
                }
            }
            console.log("Vehicle passed all filters");
            return true;
        });
    
        console.log(`Found ${filteredVehicles.length} matching vehicles`);
        
        // Reset pagination
        currentIndex = 0;
        displayedVehicles = [];
        loadMoreVehicles();
    }
    function resetFilters() {
        console.log("Reset Filters clicked");
        
        document.getElementById("vehicle_type").value = "all";
        document.getElementById("transmission").value = "all";
        document.getElementById("fuel_type").value = "all";
        document.getElementById("rental_price_per_day").value = "all";
        document.getElementById("seats").value = "all";
        
        filteredVehicles = [...allVehicles];
        currentIndex = 0;
        displayedVehicles = [];
        loadMoreVehicles();
    }

    function loadMoreVehicles() {
        const nextBatch = filteredVehicles.slice(currentIndex, currentIndex + batchSize);
        displayedVehicles = [...displayedVehicles, ...nextBatch];
        currentIndex += batchSize;
        
        displayVehicles(displayedVehicles);
        updateLoadMoreButton();
    }

    function updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById("loadMoreBtn");
        if (loadMoreBtn) {
            loadMoreBtn.style.display = currentIndex >= filteredVehicles.length ? "none" : "block";
        }
    }

    function displayVehicles(vehicles) {
        const vehicleList = document.getElementById("vehicle-list");
        vehicleList.innerHTML = "";

        if (vehicles.length === 0) {
            vehicleList.innerHTML = "<p class='no-vehicles'>No vehicles found matching your filters</p>";
            return;
        }

        vehicles.forEach(vehicle => {
            const vehicleCard = document.createElement("div");
            vehicleCard.className = "vehicle-card";
            
            const manualImage = localStorage.getItem(`vehicle-image-${vehicle.registration_number}`);
            
            vehicleCard.innerHTML = `
                <div class="vehicle-image-container">
                    ${vehicle.image_url || manualImage ? 
                        `<img src="${manualImage || vehicle.image_url}" alt="${vehicle.make} ${vehicle.model}" class="vehicle-image">` :
                        `<div class="image-placeholder">No Image Available</div>`
                    }
                    <input type="file" class="image-upload-input" accept="image/*" style="display: none;">
                </div>
                <h3>${vehicle.make} ${vehicle.model}</h3>
                <p>Year: ${vehicle.year || "N/A"}</p>
                <p>Type: ${vehicle.vehicle_type || "N/A"}</p>
                <p>Fuel: ${vehicle.fuel_type || "N/A"}</p>
                <p>Seats: ${vehicle.seats || "N/A"}</p>
                <p>Transmission: ${vehicle.transmission || "N/A"}</p>
                <p>Price: ₹${vehicle.rental_price_per_day || "0"} /day</p>
                <button onclick="handleBooking('${vehicle.registration_number}')" class="btn btn-success">Book now</button>
            `;

            const uploadBtn = vehicleCard.querySelector('.btn-upload');
            const fileInput = vehicleCard.querySelector('.image-upload-input');
            const imageContainer = vehicleCard.querySelector('.vehicle-image-container');
            
            if (uploadBtn && fileInput) {
                uploadBtn.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            const img = imageContainer.querySelector('img') || document.createElement('img');
                            img.src = event.target.result;
                            img.className = 'vehicle-image';
                            img.alt = `${vehicle.make} ${vehicle.model}`;
                            
                            if (!imageContainer.querySelector('img')) {
                                const placeholder = imageContainer.querySelector('.image-placeholder');
                                if (placeholder) placeholder.replaceWith(img);
                            }
                            
                            localStorage.setItem(`vehicle-image-${vehicle.registration_number}`, event.target.result);
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
            
            vehicleList.appendChild(vehicleCard);
        });
    }
});

// Global function for booking
window.handleBooking = function(vehicleId) {
    const vehicle = allVehicles.find(v => v.registration_number === vehicleId);
    if (vehicle) {
        localStorage.setItem('selectedVehicle', JSON.stringify({
            make: vehicle.make,
            model: vehicle.model,
            type: vehicle.vehicle_type,
            fuel_type: vehicle.fuel_type,
            transmission: vehicle.transmission,
            rental_price_per_day: vehicle.rental_price_per_day,
            image_url: vehicle.image_url,
            registration_number: vehicle.registration_number,
            year: vehicle.year,
            seats: vehicle.seats
        }));
        window.location.href = 'customer_form.html';
    }
};