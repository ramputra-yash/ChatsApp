const mongoose = require("mongoose");

const groupmessageschema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    createdAt: { type: Date, default: Date.now }
});
  
module.exports = mongoose.model("Groupmessage", groupmessageschema);