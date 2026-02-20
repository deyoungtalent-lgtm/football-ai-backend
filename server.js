require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

/* =========================
   AI ENGINE V6
========================= */

function calculateTeamMetrics(teamId, finishedMatches) {
  const teamMatches = finishedMatches
    .filter(m =>
      m.homeTeam.id === teamId || m.awayTeam.id === teamId
    )
    .slice(-5);

  if (teamMatches.length === 0) {
    return {
      avgScored: 1,
      avgConceded: 1,
      goalDiff: 0
    };
  }

  let goalsScored = 0;
  let goalsConceded = 0;

  teamMatches.forEach(match => {
    const isHome = match.homeTeam.id === teamId;

    const homeGoals = match.score.fullTime.home ?? 0;
    const awayGoals = match.score.fullTime.away ?? 0;

    if (isHome) {
      goalsScored += homeGoals;
      goalsConceded += awayGoals;
    } else {
      goalsScored += awayGoals;
      goalsConceded += homeGoals;
    }
  });

  const avgScored = goalsScored / teamMatches.length;
  const avgConceded = goalsConceded / teamMatches.length;
  const goalDiff = avgScored - avgConceded;

  return { avgScored, avgConceded, goalDiff };
}

function calculateProbabilities(home, away) {
  const HOME_ADVANTAGE = 0.25;

  const homeAttack = home.avgScored;
  const homeDefense = home.avgConceded;
  const awayAttack = away.avgScored;
  const awayDefense = away.avgConceded;

  const homeExpectedGoals =
    (homeAttack + awayDefense) / 2 + HOME_ADVANTAGE;

  const awayExpectedGoals =
    (awayAttack + homeDefense) / 2;

  const total = homeExpectedGoals + awayExpectedGoals;

  let homeProb = (homeExpectedGoals / total) * 100;
  let awayProb = (awayExpectedGoals / total) * 100;

  let drawProb = 100 - (homeProb + awayProb);

  if (drawProb < 0) drawProb = 10;

  return {
    homeProb: Math.round(homeProb),
    awayProb: Math.round(awayProb),
    drawProb: Math.round(drawProb),
    homeExpectedGoals: homeExpectedGoals.toFixed(2),
    awayExpectedGoals: awayExpectedGoals.toFixed(2)
  };
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    const upcomingResponse = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const finishedResponse = await axios.get(
      "https://api.football-data.org/v4/matches?status=FINISHED",
      { headers }
    );

    const upcomingMatches = upcomingResponse.data.matches.slice(0, 5);
    const finishedMatches = finishedResponse.data.matches;

    const predictions = upcomingMatches.map(match => {

      const homeStats = calculateTeamMetrics(
        match.homeTeam.id,
        finishedMatches
      );

      const awayStats = calculateTeamMetrics(
        match.awayTeam.id,
        finishedMatches
      );

      const probs = calculateProbabilities(homeStats, awayStats);

      let prediction = "Draw";
      let confidence = probs.drawProb;

      if (probs.homeProb > probs.awayProb &&
          probs.homeProb > probs.drawProb) {
        prediction = "Home Win";
        confidence = probs.homeProb;
      }

      if (probs.awayProb > probs.homeProb &&
          probs.awayProb > probs.drawProb) {
        prediction = "Away Win";
        confidence = probs.awayProb;
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeExpectedGoals: probs.homeExpectedGoals,
        awayExpectedGoals: probs.awayExpectedGoals,
        probabilities: {
          homeWin: probs.homeProb + "%",
          draw: probs.drawProb + "%",
          awayWin: probs.awayProb + "%"
        },
        prediction,
        confidence: confidence + "%"
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Prediction failed",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Server running on port ${PORT}`);
});
