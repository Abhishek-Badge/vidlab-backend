const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
    CategoryName: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("Category", CategorySchema);
