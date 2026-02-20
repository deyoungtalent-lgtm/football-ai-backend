const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  competition: String,
  competitionCode: String,
  date: Date,
  homeTeamId: Number,
  awayTeamId: Number,
  homeTeam: String,
  awayTeam: String,
  homeGoals: Number,
  awayGoals: Number
});

module.exports = mongoose.model("Match", matchSchema);
