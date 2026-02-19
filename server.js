require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = "https://v3.football.api-sports.io";

// Check if API key exists
if (!API_KEY) {
  console.error("API_FOOTBALL_KEY is missing in Environment Variables");
}

app.get("/", (req, res) => {
  res.send("Football AI Running with API-Football 🚀");
});

app.get("/fixtures", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: {
