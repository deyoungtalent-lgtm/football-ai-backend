require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path =("path");

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
  const defenseScore = (1 - team.avgGoalsConceded / 3) * 20;
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

// REAL Predictions route
app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    const matchesResponse = await axios.get(
      "https://api.football-data.org/v4/matches",
      { headers }
    );

    const matches = matchesResponse.data.matches.slice(0, 5);

    async function getTeamForm(teamId) {
      const response = await axios.get(
        `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
        { headers }
      );

      const games = response.data.matches;

      let last5 = [];
      let goalsScored = 0;
      let goalsConceded = 0;

      games.forEach(match => {
        const isHome = match.homeTeam.id === teamId;

        const scored = isHome
          ? match.score.fullTime.home
          : match.score.fullTime.away;

        const conceded = isHome
          ? match.score.fullTime.away
          : match.score.fullTime.home;

        goalsScored += scored || 0;
        goalsConceded += conceded || 0;

        if (scored > conceded) last5.push("W");
        else if (scored === conceded) last5.push("D");
        else last5.push("L");
      });

      return {
        last5,
        avgGoalsScored: goalsScored / games.length || 0,
        avgGoalsConceded: goalsConceded / games.length || 0
      };
    }

    const predictions = [];

    for (const match of matches) {
      const homeForm = await getTeamForm(match.homeTeam.id);
      const awayForm = await getTeamForm(match.awayTeam.id);

      const result = predictMatch(homeForm, awayForm);

      predictions.push({
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        prediction: result.prediction,
        confidence: result.confidence + "/5"
      });
    }

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
