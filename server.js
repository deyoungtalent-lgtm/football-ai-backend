app.get("/predictions", async (req, res) => {
  try {
    const headers = {
      "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
    };

    // ===============================
    // FETCH UPCOMING MATCHES
    // ===============================
    const upcomingRes = await axios.get(
      "https://api.football-data.org/v4/matches?status=SCHEDULED",
      { headers }
    );

    const upcomingMatches = upcomingRes.data.matches.slice(0, 15);

    // ===============================
    // FETCH LAST 90 DAYS (10-DAY CHUNKS)
    // ===============================
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

    // ===============================
    // REMOVE DUPLICATES
    // ===============================
    finishedMatches = [
      ...new Map(finishedMatches.map(m => [m.id, m])).values()
    ];

    // ===============================
    // HELPERS (UNCHANGED LOGIC)
    // ===============================
    const getLast5 = (teamId) =>
      finishedMatches
        .filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId)
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 5);

    const getH2H = (hId, aId) =>
      finishedMatches
        .filter(m =>
          (m.homeTeam.id === hId && m.awayTeam.id === aId) ||
          (m.homeTeam.id === aId && m.awayTeam.id === hId)
        )
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 5);

    const analyzeTeam = (teamId, matches) => {
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
        else if (scored < conceded) losses++;
      });

      return { wins, losses };
    };

    // ===============================
    // PREDICTION ENGINE (UNCHANGED)
    // ===============================
    const predictions = upcomingMatches.map(match => {

      const hId = match.homeTeam.id;
      const aId = match.awayTeam.id;

      const homeForm = analyzeTeam(hId, getLast5(hId));
      const awayForm = analyzeTeam(aId, getLast5(aId));

      const homeH2H = analyzeTeam(hId, getH2H(hId, aId));
      const awayH2H = analyzeTeam(aId, getH2H(hId, aId));

      const homeMeetsCriteria =
        homeForm.wins >= 3 &&
        homeH2H.wins >= 3 &&
        awayForm.losses >= 3 &&
        awayH2H.losses >= 3;

      const awayMeetsCriteria =
        awayForm.wins >= 3 &&
        awayH2H.wins >= 3 &&
        homeForm.losses >= 3 &&
        homeH2H.losses >= 3;

      let verdict = "Searching...";
      let rating = 0;

      if (homeMeetsCriteria || awayMeetsCriteria) {

        const hScore = homeForm.wins + homeH2H.wins;
        const aScore = awayForm.wins + awayH2H.wins;

        if (hScore > aScore) {
          verdict = `${match.homeTeam.name} to Win`;
          rating = Math.min(30 + (hScore * 7), 100);
        } else if (aScore > hScore) {
          verdict = `${match.awayTeam.name} to Win`;
          rating = Math.min(30 + (aScore * 7), 100);
        }
      }

      return {
        match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        prediction: verdict,
        rating: `${rating}/100`,
        accuracy_bracket: "90-95%",
        market_coverage: "6-8 Candles (15m TF)"
      };

    }).filter(p => p.rating !== "0/100");

    res.json({ success: true, signals: predictions });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Structural Mismatch in Data Fetching" });
  }
});
