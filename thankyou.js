document.addEventListener('DOMContentLoaded', function() {
    const paymentData = JSON.parse(localStorage.getItem('paymentConfirmation'));
    const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    
    if (paymentData && bookingData) {
        document.getElementById('thankyouBookingId').textContent = bookingData.bookingId;
        document.getElementById('paymentId').textContent = paymentData.paymentId;
        document.getElementById('paidAmount').textContent = `${paymentData.amount}`;
        
        // Clear booking data if needed
        // localStorage.removeItem('bookingConfirmation');
        // localStorage.removeItem('paymentConfirmation');
    } else {
        // No data found, redirect to home
        window.location.href = 'homepage.html';
    }
});

// Initialize jsPDF
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async function() {
    const paymentData = JSON.parse(localStorage.getItem('paymentConfirmation'));
    const bookingData = JSON.parse(localStorage.getItem('bookingConfirmation'));
    
    if (paymentData && bookingData) {
        // Display details
        document.getElementById('thankyouBookingId').textContent = bookingData.bookingId;
        document.getElementById('paymentId').textContent = paymentData.paymentId;
        document.getElementById('paidAmount').textContent = `${paymentData.amount}`;
        
        // Format payment date
        const paymentDate = new Date(paymentData.timestamp);
        document.getElementById('paymentDate').textContent = paymentDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        try {
            const response = await fetch('http://localhost:4000/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: paymentData.paymentId,
                    booking_id: bookingData.bookingId,
                    amount: paymentData.amount,
                    payment_date: paymentData.timestamp,
                    payment_method: bookingData.paymentMethod || 'Online'
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                console.error('Payment failed:', result);
                alert(`Payment failed: ${result.details || result.error || 'Unknown error'}`);
                // Optionally retry or show help instructions
            } else {
                console.log('Payment success:', result);
                // Proceed with receipt generation
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error. Please check your connection and try again.');
        }
        
        // Set up receipt download
        document.getElementById('downloadReceipt').addEventListener('click', function() {
            generateReceiptPDF(bookingData, paymentData);
        });
    } else {
        // No data found, redirect to home
        window.location.href = 'homepage.html';
    }
});

function generateReceiptPDF(bookingData, paymentData) {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add logo
    doc.setFontSize(22);
    doc.setTextColor(40, 167, 69);
    doc.text('LezGO', 105, 20, { align: 'center' });
    
    // Add receipt title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('BOOKING RECEIPT', 105, 30, { align: 'center' });
    
    // Add receipt details
    doc.setFontSize(10);
    doc.text(`Receipt No: ${paymentData.paymentId}`, 14, 40);
    doc.text(`Date: ${new Date(paymentData.timestamp).toLocaleDateString()}`, 14, 45);
    
    // Add line separator
    doc.setDrawColor(40, 167, 69);
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);
    
    
    // Add booking details
    doc.setFontSize(12);
    doc.text('BOOKING DETAILS', 14, 90);
    doc.setFontSize(10);
    
    // Format dates
    const pickupDate = new Date(bookingData.pickupDate);
    const dropoffDate = new Date(bookingData.dropoffDate);
    
    // Create booking details table
    doc.autoTable({
        startY: 95,
        head: [['Description', 'Details']],
        body: [
            ['Booking ID', bookingData.bookingId || 'N/A'],
            ['Vehicle', bookingData.vehicle?.registration_number || 'N/A'],
            ['Pickup Location', bookingData.pickupPlace || 'Not specified'],
            ['Dropoff Location', bookingData.dropoffPlace || 'Same as pickup'],
            ['Pickup Date', pickupDate.toLocaleString()],
            ['Dropoff Date', dropoffDate.toLocaleString()],
            ['Payment Method', bookingData.paymentMethod || paymentData.method || 'Not specified']
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [40, 167, 69],
            textColor: [255, 255, 255]
        },
        margin: { left: 14 }
    });

  // Fix: Properly parse and handle payment amounts
  const amount = parseFloat(bookingData.totalAmount) || 0;
  const tax = parseFloat((amount * 0.18).toFixed(2));
  const total = parseFloat((amount * 1.18).toFixed(2));

     // Add payment details
     doc.setFontSize(12);
     doc.text('PAYMENT DETAILS', 14, doc.autoTable.previous.finalY + 15);

  // Create payment table with proper number formatting
  doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Item', 'Amount (₹)']],
      body: [
          ['Booking Amount', amount.toFixed(2)],
          ['Tax (18%)', tax.toFixed(2)],
          ['Total Amount', total.toFixed(2)]
      ],
      theme: 'grid',
      headStyles: {
          fillColor: [40, 167, 69],
          textColor: [255, 255, 255]
      },
      margin: { left: 14 },
      columnStyles: {
          1: { halign: 'right' }
      }
  });

    
    // Add thank you message
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing LezGO!', 105, doc.autoTable.previous.finalY + 20, { align: 'center' });
    doc.text('For any queries, please contact support@lezgo.com', 105, doc.autoTable.previous.finalY + 25, { align: 'center' });
    
    // Add footer
    doc.setFontSize(8);
    doc.text('This is a computer generated receipt. No signature required.', 105, 285, { align: 'center' });
    
    // Save the PDF
    doc.save(`LezGO_Receipt_${paymentData.paymentId}.pdf`);
}
