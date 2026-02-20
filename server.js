require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

/* ===============================
   INSTITUTIONAL AI ENGINE V8
================================= */

// Factorial (safe iterative version)
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Poisson
function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// League dynamic home advantage
function getHomeAdvantage(competitionName) {
  const map = {
    "Premier League": 0.30,
    "La Liga": 0.28,
    "Bundesliga": 0.32,
    "Serie A": 0.27,
    "Ligue 1": 0.26
  };

  return map[competitionName] || 0.25;
}

// Rolling weighted form
function calculateTeamMetrics(teamId, finishedMatches) {
  const teamMatches = finishedMatches
    .filter(m =>
      m.homeTeam.id === teamId || m.awayTeam.id === teamId
    )
    .slice(-5);

  if (teamMatches.length === 0) {
    return { attack: 1.2, defense: 1.2 };
  }

  let weightedScored = 0;
  let weightedConceded = 0;
  let totalWeight = 0;

  teamMatches.forEach((match, index) => {
    const weight = index + 1; // recent matches weighted higher
    totalWeight += weight;

    const isHome = match.homeTeam.id === teamId;
    const homeGoals = match.score.fullTime.home ?? 0;
    const awayGoals = match.score.fullTime.away ?? 0;

    const scored = isHome ? homeGoals : awayGoals;
    const conceded = isHome ? awayGoals : homeGoals;

    weightedScored += scored * weight;
    weightedConceded += conceded * weight;
  });

  return {
    attack: weightedScored / totalWeight,
    defense: weightedConceded / totalWeight
  };
}

function calculateInstitutionalProb(home, away, competition) {

  const HOME_ADV = getHomeAdvantage(competition);

  const homeLambda =
    (home.attack * 0.6 + away.defense * 0.4) + HOME_ADV;

  const awayLambda =
    (away.attack * 0.6 + home.defense * 0.4);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let btts = 0;

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob =
        poisson(h, homeLambda) * poisson(a, awayLambda);

      if (h > a) homeWin += prob;
      if (h === a) draw += prob;
      if (a > h) awayWin += prob;

      if (h + a > 2) over25 += prob;
      if (h > 0 && a > 0) btts += prob;
    }
  }

  const total = homeWin + draw + awayWin;

  return {
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
    over25: Math.round(over25 * 100),
    btts: Math.round(btts * 100),
    homeXG: homeLambda.toFixed(2),
    awayXG: awayLambda.toFixed(2)
  };
}

// Confidence calibration
function calibrateConfidence(prob) {
  if (prob >= 70) return "Very High";
  if (prob >= 60) return "High";
  if (prob >= 55) return "Moderate";
  return "Low";
}

// Placeholder value detection (odds-ready)
function valueFlag(modelProb, marketOdds = 2.0) {
  const implied = 100 / marketOdds;
  return modelProb > implied ? "VALUE" : "No Value";
}

/* ===============================
   ROUTES
================================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    const upcoming = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const finished = await axios.get(
      "https://api.football-data.org/v4/matches?status=FINISHED",
      { headers }
    );

    const matches = upcoming.data.matches.slice(0, 5);
    const finishedMatches = finished.data.matches;

    const predictions = matches.map(match => {

      const homeStats = calculateTeamMetrics(
        match.homeTeam.id,
        finishedMatches
      );

      const awayStats = calculateTeamMetrics(
        match.awayTeam.id,
        finishedMatches
      );

      const probs = calculateInstitutionalProb(
        homeStats,
        awayStats,
        match.competition.name
      );

      let main = "Draw";
      let mainProb = probs.draw;

      if (probs.homeWin > probs.awayWin &&
          probs.homeWin > probs.draw) {
        main = "Home Win";
        mainProb = probs.homeWin;
      }

      if (probs.awayWin > probs.homeWin &&
          probs.awayWin > probs.draw) {
        main = "Away Win";
        mainProb = probs.awayWin;
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,

        expectedGoals: {
          home: probs.homeXG,
          away: probs.awayXG
        },

        probabilities: {
          homeWin: probs.homeWin + "%",
          draw: probs.draw + "%",
          awayWin: probs.awayWin + "%",
          over2_5: probs.over25 + "%",
          BTTS: probs.btts + "%"
        },

        mainPrediction: main,
        confidenceLevel: calibrateConfidence(mainProb),

        valueCheckExample: valueFlag(mainProb, 2.0)
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
  console.log("Institutional AI V8 running");
});
