import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { chatbot } from './chatbot.js';
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// const organiserRoutes = require('./routes/organiser.routes');
// const biddingRoutes = require('./routes/bidding.routes');
// const objectRoutes = require('./routes/object.routes');
// const taskRoutes = require('./routes/task.routes');

const app = express();
const server = http.createServer(app); // <-- ADDED: Create HTTP server from Express app

// Middleware
// Allow all origins
app.use(cors({
  origin: "*", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // allow cookies or Authorization headers
}));
app.use(express.json());       // Parse JSON bodies
app.use(morgan('dev'));        // Log HTTP requests

// Socket.IO setup
const io = new Server(server, { // <-- CHANGED: Pass the http server instance
  cors: {
    origin: "*", // React app
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🔗 A user connected:", socket.id);

  // Listen for user messages
  socket.on("userMessage", async (data) => {
    try {
      const { message} = data;
      const reply = await chatbot(message);
      socket.emit("botReply", reply); // Send response back
    } catch (err) {
      console.error("Chatbot Error:", err); // It's good practice to log the error
      socket.emit("botReply", { message: "❌ Error processing request." });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
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
    // <-- CHANGED: Use server.listen instead of app.listen
    server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();