require("dotenv").config(); // MUST BE FIRST

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Match = require("./models/Match");

const app = express();
app.use(express.json());

/* ======================
   MONGODB CONNECTION
====================== */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

/* ======================
   ROUTES
====================== */

app.get("/", (req, res) => {
  res.send("Football VIP Backend Running");
});

app.get("/matches", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.football-data.org/v4/matches",
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

/* ======================
   SERVER START
====================== */

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
