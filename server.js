const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Football AI Running ✅");
});

app.get("/predictions", async (req, res) => {
  try {

    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    // ==============================
    // FETCH UPCOMING MATCHES
    // ==============================
    const upcomingRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const upcomingMatches = upcomingRes.data.matches.slice(0, 15);

    // ==============================
    // FETCH LAST 90 DAYS (10 DAY CHUNKS)
    // ==============================
    let finishedMatches = [];
    let endDate = new Date();

    for (let i = 0; i < 9; i++) {
      let startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 10);

      const dateFrom = startDate.toISOString().split("T")[0];
      const dateTo = endDate.toISOString().split("T")[0];

      const response = await axios.get(
        `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );

      finishedMatches.push(...response.data.matches);
      endDate = new Date(startDate);
    }

    // Remove duplicates
    finishedMatches = [
      ...new Map(finishedMatches.map(m => [m.id, m])).values()
    ];

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
    // PREDICTION ENGINE
    // ==============================
    const predictions = upcomingMatches.map(match => {

      const homeId = match.homeTeam.id;
      const awayId = match.awayTeam.id;

      const homeForm = analyzeTeam(homeId, getLast5(homeId));
      const awayForm = analyzeTeam(awayId, getLast5(awayId));

      const homeH2H = analyzeTeam(homeId, getH2H(homeId, awayId));
      const awayH2H = analyzeTeam(awayId, getH2H(homeId, awayId));

      // ===== YOUR EXACT RULES =====

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
    res.status(500).json({ error: "Prediction error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
