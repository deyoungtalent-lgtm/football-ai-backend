require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Render provides this automatically
const PORT = process.env.PORT;

// Your API-Football key (must be added in Render Environment Variables)
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!PORT) {
  console.error("PORT is not defined");
}

if (!API_KEY) {
  console.error("API_FOOTBALL_KEY is missing");
}

app.get("/", (req, res) => {
  res.send("Football AI Running with API-Football");
});

app.get("/fixtures", async (req, res) => {
  try {
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

// VERY IMPORTANT: Bind to 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
