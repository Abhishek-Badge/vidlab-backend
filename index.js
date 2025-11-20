require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');


const app = express();

// Middlewares
app.use(express.json());  // important to parse JSON
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// 🔹 Environment variables
const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;



// 🔹connect to MongoDB Atlas connection
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected Succesfully"))
    .catch(err => console.log("MongoDB Connection Error:", err));

/*======================MODELS ================================*/

// User Schema
const userSchema = new mongoose.Schema({
    UserId: { type: Number, unique: true },
    UserName: { type: String, required: true },
    Password: { type: String, required: true },
    Email: { type: String, required: true },
    Mobile: { type: String, required: true }
}, { collection: "tblusers" });
const User = mongoose.model("User", userSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
    CategoryId: { type: Number, unique: true },
    CategoryName: { type: String, required: true }
}, { collection: "tblcategories" });
const Category = mongoose.model("Category", categorySchema);

// Video Schema
const videoSchema = new mongoose.Schema({
    VideoId: { type: Number, unique: true },
    Title: { type: String, required: true },
    Url: { type: String, required: true },
    Description: { type: String, default: "" },
    Likes: { type: Number, default: 0 },
    Dislikes: { type: Number, default: 0 },
    Views: { type: Number, default: 0 },
    Comments: { type: [String], default: [] },
    CategoryId: { type: Number },
    CategoryName: { type: String },
    ChannelName: { type: String, default: "" }
}, { collection: "tblvideos" });
const Video = mongoose.model("Video", videoSchema);

// Reaction Schema
const reactionSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    videoId: { type: Number, required: true },
    reaction: { type: String, enum: ["like", "dislike"], required: true }
}, { collection: "tblreactions" });
// Ensure one reaction per user-video pair
reactionSchema.index({ userId: 1, videoId: 1 }, { unique: true });
const Reaction = mongoose.model("Reaction", reactionSchema);

/*================ADMIN Route ===========================*/

// Admin: hardcoded single admin login (username: 'admin', password: 'admin123')
// No schema/model needed since credentials are hardcoded.

// Admin route: return hardcoded admin credentials
app.get("/get-admin", async (req, res) => {
    res.json({ username: "admin", password: "admin123" });
});


/*===================== User Routes====================*/

