const express = require("express");
const mysql = require('mysql2/promise');
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const expressSession = require('express-session');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Create a connection pool
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Vehrenweb@2025",
    database: "vrw",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log("✅ Connected to MySQL database");
        connection.release();
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err);
    });

// Authentication middleware
function checkAuth(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized - Please login first" });
}

// ================== ROUTES ================== //

// Home route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

// User registration
app.post("/register", async (req, res) => {
    const { fullname, email, password } = req.body;
    
    if (!fullname || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            "INSERT INTO Users (fullname, email, password) VALUES (?, ?, ?)",
            [fullname, email, hashedPassword]
        );
        
        res.status(201).json({ 
            message: "User registered successfully!",
            userId: result.insertId 
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

// User login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    try {
        const [results] = await pool.execute(
            "SELECT * FROM Users WHERE email = ?",
            [email]
        );

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            req.session.user = {
                id: user.id,
                email: user.email,
                fullname: user.fullname
            };
            res.json({ 
                message: "Login successful",
                user: {
                    id: user.id,
                    email: user.email,
                    fullname: user.fullname
                }
            });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
});

// Booking endpoint with proper connection handling
app.post('/bookings', async (req, res) => {
    let connection;
    try {
      // Get a connection from the pool
      connection = await pool.getConnection();
  
      // Begin transaction
      await connection.beginTransaction();
  
      // Validate required fields
      const requiredFields = [
        'vehicleId', 'customerName', 'customerEmail', 'customerPhone',
        'pickupState', 'pickupPlace', 'dropoffState', 'dropoffPlace',
        'pickupDate', 'dropoffDate', 'paymentMethod'
    ];
    
      
      const missingFields = requiredFields.filter(field => !req.body[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
  
      // Process customer information
      const [customerResult] = await connection.execute(
        `INSERT INTO customer (Name, Email, Phone)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE CustomerID=LAST_INSERT_ID(CustomerID)`,
        [req.body.customerName, req.body.customerEmail, req.body.customerPhone]
      );
      const customerId = customerResult.insertId;
  
      // Verify vehicle exists
      const [vehicleResults] = await connection.execute(
        `SELECT vehicle_id, rental_price_per_day 
         FROM vehicles 
         WHERE registration_number = ?`,
        [req.body.vehicleId]
      );
  
      if (vehicleResults.length === 0) {
        throw { status: 404, message: 'Specified vehicle not found' };
      }
  
      const vehicleId = vehicleResults[0].vehicle_id;
      const pricePerDay = vehicleResults[0].rental_price_per_day;
  
      // Calculate rental duration
      const pickupDate = new Date(req.body.pickupDate);
      const dropoffDate = new Date(req.body.dropoffDate);
      
      if (dropoffDate <= pickupDate) {
        throw { status: 400, message: 'Dropoff date must be after pickup date' };
      }
  
      const rentalDays = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24));
      const totalAmount = rentalDays * pricePerDay;
  
      // Create the booking
      const [bookingResult] = await connection.execute(
        `INSERT INTO booking (
            CustomerID, VehicleID, 
            PickupLocation, pickup_place,
            DropoffLocation, dropoff_place,
            PickupDate, DropoffDate, TotalAmount, 
            BookingStatus, PaymentStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending')`,
        [
            customerId,
            vehicleId,
            req.body.pickupState,
            req.body.pickupPlace,
            req.body.dropoffState,
            req.body.dropoffPlace,
            pickupDate,
            dropoffDate,
            totalAmount
        ]
    );
  
      // Commit transaction
      await connection.commit();
  
      // Return success response
      return res.json({
        success: true,
        bookingId: bookingResult.insertId,
        customerId: customerId,
        totalAmount: totalAmount,
        rentalDays: rentalDays,
        message: 'Booking successfully created'
    });
  
    } catch (error) {
      // Rollback transaction if there was an error
      if (connection) await connection.rollback();
      
      console.error('Booking Error:', {
        message: error.message,
        sqlMessage: error.sqlMessage,
        stack: error.stack,
        body: req.body
      });
  
      const statusCode = error.status || 500;
      const errorMessage = error.sqlMessage 
        ? `Database error: ${error.sqlMessage}`
        : error.message || 'An unexpected error occurred';
  
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    } finally {
      // Release connection back to pool
      if (connection) connection.release();
    }
  });
  app.put('/bookings/:bookingId/complete', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. First get the booking details
        const [bookingRows] = await connection.execute(
            `SELECT VehicleID, BookingStatus 
             FROM booking 
             WHERE BookingID = ? 
             FOR UPDATE`,  // Lock row for update
            [req.params.bookingId]
        );

        if (bookingRows.length === 0) {
            throw new Error('Booking not found');
        }

        const booking = bookingRows[0];  // Get the first row

        // 2. Validate current status
        if (booking.BookingStatus === 'Completed') {
            throw new Error('Booking is already completed');
        }

        // 3. Update booking status (using capitalized value)
        await connection.execute(
            `UPDATE booking 
             SET BookingStatus = 'Completed'
             WHERE BookingID = ?`,
            [req.params.bookingId]
        );

        // 4. Update vehicle status
        await connection.execute(
            `UPDATE vehicles 
             SET status = 'Unavailable' 
             WHERE vehicle_id = ?`,
            [booking.VehicleID]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Booking completed successfully',
            updated: {
                bookingId: req.params.bookingId,
                vehicleId: booking.VehicleID,
                newStatus: 'Completed'
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Completion Error:', {
            message: error.message,
            bookingId: req.params.bookingId,
            stack: error.stack
        });
        res.status(400).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                error: error.message,
                stack: error.stack
            } : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// Cancel booking endpoint
app.put('/bookings/:bookingId/cancel', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Update booking status to 'cancelled'
        const [result] = await connection.execute(
            `UPDATE booking 
             SET BookingStatus = 'Cancelled'
             WHERE BookingID = ?`,
            [req.params.bookingId]
        );

        // Update vehicle status to 'available'
        await connection.execute(
            `UPDATE vehicles v
             JOIN booking b ON v.vehicle_id = b.VehicleID
             SET v.status = 'Available'
             WHERE b.BookingID = ?`,
            [req.params.bookingId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            bookingId: req.params.bookingId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error cancelling booking:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel booking'
        });
    } finally {
        if (connection) connection.release();
    }
});
  

