const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ FIXED PORT FOR RENDER
const PORT = process.env.PORT || 10000;

// Health check route
app.get("/", (req, res) => {
  res.send("Football AI Backend Running ✅");
});

app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    const today = new Date();
    const past = new Date();
    past.setMonth(past.getMonth() - 3);

    const dateFrom = past.toISOString().split("T")[0];
    const dateTo = today.toISOString().split("T")[0];

    const upcomingRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const finishedRes = await axios.get(
      `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers }
    );

    const upcomingMatches = upcomingRes.data.matches.slice(0, 5);
    const finishedMatches = finishedRes.data.matches;

    function getLast5(teamId) {
      return finishedMatches
        .filter(m =>
          m.homeTeam.id === teamId || m.awayTeam.id === teamId
        )
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

    function countWins(teamId, matches) {
      let wins = 0;

      matches.forEach(m => {
        const isHome = m.homeTeam.id === teamId;
        const homeGoals = m.score.fullTime?.home ?? 0;
        const awayGoals = m.score.fullTime?.away ?? 0;

        if (isHome && homeGoals > awayGoals) wins++;
        if (!isHome && awayGoals > homeGoals) wins++;
      });

      return wins;
    }

    function countLosses(teamId, matches) {
      let losses = 0;

      matches.forEach(m => {
        const isHome = m.homeTeam.id === teamId;
        const homeGoals = m.score.fullTime?.home ?? 0;
        const awayGoals = m.score.fullTime?.away ?? 0;

        if (isHome && homeGoals < awayGoals) losses++;
        if (!isHome && awayGoals < homeGoals) losses++;
      });

      return losses;
    }

    const predictions = upcomingMatches.map(match => {

      const homeId = match.homeTeam.id;
      const awayId = match.awayTeam.id;

      const homeLast5 = getLast5(homeId);
      const awayLast5 = getLast5(awayId);
      const h2h = getH2H(homeId, awayId);

      const homeFormWins = countWins(homeId, homeLast5);
      const awayFormWins = countWins(awayId, awayLast5);

      const homeFormLosses = countLosses(homeId, homeLast5);
      const awayFormLosses = countLosses(awayId, awayLast5);

      const homeH2HWins = countWins(homeId, h2h);
      const awayH2HWins = countWins(awayId, h2h);

      const homeH2HLosses = countLosses(homeId, h2h);
      const awayH2HLosses = countLosses(awayId, h2h);

      let prediction = "No Clear Edge";
      let confidence = "55%";

      const homeQualified =
        homeFormWins >= 3 &&
        homeH2HWins >= 3 &&
        awayFormLosses >= 3 &&
        awayH2HLosses >= 3;

      const awayQualified =
        awayFormWins >= 3 &&
        awayH2HWins >= 3 &&
        homeFormLosses >= 3 &&
        homeH2HLosses >= 3;

      if (homeQualified || awayQualified) {

        const homeScore = homeFormWins + homeH2HWins;
        const awayScore = awayFormWins + awayH2HWins;

        if (homeScore > awayScore) {
          prediction = "Home Win";
          confidence = Math.min(85, 60 + (homeScore - awayScore) * 5) + "%";
        } else if (awayScore > homeScore) {
          prediction = "Away Win";
          confidence = Math.min(85, 60 + (awayScore - homeScore) * 5) + "%";
        }
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeFormWins,
        awayFormWins,
        homeFormLosses,
        awayFormLosses,
        homeH2HWins,
        awayH2HWins,
        prediction,
        confidence
      };
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction error" });
  }
});

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

    function getLast5(teamId) {
      return finishedMatches
        .filter(m =>
          m.homeTeam.id === teamId || m.awayTeam.id === teamId
        )
        .slice(-5);
    }

    function getH2H(homeId, awayId) {
      return finishedMatches
        .filter(m =>
          (m.homeTeam.id === homeId && m.awayTeam.id === awayId) ||
          (m.homeTeam.id === awayId && m.awayTeam.id === homeId)
        )
        .slice(-5);
    }

    function countWins(teamId, matches) {
      let wins = 0;

      matches.forEach(m => {
        const isHome = m.homeTeam.id === teamId;
        const homeGoals = m.score.fullTime?.home ?? 0;
        const awayGoals = m.score.fullTime?.away ?? 0;

        if (isHome && homeGoals > awayGoals) wins++;
        if (!isHome && awayGoals > homeGoals) wins++;
      });

      return wins;
    }

    const predictions = upcomingMatches.map(match => {

      const homeId = match.homeTeam.id;
      const awayId = match.awayTeam.id;

      const homeLast5 = getLast5(homeId);
      const awayLast5 = getLast5(awayId);
      const h2h = getH2H(homeId, awayId);

      const homeFormWins = countWins(homeId, homeLast5);
      const awayFormWins = countWins(awayId, awayLast5);

      const homeH2HWins = countWins(homeId, h2h);
      const awayH2HWins = countWins(awayId, h2h);

      // Weighted scoring
      const homeScore = (homeFormWins * 0.6) + (homeH2HWins * 0.4);
      const awayScore = (awayFormWins * 0.6) + (awayH2HWins * 0.4);

      let prediction = "Draw";
      let confidence = "50%";

      const difference = Math.abs(homeScore - awayScore);

      if (homeScore > awayScore && homeFormWins >= 3) {
        prediction = "Home Win";
        confidence = Math.min(85, 55 + Math.round(difference * 10)) + "%";
      } else if (awayScore > homeScore && awayFormWins >= 3) {
        prediction = "Away Win";
        confidence = Math.min(85, 55 + Math.round(difference * 10)) + "%";
      }

      return {
        competition: match.competition.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeFormWins,
        awayFormWins,
        homeH2HWins,
        awayH2HWins,
        prediction,
        confidence
      };

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction error" });
  }
});

// ✅ THIS IS WHAT FIXES RENDER PORT ERROR
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