// Register new user
app.post("/register-user", async (req, res) => {
    try {
        const { UserName, Password, Email, Mobile } = req.body;
        if (!UserName || !Password || !Email || !Mobile) {
            return res.status(400).json({ message: "All fields are required." });
        }
        // Auto-generate UserId
        const lastUser = await User.findOne().sort({ UserId: -1 }).exec();
        const newId = lastUser ? lastUser.UserId + 1 : 1;
        const newUser = new User({ UserId: newId, UserName, Password, Email, Mobile });
        await newUser.save();
        res.status(201).json({ message: "User registered." });
    } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all users
app.get("/get-users", async (req, res) => {
    try {
        const users = await User.find().exec();
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get user by UserId
app.get("/get-users/:userid", async (req, res) => {
    try {
        const userId = Number(req.params.userid);
        const user = await User.findOne({ UserId: userId }).exec();
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(user);
    } catch (err) {
        console.error("Error fetching user by ID:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Videos Liked by user
app.get("/users/:id/liked-videos", async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const reactions = await Reaction.find({ userId, reaction: "like" }).exec();
        const videoIds = reactions.map(r => r.videoId);
        const videos = await Video.find({ VideoId: { $in: videoIds } }).exec();
        res.json(videos);
    } catch (err) {
        console.error("Error fetching liked videos:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/*===================== CATEGORY ROUTES =============================*/

// Add category
app.post("/add-category", async (req, res) => {
    try {
        const name = String(req.body.CategoryName || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }
        // Case-insensitive check for duplicate name
        const exists = await Category.findOne({ CategoryName: name })
            .collation({ locale: 'en', strength: 2 })
            .exec();
        if (exists) {
            return res.status(409).json({ message: "Category name already exists." });
        }
        // Auto-generate CategoryId
        const lastCat = await Category.findOne().sort({ CategoryId: -1 }).exec();
        const newId = lastCat ? lastCat.CategoryId + 1 : 1;
        const newCategory = new Category({ CategoryId: newId, CategoryName: name });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (err) {
        console.error("Error adding category:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Categories
app.get("/get-categories", async (req, res) => {
    try {
        const categories = await Category.find().exec();
        res.json(categories);
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Category by Id
app.get("/get-categories/:id", async (req, res) => {
    try {
        const categoryId = Number(req.params.id);
        const category = await Category.findOne({ CategoryId: categoryId }).exec();
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.json(category);
    } catch (err) {
        console.error("Error fetching category by ID:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Edit category
app.put("/edit-category/:id", async (req, res) => {
    try {
        const categoryId = Number(req.params.id);
        const name = String(req.body.CategoryName || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }
        const exists = await Category.findOne({ CategoryName: name })
            .collation({ locale: 'en', strength: 2 })
            .exec();
        if (exists && exists.CategoryId !== categoryId) {
            return res.status(409).json({ message: "Category name already exists." });
        }
        const result = await Category.updateOne(
            { CategoryId: categoryId },
            { CategoryName: name }
        ).exec();
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.status(200).json({ CategoryId: categoryId, CategoryName: name });
    } catch (err) {
        console.error("Error editing category:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete category
app.delete("/delete-category/:id", async (req, res) => {
    try {
        const categoryId = Number(req.params.id);
        const result = await Category.deleteOne({ CategoryId: categoryId }).exec();
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.status(200).json({ message: "Category deleted." });
    } catch (err) {
        console.error("Error deleting category:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/*=====================Video routes========================*/

// Add new video
app.post("/add-video", async (req, res) => {
    try {
        // Auto-generate VideoId
        const lastVid = await Video.findOne().sort({ VideoId: -1 }).exec();
        const newId = lastVid ? lastVid.VideoId + 1 : 1;
        const videoData = {
            VideoId: newId,
            Title: String(req.body.Title || "").trim(),
            Url: String(req.body.Url || "").trim(),
            Description: String(req.body.Description || "").trim(),
            Likes: Number(req.body.Likes) || 0,
            Dislikes: Number(req.body.Dislikes) || 0,
            Views: Number(req.body.Views) || 0,
            Comments: Array.isArray(req.body.Comments) ? req.body.Comments : [],
            CategoryId: Number(req.body.CategoryId) || null,
            CategoryName: String(req.body.CategoryName || "").trim(),
            ChannelName: String(req.body.ChannelName || "").trim()
        };
        const newVideo = new Video(videoData);
        await newVideo.save();
        res.status(201).json(newVideo);
    } catch (err) {
        console.error("Error adding video:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all videos
app.get("/get-videos", async (req, res) => {
    try {
        const videos = await Video.find().exec();
        res.json(videos);
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Get video by VideoId
app.get("/get-videos/:id", async (req, res) => {
    try {
        const videoId = Number(req.params.id);
        const video = await Video.findOne({ VideoId: videoId }).exec();
        if (!video) {
            return res.status(404).json({ message: "Video not found." });
        }
        res.json(video);
    } catch (err) {
        console.error("Error fetching video by ID:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Edit video
app.put("/edit-video/:id", async (req, res) => {
    try {
        const videoId = Number(req.params.id);
        const videoData = {
            Title: req.body.Title,
            Url: req.body.Url,
            Description: req.body.Description,
            Likes: Number(req.body.Likes) || 0,
            Dislikes: Number(req.body.Dislikes) || 0,
            Views: Number(req.body.Views) || 0,
            Comments: Array.isArray(req.body.Comments)
                ? req.body.Comments
                : req.body.Comments
                    ? [req.body.Comments]
                    : [],
            CategoryId: Number(req.body.CategoryId) || null,
            CategoryName: req.body.CategoryName,
            ChannelName: req.body.ChannelName || ""
        };
        const result = await Video.updateOne({ VideoId: videoId }, videoData).exec();
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Video not found." });
        }
        res.status(200).json({ message: "Video updated." });
    } catch (err) {
        console.error("Error editing video:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete video
app.delete("/delete-video/:id", async (req, res) => {
    try {
        const videoId = Number(req.params.id);
        const result = await Video.deleteOne({ VideoId: videoId }).exec();
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Video not found." });
        }
        res.status(200).json({ message: "Video deleted." });
    } catch (err) {
        console.error("Error deleting video:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Filtering videos by CategoryId
app.get("/filter-videos/:categoryid", async (req, res) => {
    try {
        const categoryId = Number(req.params.categoryid);
        const videos = await Video.find({ CategoryId: categoryId }).exec();
        res.json(videos);
    } catch (err) {
        console.error("Error filtering videos:", err);
        res.status(500).json({ message: "Server error" });
    }
});

//  Hybrid Search: Title / CategoryName / ChannelName
app.get("/search-videos/:term", async (req, res) => {
    const term = String(req.params.term || "").trim();
    if (!term) {
        return res.json([]);
    }
    try {
        const regex = new RegExp(term, "i"); // case-insensitive
        const results = await Video.find({
            $or: [
                { Title: regex },
                { CategoryName: regex },
                { ChannelName: regex }
            ]
        }).exec();
        res.json(results);
    } catch (err) {
        console.error("Error searching videos:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Toggle reaction (like/dislike) on a video
app.post("/videos/:id/reaction", async (req, res) => {
    try {
        const videoId = Number(req.params.id);
        const userId = Number(req.body.userId);
        const reaction = req.body.reaction;
        if (!["like", "dislike"].includes(reaction)) {
            return res.status(400).json({ message: "Invalid reaction." });
        }
        // Check if reaction exists
        const existing = await Reaction.findOne({ userId, videoId }).exec();
        let deltaLike = 0, deltaDislike = 0;
        if (existing) {
            if (existing.reaction === reaction) {
                // Remove existing reaction
                await Reaction.deleteOne({ userId, videoId }).exec();
                if (reaction === "like") deltaLike = -1;
                if (reaction === "dislike") deltaDislike = -1;
            } else {
                // Switch reaction
                await Reaction.updateOne({ userId, videoId }, { reaction }).exec();
                if (reaction === "like") {
                    deltaLike = 1;
                    deltaDislike = -1;
                }
                if (reaction === "dislike") {
                    deltaLike = -1;
                    deltaDislike = 1;
                }
            }
        } else {
            // New reaction
            const newReaction = new Reaction({ userId, videoId, reaction });
            await newReaction.save();
            if (reaction === "like") deltaLike = 1;
            if (reaction === "dislike") deltaDislike = 1;
        }
        // Update video counts
        await Video.updateOne(
            { VideoId: videoId },
            { $inc: { Likes: deltaLike, Dislikes: deltaDislike } }
        ).exec();
        const updatedVideo = await Video.findOne({ VideoId: videoId }).exec();
        res.json(updatedVideo);
    } catch (err) {
        console.error("Error toggling reaction:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/*============================ SERVER =================================*/


app.listen(PORT, () => {
    console.log(`Server Started: http://127.0.0.1:${PORT}`);
});

