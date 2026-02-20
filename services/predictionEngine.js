function calculateTeamStrength(team, isHome = false) {
  const formPoints = team.last5.reduce((acc, result) => {
    if (result === "W") return acc + 3;
    if (result === "D") return acc + 1;
    return acc;
  }, 0);

  const formScore = (formPoints / 15) * 40;
  const attackScore = (team.avgGoalsScored / 3) * 30;
  const defenseScore = (1 - (team.avgGoalsConceded / 3)) * 20;
  const homeBonus = isHome ? 10 : 0;

  return formScore + attackScore + defenseScore + homeBonus;
}

function predictMatch(home, away) {
  const homeTSS = calculateTeamStrength(home, true);
  const awayTSS = calculateTeamStrength(away, false);

  const diff = homeTSS - awayTSS;

  let prediction = "Draw";

  if (diff > 15) prediction = "Home Win";
  else if (diff > 8) prediction = "Lean Home";
  else if (diff < -15) prediction = "Away Win";
  else if (diff < -8) prediction = "Lean Away";

  const confidence = Math.min(5, Math.max(1, Math.round(Math.abs(diff) / 5)));

  return { prediction, confidence };
}

module.exports = { predictMatch };
