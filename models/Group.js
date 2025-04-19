const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Message sender
      content: { type: String, required: true }, // ✅ Message content
      timestamp: { type: Date, default: Date.now } // ✅ Time of message
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Group", groupSchema);