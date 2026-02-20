require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;


/* =========================
   PREDICTION ENGINE
========================= */

function calculateTeamStrength(team, isHome = false) {
  const formPoints = team.last5.reduce((acc, result) => {
    if (result === "W") return acc + 3;
    if (result === "D") return acc + 1;
    return acc;
  }, 0);

  const formScore = (formPoints / 15) * 40;
  const attackScore = (team.avgGoalsScored / 3) * 30;
  const defenseScore = (1 - (team.avgGoalsConceded / 3)) * 20;
  const homeBonus = isHome ? 10 : 0;

  return formScore + attackScore + defenseScore + homeBonus;
}

function predictMatch(home, away) {
  const homeTSS = calculateTeamStrength(home, true);
  const awayTSS = calculateTeamStrength(away, false);

  const diff = homeTSS - awayTSS;

  let prediction = "Draw";

  if (diff > 15) prediction = "Home Win";
  else if (diff > 8) prediction = "Lean Home";
  else if (diff < -15) prediction = "Away Win";
  else if (diff < -8) prediction = "Lean Away";

  const confidence = Math.min(5, Math.max(1, Math.round(Math.abs(diff) / 5)));

  return { prediction, confidence };
}


/* =========================
   ROUTES
========================= */

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// Predictions route (UPGRADED)
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

      // Temporary simulated team stats (next step: fetch real stats)
      const homeData = {
        last5: ["W", "D", "W", "L", "W"],
        avgGoalsScored: Math.random() * 2 + 0.5,
        avgGoalsConceded: Math.random() * 2
      };

      const awayData = {
        last5: ["L", "W", "D", "L", "W"],
        avgGoalsScored: Math.random() * 2 + 0.5,
        avgGoalsConceded: Math.random() * 2
      };

      const result = predictMatch(homeData, awayData);

      return {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        prediction: result.prediction,
        confidence: result.confidence + "/5"
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
