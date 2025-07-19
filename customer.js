document.addEventListener("DOMContentLoaded", function() {
    // Load vehicle details
    const selectedVehicle = JSON.parse(localStorage.getItem('selectedVehicle'));
    const vehicleSummary = document.getElementById('vehicle-details');
    
    if (selectedVehicle) {
        vehicleSummary.innerHTML = `
            <div class="vehicle-display">
                <h3>${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})</h3>
                <div class="vehicle-details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${selectedVehicle.type || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fuel:</span>
                        <span class="detail-value">${selectedVehicle.fuel_type || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Transmission:</span>
                        <span class="detail-value">${selectedVehicle.transmission || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Seats:</span>
                        <span class="detail-value">${selectedVehicle.seats || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Daily Rate:</span>
                        <span class="detail-value">₹${selectedVehicle.rental_price_per_day || '0'}</span>
                    </div>
                </div>
                ${selectedVehicle.image_url ? `
                <div class="vehicle-image">
                    <img src="${selectedVehicle.image_url}" alt="${selectedVehicle.make} ${selectedVehicle.model}">
                </div>` : ''}
            </div>
        `;
    } else {
        vehicleSummary.innerHTML = `
            <div class="no-vehicle-selected">
                <p>No vehicle selected. Please go back and select a vehicle first.</p>
                <a href="indexs.html" class="btn">Back to Vehicles</a>
            </div>
        `;
        return;
    }

    // Initialize error display
    const errorDisplay = document.getElementById('error-message') || createErrorDisplay();

    // Set up state and place selection
    setupLocationSelection();

    // Form submission handler
    document.getElementById('booking-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('.btn-submit');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing Booking...';
            errorDisplay.textContent = '';
            errorDisplay.style.display = 'none';
        
            // Validate required elements
            const requiredElements = {
                fullName: form.querySelector('#fullName'),
                email: form.querySelector('#email'),
                phone: form.querySelector('#phone'),
                pickupState: form.querySelector('#pickupState'),
                pickupPlace: form.querySelector('#pickupPlace'),
                dropoffState: form.querySelector('#dropoffState'),
                dropoffPlace: form.querySelector('#dropoffPlace'),
                pickupDate: form.querySelector('#pickupDate'),
                dropoffDate: form.querySelector('#dropoffDate'),
                paymentMethod: form.querySelector('#paymentMethod')
            };

            // Check elements exist
            for (const [key, element] of Object.entries(requiredElements)) {
                if (!element) throw new Error(`Form element ${key} not found`);
            }

            // Validate dates
            const pickupDate = new Date(requiredElements.pickupDate.value);
            const dropoffDate = new Date(requiredElements.dropoffDate.value);
            
            if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
                throw new Error('Please select valid pickup and dropoff dates');
            }
            
            if (dropoffDate <= pickupDate) {
                throw new Error('Dropoff date must be after pickup date');
            }
        
            // Calculate rental days and total amount
            const rentalDays = calculateDaysBetweenDates(pickupDate, dropoffDate);
            const totalAmount = rentalDays * selectedVehicle.rental_price_per_day;
            
            // Prepare booking data with calculated amount
            const bookingData = {
                vehicleId: selectedVehicle.registration_number,
                vehicleMake: selectedVehicle.make,
                vehicleModel: selectedVehicle.model,
                vehicleDailyRate: selectedVehicle.rental_price_per_day,
                rentalDays: rentalDays,
                customerName: requiredElements.fullName.value.trim(),
                customerEmail: requiredElements.email.value.trim(),
                customerPhone: requiredElements.phone.value.trim(),
                pickupState: requiredElements.pickupState.value.trim(),
                pickupPlace: requiredElements.pickupPlace.value.trim(),
                dropoffState: requiredElements.dropoffState.value.trim(),
                dropoffPlace: requiredElements.dropoffPlace.value.trim(),
                pickupDate: pickupDate.toISOString(),
                dropoffDate: dropoffDate.toISOString(),
                totalAmount: totalAmount,
                paymentMethod: requiredElements.paymentMethod.value
            };
        
            // Validate all fields
            for (const [key, value] of Object.entries(bookingData)) {
                if (!value && value !== 0) throw new Error(`Please fill in the ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            }
        
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(bookingData.customerEmail)) {
                throw new Error('Please enter a valid email address');
            }
        
            // Phone validation
            const phoneRegex = /^[0-9]{10,15}$/;
            if (!phoneRegex.test(bookingData.customerPhone)) {
                throw new Error('Please enter a valid phone number (10-15 digits)');
            }
        
            // Send booking request
            const response = await fetch('http://localhost:4000/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });
        
            const data = await response.json();
        
            if (!response.ok) {
                throw new Error(data.message || 'Booking request failed');
            }
        
            if (!data.success) {
                throw new Error(data.message || 'Booking could not be completed');
            }
        
            // Store complete booking confirmation data
            const confirmationData = {
                bookingId: data.bookingId,
                customerId: data.customerId,
                vehicle: selectedVehicle,
                pickupState: bookingData.pickupState,
                pickupPlace: bookingData.pickupPlace,
                dropoffState: bookingData.dropoffState,
                dropoffPlace: bookingData.dropoffPlace,
                pickupDate: bookingData.pickupDate,
                dropoffDate: bookingData.dropoffDate,
                rentalDays: rentalDays,
                dailyRate: selectedVehicle.rental_price_per_day,
                totalAmount: totalAmount,
                paymentMethod: bookingData.paymentMethod
            };
            
            localStorage.setItem('bookingConfirmation', JSON.stringify(confirmationData));
            
            // Redirect to confirmation page
            window.location.href = `confirmation.html?bookingId=${data.bookingId}`;
        
        } catch (error) {
            console.error('Booking Error:', error);
            errorDisplay.textContent = error.message;
            errorDisplay.style.display = 'block';
            errorDisplay.scrollIntoView({ behavior: 'smooth' });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Booking';
        }
    });
});

// Location selection functions
function setupLocationSelection() {
    // Set up event listeners for state changes
    document.getElementById('pickupState').addEventListener('change', function() {
        const state = this.value;
        if (state) {
            fetchLocations(state, 'pickupPlace');
        }
    });

    document.getElementById('dropoffState').addEventListener('change', function() {
        const state = this.value;
        if (state) {
            fetchLocations(state, 'dropoffPlace');
        }
    });

    // Load any existing location data from localStorage
    const locationData = JSON.parse(localStorage.getItem('locationData'));
    if (locationData) {
        document.getElementById('pickupState').value = locationData.pickupState;
        document.getElementById('dropoffState').value = locationData.dropoffState;
        
        // Trigger change events to load places
        if (locationData.pickupState) {
            fetchLocations(locationData.pickupState, 'pickupPlace', locationData.pickupLocation);
        }
        if (locationData.dropoffState) {
            fetchLocations(locationData.dropoffState, 'dropoffPlace', locationData.dropoffLocation);
        }
    }
}

async function fetchLocations(stateCode, targetElementId, selectedLocation = null) {
    try {
        const response = await fetch(`http://localhost:4000/getLocations/${stateCode}`);
        const locations = await response.json();
        
        const targetSelect = document.getElementById(targetElementId);
        
        // Clear existing options
        targetSelect.innerHTML = '<option value="">Select a Location</option>';
        
        // Add new options
        locations.forEach(location => {
            const option = new Option(location.location_name, location.location_name);
            targetSelect.add(option);
        });
        
        // Enable the select and set selected value if provided
        targetSelect.disabled = false;
        if (selectedLocation) {
            targetSelect.value = selectedLocation;
        }
        
    } catch (error) {
        console.error(`Error fetching locations for ${stateCode}:`, error);
        const targetSelect = document.getElementById(targetElementId);
        targetSelect.innerHTML = '<option value="">Error loading locations</option>';
    }
}

// Utility functions
function createErrorDisplay() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'error-message';
    errorDiv.style.display = 'none';
    errorDiv.style.color = 'red';
    errorDiv.style.margin = '10px 0';
    errorDiv.style.padding = '10px';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.borderRadius = '4px';
    document.querySelector('form').prepend(errorDiv);
    return errorDiv;
}

function calculateDaysBetweenDates(startDate, endDate) {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
    const diffDays = Math.ceil(Math.abs((endDate - startDate) / oneDay));
    return diffDays < 1 ? 1 : diffDays; // Ensure minimum 1 day rental
}