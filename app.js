const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/indexRoutes');
const chatRoutes = require('./routes/chat')
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const Message = require('./models/Message'); // Import Message model
const GroupMessage = require('./models/GroupMessage')
const Group = require('./models/Group');
const { ObjectId } = require('mongodb');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware for session management and authentication
const session = require('express-session');
const passport = require('./config/authGoogle'); // Google Auth Config

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
const connectToDB = require('./config/db');
const { default: mongoose } = require('mongoose');
connectToDB();

app.use(cookieParser())

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes)

// Socket.io Connection
const users = {}; // 🔹 Store users' socket IDs
const lastSeenMap = {};    // { userId: Date }

io.use((socket, next) => {
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) return next(new Error("No auth token"));

    const parsedCookies = cookie.parse(cookies);
    const token = parsedCookies.token;

    if (!token) return next(new Error("Authentication token missing"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Invalid token"));

        socket.user = decoded; // Attach user info to socket
        users[decoded.id] = socket.id; // ✅ Store user socket ID
        next();
    });
});


io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-connected", (userId) => {
        socket.userId = userId;
        users[userId] = socket.id; // ✅ Use correct map

        console.log(`✅ User ${userId} connected with socket ${socket.id}`);
        io.emit("user-online", userId);
    });

    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
        console.log("Message received:", { senderId, receiverId, content });

        try {
            if (!senderId || !receiverId || !content) {
                return socket.emit("error", { message: "senderId, receiverId, and content are required!" });
            }

            const message = await Message.create({ senderId, receiverId, message: content });
            console.log("Message saved:", message);

            const receiverSocketId = users[receiverId]; // ✅ Fix here
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receiveMessage", message);
            }
        } catch (error) {
            console.error("Error saving message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    socket.on('join-group', async ({ groupId, userId }) => {
        const group = await Group.findById(groupId);
        if (group && group.members.includes(userId)) {
            socket.join(groupId);
            console.log(`User ${userId} joined group ${groupId}`);
        } else {
            socket.emit('error', 'Not authorized to join this group');
        }
    });

    socket.on('send-message', async ({ groupId, userId, content }) => {
        const newMessage = new GroupMessage({
            group: new ObjectId(groupId),
            sender: new ObjectId(userId),
            text: content
        });
        await newMessage.save();
        io.to(groupId).emit('receive-message', {
            sender: userId,
            text: content,
            timestamp: newMessage.createdAt
        });
    });

    // ✅ Fix typing event — use correct map
    socket.on("typing", ({ sender, receiver }) => {
        const receiverSocket = users[receiver]; // ✅ Corrected this
        if (receiverSocket) {
            io.to(receiverSocket).emit("displayTyping", sender);
        }
    });



    socket.on('initiate-call', ({to, from}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('incoming-call', { from });
    })

    socket.on('cencel-call', ({from, to}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('call-cencelled', ({ from }))
    })

    socket.on('call-reject', ({to, from}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('call-rejected', ({ from }));
    })

    socket.on('call-accept', ({to, from}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('call-accepted', ({ from }));
    })



    // webrtc code


    // recieving ice-candidate
    socket.on('ice-candidate', ({ candidate, to, from }) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('ice-candidate', ({ candidate, from}))
    })

    // recieving offer
    socket.on('offer', ({offer, to, from}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('offer', ({ offer, from }))
    })

    // recieving answer
    socket.on('answer', ({answer, to, from}) => {
        const toSocketId = users[to];
        socket.to(toSocketId).emit('answer', ({answer, from}))
    })

    socket.on("disconnect", () => {
        const userId = socket.userId;
        if (userId) {
            delete users[userId]; // ✅ Use correct map

            const lastSeen = new Date().toISOString();
            console.log(`❌ User ${userId} disconnected at ${lastSeen}`);
            io.emit("user-offline", { userId, lastSeen });
        }
    });
});



const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => console.log(`Server running on port//${HOST}:${PORT}`));