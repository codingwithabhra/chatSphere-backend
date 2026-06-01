const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const Messages = require("./models/Message.model");
const { Server } = require("socket.io");
const User = require("./models/User.model");

dotenv.config();
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chat-sphere-5s7p.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: "https://chat-sphere-5s7p.vercel.app",
  methods: ["GET", "POST",],
  credentials: true,
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb connected"))
  .catch((error) => console.log(error));

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("ChatSphere backend is running 🚀");
});

// socket io logic
io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("send_message", async (data) => {
    const { sender, receiver, message } = data;
    const newMessage = new Messages({ sender, receiver, content: message });
    await newMessage.save();

    socket.broadcast.emit("receive_message", data);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

app.get("/messages", async (req, res) => {
  const { sender, receiver } = req.query;
  try {
    const messages = await Messages.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

app.get("/users", async (req, res) => {
  const { currentUser } = req.query;
  try {
    const users = await User.find({ username: { $ne: currentUser } });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching users" });
  }
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});