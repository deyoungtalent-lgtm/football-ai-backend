const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ==============================
// SIMPLE MEMORY CACHE
// ==============================
let cachedFinishedMatches = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

app.get("/", (req, res) => {
  res.send("Football AI Running ✅");
});

app.get("/predictions", async (req, res) => {
  try {

    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    // ==============================
    // UPCOMING MATCHES (1 call)
    // ==============================
    const upcomingRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const upcomingMatches = upcomingRes.data.matches.slice(0, 15);

    // ==============================
    // FINISHED MATCHES (CACHED)
    // ==============================
    if (Date.now() - lastFetchTime > CACHE_DURATION) {

      const today = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 10); // free plan safe

      const dateFrom = past.toISOString().split("T")[0];
      const dateTo = today.toISOString().split("T")[0];

      const finishedRes = await axios.get(
        `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );

      cachedFinishedMatches = finishedRes.data.matches;
      lastFetchTime = Date.now();
    }

    const finishedMatches = cachedFinishedMatches;

    // ==============================
    // HELPERS
    // ==============================
    function getLast5(teamId) {
      return finishedMatches
        .filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId)
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 5);
    }

    function getH2H(homeId, awayId) {
      return finishedMatches
        .filter(m =>
          (m.homeTeam.id === homeId && m.awayTeam.id === awayId) ||
          (m.homeTeam.id === awayId && m.awayTeam.id === homeId)
        )
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 5);
    }

    function analyzeTeam(teamId, matches) {
      let wins = 0;
      let losses = 0;

      matches.forEach(m => {
        if (!m.score || !m.score.fullTime) return;

        const isHome = m.homeTeam.id === teamId;
        const homeGoals = m.score.fullTime.home ?? 0;
        const awayGoals = m.score.fullTime.away ?? 0;

        const scored = isHome ? homeGoals : awayGoals;
        const conceded = isHome ? awayGoals : homeGoals;

        if (scored > conceded) wins++;
        if (scored < conceded) losses++;
      });

      return { wins, losses };
    }

    // ==============================
    // PREDICTION ENGINE (UNCHANGED)
    // ==============================
    const predictions = upcomingMatches.map(match => {

      const homeId = match.homeTeam.id;
      const awayId = match.awayTeam.id;

      const homeForm = analyzeTeam(homeId, getLast5(homeId));
      const awayForm = analyzeTeam(awayId, getLast5(awayId));

      const homeH2H = analyzeTeam(homeId, getH2H(homeId, awayId));
      const awayH2H = analyzeTeam(awayId, getH2H(homeId, awayId));

      const homeQualified =
        homeForm.wins >= 3 &&
        homeH2H.wins >= 3 && homeH2H.wins <= 5 &&
        awayForm.losses >= 3 &&
        awayH2H.losses >= 3 && awayH2H.losses <= 5;

      const awayQualified =
        awayForm.wins >= 3 &&
        awayH2H.wins >= 3 && awayH2H.wins <= 5 &&
        homeForm.losses >= 3 &&
        homeH2H.losses >= 3 && homeH2H.losses <= 5;

      let prediction = "No Edge";
      let rating = 0;

      if (homeQualified || awayQualified) {

        const homeCombined = homeForm.wins + homeH2H.wins;
        const awayCombined = awayForm.wins + awayH2H.wins;

        if (homeCombined > awayCombined) {
          prediction = "Home Win";
          rating = Math.min(30 + (homeCombined * 10), 100);
        }
        else if (awayCombined > homeCombined) {
          prediction = "Away Win";
          rating = Math.min(30 + (awayCombined * 10), 100);
        }
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeFormWins: homeForm.wins,
        awayFormWins: awayForm.wins,
        homeH2HWins: homeH2H.wins,
        awayH2HWins: awayH2H.wins,
        prediction,
        rating: `${rating}%`
      };

    }).filter(p => p.prediction !== "No Edge");

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
