import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { chatbot } from './chatbot.js'; // Your enhanced chatbot function
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const server = http.createServer(app);

// --- 🔽 NEW: In-memory store for user conversation contexts ---
// We use a Map to associate a user's socket ID with their conversation history.
const userContexts = new Map();
// -------------------------------------------------------------

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🔗 A user connected:", socket.id);

  // --- 🔽 NEW: Create a new context for the connected user ---
  userContexts.set(socket.id, { history: [] });
  // ----------------------------------------------------------

  // Listen for user messages
  // The 'data' object should contain the message and any other relevant user info
  // e.g., { message: "I need blood", city: "Hyderabad", bloodGroup: "O+" }
  socket.on("userMessage", async (data) => {
    try {
      // --- 🔽 MODIFIED: Manage conversation context ---
      // 1. Get the specific context (with history) for this user.
      const userSession = userContexts.get(socket.id);

      // 2. Prepare the full context object to pass to the chatbot.
      // This combines the server-managed history with fresh data from the client.
      const fullContextForChatbot = {
          ...data, // Contains message, city, bloodGroup, etc. from client
          history: userSession.history // Contains the ongoing conversation
      };
      
      // 3. Call the chatbot with the message and the full context.
      // The chatbot will use the history and will also update it by reference.
      const reply = await chatbot(data.message, fullContextForChatbot);
      // ----------------------------------------------------

      socket.emit("botReply", reply); // Send response back
    } catch (err) {
      console.error("Chatbot Error:", err);
      socket.emit("botReply", { message: "❌ Error processing your request." });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    // --- 🔽 NEW: Clean up the user's context to prevent memory leaks ---
    userContexts.delete(socket.id);
    // -----------------------------------------------------------------
  });
});


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
// ... other routes

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server + connect DB
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_manager');
    server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();