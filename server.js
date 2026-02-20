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
        const homeGoals = m.score.fullTime.home ?? 0;
        const awayGoals = m.score.fullTime.away ?? 0;

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
        confidence = Math.min(80, 55 + Math.round(difference * 10)) + "%";
      }

      if (awayScore > homeScore && awayFormWins >= 3) {
        prediction = "Away Win";
        confidence = Math.min(80, 55 + Math.round(difference * 10)) + "%";
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
    });

    res.json(predictions);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Prediction error" });
  }
});
