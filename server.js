const predictions = upcomingMatches.map(match => {

  const homeId = match.homeTeam.id;
  const awayId = match.awayTeam.id;

  const homeLast5 = getLast5(homeId);
  const awayLast5 = getLast5(awayId);
  const h2hMatches = getH2H(homeId, awayId);

  const homeForm = analyzeTeam(homeId, homeLast5);
  const awayForm = analyzeTeam(awayId, awayLast5);

  const homeH2H = analyzeTeam(homeId, h2hMatches);
  const awayH2H = analyzeTeam(awayId, h2hMatches);

  const homeQualified =
    homeForm.wins >= 3 &&
    homeH2H.wins >= 3 &&
    awayForm.losses >= 3 &&
    awayH2H.losses >= 3;

  const awayQualified =
    awayForm.wins >= 3 &&
    awayH2H.wins >= 3 &&
    homeForm.losses >= 3 &&
    homeH2H.losses >= 3;

  let prediction = "No Edge";
  let confidence = "0%";

  if (homeQualified || awayQualified) {

    const homeCombinedWins = homeForm.wins + homeH2H.wins;
    const awayCombinedWins = awayForm.wins + awayH2H.wins;

    if (homeCombinedWins > awayCombinedWins) {
      prediction = "Home Win";
      confidence = Math.min(90, 65 + (homeCombinedWins - awayCombinedWins) * 5) + "%";
    } 
    else if (awayCombinedWins > homeCombinedWins) {
      prediction = "Away Win";
      confidence = Math.min(90, 65 + (awayCombinedWins - homeCombinedWins) * 5) + "%";
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
    homeFormLosses: homeForm.losses,
    awayFormLosses: awayForm.losses,
    homeH2HLosses: homeH2H.losses,
    awayH2HLosses: awayH2H.losses,
    prediction,
    confidence
  };

}).filter(p => p.prediction !== "No Edge");
