require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
// const organiserRoutes = require('./routes/organiser.routes');
// const biddingRoutes = require('./routes/bidding.routes');
// const objectRoutes = require('./routes/object.routes');


//const authRoutes = require('./routes/auth.routes');
// const taskRoutes = require('./routes/task.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
  // Allow all origins

  app.use(cors({
  origin: "http://localhost:5173", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // allow cookies or Authorization headers
}));
app.use(express.json());         // Parse JSON bodies
app.use(morgan('dev'));          // Log HTTP requests

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API is running' });
});

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/organisers', organiserRoutes);
// app.use('/api/biddings', biddingRoutes);
// app.use('/api/objects', objectRoutes);


// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server + connect DB
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_manager');
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();
console.log("dsf")
