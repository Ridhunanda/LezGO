document.addEventListener('DOMContentLoaded', function() {
    // Display selected vehicle details
    displayVehicleDetails();
    
    // Handle form submission
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            pickupLocation: document.getElementById('pickupLocation').value,
            dropoffLocation: document.getElementById('dropoffLocation').value,
            pickupDate: document.getElementById('pickupDate').value,
            dropoffDate: document.getElementById('dropoffDate').value,
            paymentMethod: document.getElementById('paymentMethod').value,
            vehicleId: localStorage.getItem('selectedVehicleId')
        };
        
        // Submit data to server
        submitBooking(formData);
    });
});

function displayVehicleDetails() {
    const vehicleSummary = document.getElementById('vehicle-details');
    const selectedVehicle = JSON.parse(localStorage.getItem('selectedVehicle'));
    
    if (selectedVehicle) {
        vehicleSummary.innerHTML = `
            <div class="vehicle-card">
                <img src="${selectedVehicle.image}" alt="${selectedVehicle.name}">
                <div class="vehicle-info">
                    <h3>${selectedVehicle.name}</h3>
                    <p>Type: ${selectedVehicle.type}</p>
                    <p>Price: ₹${selectedVehicle.price}/day</p>
                    <p>Features: ${selectedVehicle.features.join(', ')}</p>
                </div>
            </div>
        `;
    }
}

async function submitBooking(formData) {
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Booking failed');
        }
        
        const bookingData = await response.json();
        
        // Store booking details for confirmation page
        localStorage.setItem('bookingConfirmation', JSON.stringify(bookingData));
        
        // Redirect to confirmation page
        window.location.href = 'confirmation.html';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Booking failed. Please try again.');
    }
}