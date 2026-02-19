require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.SOCCER_API_KEY; // ✅ Standard name
const BASE_URL = "https://api.soccerdataapi.com";

// Root check
app.get("/", (req, res) => {
  res.send("Football AI Running");
});

// Fixtures route
app.get("/fixtures", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(400).json({ error: "API key missing" });
    }

    const today = new Date().toISOString().split("T")[0];

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: {
        "X-API-KEY": API_KEY
      },
      params: {
        date: today
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch fixtures",
      details: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
