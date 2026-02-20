require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Home route
app.get("/", (req, res) => {
  res.send("Football AI Backend Running");
});

// Matches route
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
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch matches"
    });
  }
});

// Predictions route
app.get("/predictions", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.football-data.org/v4/matches",
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
        }
      }
    );

    const matches = response.data.matches;

    const predictions = matches.slice(0, 10).map(match => {
      const homeStrength = Math.random();
      const awayStrength = Math.random();

      let prediction;
      let confidence;

      if (homeStrength > awayStrength) {
        prediction = "Home Win";
        confidence = Math.floor(homeStrength * 100) + "%";
      } else {
        prediction = "Away Win";
        confidence = Math.floor(awayStrength * 100) + "%";
      }

      return {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        prediction,
        confidence
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// Always LAST
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
