var mongoClient = require("mongodb").MongoClient;
var express = require("express");
var cors = require("cors");

var app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

var connectionString = "mongodb://127.0.0.1:27017";


//  Ensure unique index for categories (runs at startup)

async function ensureIndexes() {
    const connectionObject = await mongoClient.connect(connectionString);
    const db = connectionObject.db("vidlab");

    try {
        await db.collection("tblcategories").createIndex(
            { CategoryName: 1 },
            { unique: true, collation: { locale: "en", strength: 2 } }
        );
        console.log("✅ Unique index on CategoryName ensured.");
    } catch (err) {
        console.warn("⚠️ Could not create index:", err.message);
    } finally {
        await connectionObject.close();
    }
}

// 🔹 Call it immediately at startup
ensureIndexes();

// <============ Videos CRUD ================>//

// Get all Admins
app.get('/get-admin', (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tbladmin").find({}).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get all Users
app.get("/get-users", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblusers").find({}).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get all Categories
app.get("/get-categories", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblcategories").find({}).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get all Videos
app.get("/get-videos", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblvideos").find({}).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get Video Based on User ID
app.get("/get-users/:userid", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblusers").find({ UserId: req.params.userid }).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get Category Id based on his Specific ID
app.get("/get-categories/:id", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblcategories").find({ CategoryId: parseInt(req.params.id) }).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Get Video Based on Video ID
app.get("/get-videos/:id", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblvideos").find({ VideoId: parseInt(req.params.id) }).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// Filtering Videos by Category
app.get("/filter-videos/:categoryid", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblvideos").find({ CategoryId: parseInt(req.params.categoryid) }).toArray().then(documents => {
            res.send(documents);
            res.end();
        });
    });
});

// 🔍 Hybrid Search: category / channel / title
app.get("/search-videos/:term", async (req, res) => {
    const raw = String(req.params.term || "").trim();
    if (!raw) return res.json([]);

    try {
        const connectionObject = await mongoClient.connect(connectionString);
        const db = connectionObject.db("vidlab");
        const videosCol = db.collection("tblvideos");

        const regex = new RegExp(raw, "i");   //Case-insensitive partial match

        // Match ANY of title / Category/ channel

        const results = await videosCol.find({
            $or: [
                { Title: regex },
                { CategoryName: regex },
                { ChannelName: regex }
            ]
        }).toArray();


        await connectionObject.close();

        res.json(results);
    } catch (err) {
        console.error("search-videos error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// User Can Register
app.post("/register-user", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");

        var user = {
            UserId: req.body.UserId,
            UserName: req.body.UserName,
            Password: req.body.Password,
            Email: req.body.Email,
            Mobile: req.body.Mobile
        };

        database.collection("tblusers").insertOne(user).then(() => {
            console.log(`User Registered`);
            res.end();
        });
    });
});

// Add Category
app.post("/add-category", async (req, res) => {
    const connectionObject = await mongoClient.connect(connectionString);
    const db = connectionObject.db("vidlab");

    try {
        const name = String(req.body.CategoryName || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }

        // 🔹 Case-insensitive check for duplicate name
        const exists = await db.collection("tblcategories").findOne(
            { CategoryName: name },
            { collation: { locale: "en", strength: 2 } } // strength:2 = case-insensitive
        );

        if (exists) {
            return res.status(409).json({ message: "Category name already exists." });
        }

        // 🔹 Auto-generate next CategoryId
        const last = await db.collection("tblcategories")
            .find({})
            .sort({ CategoryId: -1 })
            .limit(1)
            .toArray();
        const newId = last.length ? (Number(last[0].CategoryId) + 1) : 1;

        const category = { CategoryId: newId, CategoryName: name };
        await db.collection("tblcategories").insertOne(category);

        res.status(201).json(category);
    } catch (err) {
        console.error("add-category error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        await connectionObject.close();
    }
});





//  Add Video

app.post("/add-video", async (req, res) => {
    const connectionObject = await mongoClient.connect(connectionString);
    const db = connectionObject.db("vidlab");

    try {
        // auto-generate VideoId
        const last = await db.collection("tblvideos")
            .find({})
            .sort({ VideoId: -1 })
            .limit(1)
            .toArray();
        const newId = last.length ? (Number(last[0].VideoId) + 1) : 1;

        const video = {
            VideoId: newId,
            Title: String(req.body.Title || "").trim(),
            Url: String(req.body.Url || "").trim(),
            Description: String(req.body.Description || "").trim(),
            Likes: Number(req.body.Likes) || 0,
            Dislikes: Number(req.body.Dislikes) || 0,
            Views: Number(req.body.Views) || 0,
            Comments: Array.isArray(req.body.Comments) ? req.body.Comments : [],
            CategoryId: Number(req.body.CategoryId),
            CategoryName: String(req.body.CategoryName || "").trim(),
            ChannelName: String(req.body.ChannelName || "").trim()
        };

        await db.collection("tblvideos").insertOne(video);
        res.status(201).json(video);
    } catch (err) {
        console.error("add-video error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        await connectionObject.close();
    }
});



// Edit Category
app.put("/edit-category/:id", async (req, res) => {
    const connectionObject = await mongoClient.connect(connectionString);
    const db = connectionObject.db("vidlab");

    try {
        const id = Number(req.params.id);
        const name = String(req.body.CategoryName || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }

        // 🔹 Check duplicate name (case-insensitive), ignore same record
        const exists = await db.collection("tblcategories").findOne(
            { CategoryName: name },
            { collation: { locale: "en", strength: 2 } }
        );

        if (exists && Number(exists.CategoryId) !== id) {
            return res.status(409).json({ message: "Category name already exists." });
        }

        const result = await db.collection("tblcategories").updateOne(
            { CategoryId: id },
            { $set: { CategoryName: name } }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.status(200).json({ CategoryId: id, CategoryName: name });
    } catch (err) {
        console.error("edit-category error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        await connectionObject.close();
    }
});


// Edit Video
app.put("/edit-video/:id", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");

        var video = {
            VideoId: parseInt(req.body.VideoId),
            Title: req.body.Title,
            Url: req.body.Url,
            Description: req.body.Description,
            Likes: parseInt(req.body.Likes),
            Dislikes: parseInt(req.body.Dislikes),
            Views: parseInt(req.body.Views),
            CategoryId: parseInt(req.body.CategoryId),
            Comments: [req.body.Comments],
            ChannelName: req.body.ChannelName || "unknown channel"
        };

        database.collection("tblvideos").updateOne(
            { VideoId: parseInt(req.params.id) },
            { $set: video }
        ).then(() => {
            console.log(`Video Updated Successfully..`);
            res.end();
        });
    });
});

// Delete Category
app.delete("/delete-category/:id", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblcategories").deleteOne({ CategoryId: parseInt(req.params.id) })
            .then(() => {
                console.log("Category deleted..");
                res.end();
            });
    });
});

// Delete Video
app.delete("/delete-video/:id", (req, res) => {
    mongoClient.connect(connectionString).then(connectionObject => {
        var database = connectionObject.db("vidlab");
        database.collection("tblvideos").deleteOne({ VideoId: parseInt(req.params.id) })
            .then(() => {
                console.log("Video Deleted.");
                res.end();
            });
    });
});

// ==================== FIXED REACTION APIs ==================== //

// Toggle reaction (like / dislike)
app.post("/videos/:id/reaction", (req, res) => {
    const videoId = parseInt(req.params.id);
    const { userId, reaction } = req.body; // "like" or "dislike"

    mongoClient.connect(connectionString).then(async (connectionObject) => {
        const database = connectionObject.db("vidlab");
        const reactionsCol = database.collection("tblreactions");
        const videosCol = database.collection("tblvideos");

        const existing = await reactionsCol.findOne({ userId, videoId });

        let deltaLike = 0, deltaDislike = 0;

        if (existing) {
            if (existing.reaction === reaction) {
                // remove reaction
                await reactionsCol.deleteOne({ userId, videoId });
                if (reaction === "like") deltaLike = -1;
                if (reaction === "dislike") deltaDislike = -1;
            } else {
                // switch reaction
                await reactionsCol.updateOne({ userId, videoId }, { $set: { reaction } });
                if (reaction === "like") { deltaLike = 1; deltaDislike = -1; }
                if (reaction === "dislike") { deltaDislike = 1; deltaLike = -1; }
            }
        } else {
            // new reaction
            await reactionsCol.insertOne({ userId, videoId, reaction });
            if (reaction === "like") deltaLike = 1;
            if (reaction === "dislike") deltaDislike = 1;
        }

        // update counts in video
        await videosCol.updateOne(
            { VideoId: videoId },
            { $inc: { Likes: deltaLike, Dislikes: deltaDislike } }
        );

        const updatedVideo = await videosCol.findOne({ VideoId: videoId });
        res.send(updatedVideo);
    });
});

// Get all liked videos by user
app.get("/users/:id/liked-videos", (req, res) => {
    mongoClient.connect(connectionString).then(async (connectionObject) => {
        const database = connectionObject.db("vidlab");
        const reactionsCol = database.collection("tblreactions");
        const videosCol = database.collection("tblvideos");

        const reactions = await reactionsCol.find({ userId: req.params.id, reaction: "like" }).toArray();
        const videoIds = reactions.map(r => r.videoId);

        const videos = await videosCol.find({ VideoId: { $in: videoIds } }).toArray();
        res.send(videos);
    });
});

// ============================SERVER================================= //

app.listen(5050);
console.log(`Server Started: http://127.0.0.1:5050`);