// Vehicles routes
app.get("/vehicles", async (req, res) => {
    const { fuelType, transmission, vehicleType, priceRange } = req.query;

    let sql = `
        SELECT v.registration_number, v.make, v.model, v.year, v.vehicle_type, v.status, 
               v.rental_price_per_day, v.image_url, v.fuel_type, v.seats, v.transmission
        FROM vehicles v
        WHERE v.status = 'Available'`; 
    const params = [];

    if (fuelType) {
        sql += " AND v.fuel_type = ?";
        params.push(fuelType);
    }
    if (transmission) {
        sql += " AND v.transmission = ?";
        params.push(transmission);
    }
    if (vehicleType) {
        sql += " AND v.vehcile_type = ?";
        params.push(vehicleType);
    }
    if (priceRange) {
        if (priceRange === "5000+") {
            sql += " AND v.rental_price_per_day > 5000";
        } else {
            const [min, max] = priceRange.split("-");
            sql += " AND v.rental_price_per_day BETWEEN ? AND ?";
            params.push(min, max);
        }
    }

    try {
        const [results] = await pool.query(sql, params);

        if (results.length === 0) {
            return res.status(404).json({ message: "No vehicles found" });
        }

        const formattedResults = results.map(vehicle => ({
            ...vehicle,
            image_url: `/images/${vehicle.image_url}`
        }));

        res.json(formattedResults);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Locations route
app.get("/getLocations/:state", async (req, res) => {
    const state = req.params.state;

    if (!state) {
        return res.status(400).json({ error: "State parameter is required" });
    }

    try {
        const [results] = await pool.query(
            `SELECT location_name, location_type 
             FROM service_locations 
             WHERE state = ?`,
            [state]
        );
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


app.post('/api/payments', async (req, res) => {
    console.log('Incoming payment data:', req.body);
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { payment_id, booking_id, amount, payment_date, payment_method } = req.body;

        // Validate required fields
        if (!payment_id || !booking_id || !amount || !payment_date) {
            throw new Error('Missing required fields');
        }

        // Convert to MySQL datetime format
        const formattedDate = new Date(payment_date).toISOString().slice(0, 19).replace('T', ' ');
        
        console.log('Formatted payment date:', formattedDate);

        const [result] = await connection.query(
            `INSERT INTO payments (
                payment_id, 
                BookingID, 
                amount, 
                payment_date, 
                payment_method,
                status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                payment_id,
                parseInt(booking_id),
                amount,
                formattedDate,
                payment_method || 'Online',
                'completed'
            ]
        );

        await connection.commit();
        
        console.log('Insert result:', result);
        res.status(201).json({ success: true });
    } catch (error) {
        if (connection) await connection.rollback();
        
        console.error('Full error:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Duplicate payment ID' });
        }
        
        res.status(500).json({ 
            error: 'Database operation failed',
            details: error.message,
            code: error.code
        });
    } finally {
        if (connection) connection.release();
    }
});


// Add to your server.js
app.post('/api/verify-license', async (req, res) => {
    let connection;
    try {
        const { customerId, licenseNo, dateOfBirth } = req.body;

        // Validate input
        if (!customerId || !dateOfBirth) {
            return res.status(400).json({ 
                success: false,
                message: 'Customer ID and date of birth are required'
            });
        }

        connection = await pool.getConnection();
        
        // Check if customer exists
        const [customer] = await connection.execute(
            'SELECT CustomerID FROM customer WHERE CustomerID = ?',
            [customerId]
        );

        if (customer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Insert verification data
        const [result] = await connection.execute(
            `INSERT INTO customer_verification 
             (CustomerID, licenseNo, dateOfBirth) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                licenseNo = VALUES(licenseNo),
                dateOfBirth = VALUES(dateOfBirth)`,
            [customerId, licenseNo || null, dateOfBirth]
        );

        res.json({
            success: true,
            verificationId: result.insertId
        });

    } catch (error) {
        console.error('License Verification Error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This license number is already registered'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error processing license verification'
        });
    } finally {
        if (connection) connection.release();
    }
});


// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        // You could try another port here if desired
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

