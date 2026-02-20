require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Safe fallback for PORT
const PORT = process.env.PORT || 10000;

// API key
const API_KEY = process.env.API_FOOTBALL_KEY;

app.get("/", (req, res) => {
  res.send("Football AI Running with API-Football");
});

app.get("/fixtures", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "API_FOOTBALL_KEY not set in environment variables"
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const response = await axios.get(
      "https://v3.football.api-sports.io/fixtures",
      {
        headers: {
          "x-apisports-key": API_KEY
        },
        params: {
          date: today
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch fixtures"
    });
  }
});

// IMPORTANT: Bind properly for Render
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
