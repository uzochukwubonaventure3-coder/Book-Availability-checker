const mongoose = require("mongoose");


const MessageSchema = new mongoose.Schema({
studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
name: String,
email: String,
message: String,
reply: { type: String, default: "" },
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Message", MessageSchema);