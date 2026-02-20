require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ===============================
   SIMPLE WORKING PREDICTION MODEL
================================= */

function calculateTeamAverage(teamId, matches) {
  const lastMatches = matches
    .filter(m =>
      m.homeTeam.id === teamId || m.awayTeam.id === teamId
    )
    .slice(-5);

  if (lastMatches.length === 0) {
    return { scored: 1.2, conceded: 1.2 };
  }

  let scored = 0;
  let conceded = 0;

  lastMatches.forEach(match => {
    const isHome = match.homeTeam.id === teamId;

    const homeGoals = match.score.fullTime.home ?? 0;
    const awayGoals = match.score.fullTime.away ?? 0;

    if (isHome) {
      scored += homeGoals;
      conceded += awayGoals;
    } else {
      scored += awayGoals;
      conceded += homeGoals;
    }
  });

  return {
    scored: scored / lastMatches.length,
    conceded: conceded / lastMatches.length
  };
}

/* ===============================
   ROUTES
================================= */

app.get("/", (req, res) => {
  res.send("Football AI Running ✅");
});

app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    const upcomingRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const finishedRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=FINISHED",
      { headers }
    );

    const upcomingMatches = upcomingRes.data.matches.slice(0, 5);
    const finishedMatches = finishedRes.data.matches;

    const predictions = upcomingMatches.map(match => {

      const home = calculateTeamAverage(
        match.homeTeam.id,
        finishedMatches
      );

      const away = calculateTeamAverage(
        match.awayTeam.id,
        finishedMatches
      );

      const homeStrength = home.scored - home.conceded + 0.3; // small home advantage
      const awayStrength = away.scored - away.conceded;

      let prediction = "Draw";
      let confidence = 50;

      if (homeStrength > awayStrength) {
        prediction = "Home Win";
        confidence = 60;
      }

      if (awayStrength > homeStrength) {
        prediction = "Away Win";
        confidence = 60;
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        prediction,
        confidence: confidence + "%"
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate predictions" });
  }
});

/* ===============================
   START SERVER
================================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
