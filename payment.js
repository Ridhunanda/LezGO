document.addEventListener('DOMContentLoaded', function() {
    // Display booking details
    displayBookingDetails();
    
    // Handle payment form submission
    const paymentForm = document.getElementById('payment-form');
    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Process payment (in a real app, this would communicate with a payment gateway)
        processPayment();
    });
});

function displayBookingDetails() {
    const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    
    if (bookingData) {
        document.getElementById('paymentBookingId').textContent = bookingData.bookingId;
        document.getElementById('paymentAmount').textContent = `₹${bookingData.totalAmount}`;
    } else {
        // No booking data found, redirect back
        window.location.href = 'homepage.html';
    }
}

function processPayment() {
    // In a real application, this would communicate with a payment gateway
    // For demo purposes, we'll simulate a successful payment
    
    // Show loading state
    const submitBtn = document.querySelector('#payment-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Simulate API call
    setTimeout(() => {
        // Store payment confirmation
        const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
        const paymentData = {
            paymentId: 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            bookingId: bookingData.bookingId,
            amount: bookingData.totalAmount,
            status: 'completed',
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('paymentConfirmation', JSON.stringify(paymentData));
        
        // Redirect to thank you page
        window.location.href = 'thankyou.html';
    }, 2000);
}