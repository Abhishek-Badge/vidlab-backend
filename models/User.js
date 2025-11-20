const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    UserId: req.body.UserId,
    UserName: req.body.UserName,
    Password: req.body.Password,
    Email: req.body.Email,
    Mobile: req.body.Mobile

})