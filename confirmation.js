document.addEventListener('DOMContentLoaded', function() {
    // Display booking confirmation details
    displayConfirmationDetails();
    
    // Handle license verification button
    document.getElementById('proceedToPayment').addEventListener('click', async function() {
        try {
            const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
            if (!bookingData?.bookingId) {
                throw new Error('No booking data found');
            }

            // Update booking status to 'completed' in backend
            const response = await fetch(`http://localhost:4000/bookings/${bookingData.bookingId}/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to update booking status');
            }

            // Update local storage status
            updateBookingStatus('Completed');
            
            // Redirect to license page
            window.location.href = 'license_verification.html';
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}. Please try again.`);
        }
    });

    // Handle cancellation button click
    document.getElementById('cancelBooking').addEventListener('click', async function() {
        if(confirm('Are you sure you want to cancel this booking?')) {
            try {
                const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
                if (!bookingData?.bookingId) {
                    throw new Error('No booking data found');
                }

                // Update booking status to 'cancelled' in backend
                const response = await fetch(`http://localhost:4000/bookings/${bookingData.bookingId}/cancel`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || 'Failed to cancel booking');
                }

                // Remove booking data from localStorage
                localStorage.removeItem('bookingConfirmation');
                
                // Redirect to index.html
                window.location.href = 'indexs.html';
                
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}. Please try again.`);
            }
        }
    });
});


function displayConfirmationDetails() {
    const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    
    if (bookingData) {
        // Display basic booking info
        document.getElementById('bookingId').textContent = bookingData.bookingId;
        document.getElementById('customerId').textContent = bookingData.customerId || 'N/A';
        
        // Display vehicle information
        document.getElementById('vehicleId').textContent = bookingData.vehicle?.registration_number || 'N/A';
        
        // Display location information - using the correct property names
        document.getElementById('pickupPlace').textContent = 
            `${bookingData.pickupState || ''} - ${bookingData.pickupPlace || bookingData.pickupLocation || 'N/A'}`;
        
        document.getElementById('dropoffPlace').textContent = 
            `${bookingData.dropoffState || ''} - ${bookingData.dropoffPlace || bookingData.dropoffLocation || 'N/A'}`;
        
        // Format dates
        const pickupDate = new Date(bookingData.pickupDate);
        const dropoffDate = new Date(bookingData.dropoffDate);
        
        
        document.getElementById('pickupDate').textContent = pickupDate.toLocaleString();
        document.getElementById('dropoffDate').textContent = dropoffDate.toLocaleString();
        document.getElementById('totalAmount').textContent = `₹${bookingData.totalAmount || '0'}`;
        
    } else {
        // No booking data found, redirect back
        alert('No booking information found. Please start your booking again.');
        window.location.href = 'homepage.html';
    }
}
function updateBookingStatus(status) {
    const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    if (bookingData) {
        bookingData.booking_status = status;
        localStorage.setItem('bookingConfirmation', JSON.stringify(bookingData));
    }
}