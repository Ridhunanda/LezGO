document.addEventListener("DOMContentLoaded", function() {
    // Check if localStorage is available
    if (!window.localStorage) {
        console.error('LocalStorage is not available in this browser');
        showError('This browser is not supported. Please use a modern browser.');
        return;
    }

    const form = document.getElementById('verification-form');
    const errorDisplay = document.getElementById('error-message');
    
    // Safely get booking data from localStorage
    let bookingData;
    try {
        bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    } catch (e) {
        console.error('Error parsing booking data:', e);
        showError('Invalid booking data. Please start over.');
        return;
    }

    // Validate booking data exists
    if (!bookingData || !bookingData.customerId) {
        showError('No booking information found. Please complete your booking first.');
        return;
    }

    // Set max date for 21 years ago
    try {
        const today = new Date();
        const maxDobDate = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate());
        const dobInput = document.getElementById('dateOfBirth');
        if (dobInput) {
            dobInput.max = maxDobDate.toISOString().split('T')[0];
        } else {
            console.error('Date of Birth input field not found');
        }
    } catch (e) {
        console.error('Error setting max date:', e);
    }

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            showError('Please fill out all required fields correctly');
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        const licenseNo = form.licenseNo.value.trim();
        const dateOfBirth = form.dateOfBirth.value;

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';
            hideError();

            // Validate license format
            const licenseRegex = /^[A-Z]{2}[0-9]{2}[0-9]{11}$/;
            if (!licenseRegex.test(licenseNo)) {
                throw new Error('Invalid license format. Example: DL0120211234567 (2 letters + 2 digits + 11 digits)');
            }

            // Validate date of birth exists
            if (!dateOfBirth) {
                throw new Error('Please enter your date of birth');
            }

            // Validate age
            if (!validateAge(dateOfBirth)) {
                throw new Error('You must be at least 21 years old to rent a vehicle');
            }

            // Send verification data to server
            const response = await fetch('http://localhost:4000/api/verify-license', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerId: bookingData.customerId,
                    licenseNo: licenseNo,
                    dateOfBirth: dateOfBirth
                })
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const result = await response.json();

            // Store verification data
            try {
                localStorage.setItem('verificationData', JSON.stringify({
                    licenseNo: licenseNo,
                    dateOfBirth: dateOfBirth,
                    verifiedAt: new Date().toISOString()
                }));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
                // Continue despite localStorage error
            }

            // Redirect to payment page
            window.location.href = 'payment.html';

        } catch (error) {
            console.error('Verification Error:', error);
            showError(error.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Complete Verification';
        }
    });

    // Helper functions
    function validateAge(dateString) {
        try {
            const dob = new Date(dateString);
            if (isNaN(dob.getTime())) return false;
            
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            return age >= 21;
        } catch (e) {
            console.error('Error validating age:', e);
            return false;
        }
    }

    function showError(message) {
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    function hideError() {
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }
});