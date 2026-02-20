require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

/* =========================
   HELPER FUNCTION
========================= */

function calculateWins(teamId, finishedMatches) {
  const teamMatches = finishedMatches
    .filter(m =>
      m.homeTeam.id === teamId || m.awayTeam.id === teamId
    )
    .slice(-5);

  let wins = 0;

  teamMatches.forEach(match => {
    const isHome = match.homeTeam.id === teamId;
    const homeGoals = match.score.fullTime.home;
    const awayGoals = match.score.fullTime.away;

    if (
      (isHome && homeGoals > awayGoals) ||
      (!isHome && awayGoals > homeGoals)
    ) {
      wins++;
    }
  });

  return wins;
}

/* =========================
   ROUTES
========================= */

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Matches Route
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

// Predictions Route (FREE PLAN SAFE)
app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    // Upcoming matches
    const upcomingResponse = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    // Finished matches
    const finishedResponse = await axios.get(
      "https://api.football-data.org/v4/matches?status=FINISHED",
      { headers }
    );

    const upcomingMatches = upcomingResponse.data.matches.slice(0, 5);
    const finishedMatches = finishedResponse.data.matches;

    const predictions = upcomingMatches.map(match => {

      const homeWins = calculateWins(match.homeTeam.id, finishedMatches);
      const awayWins = calculateWins(match.awayTeam.id, finishedMatches);

      let prediction = "Draw";
      let confidence = "50%";

      if (homeWins > awayWins) {
        prediction = "Home Win";
        confidence = "65%";
      } else if (awayWins > homeWins) {
        prediction = "Away Win";
        confidence = "65%";
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeLast5Wins: homeWins,
        awayLast5Wins: awayWins,
        prediction,
        confidence
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error("FULL ERROR:", error.response?.data || error.message);
    res.status(500).json({
      error: "Prediction failed",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
