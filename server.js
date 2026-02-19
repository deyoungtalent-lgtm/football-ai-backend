require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const API_KEY = process.env.SOCCERDATA_KEY;
const BASE_URL = "https://api.soccerdataapi.com";

app.get("/", (req, res) => {
  res.send("Football AI Running");
});

app.get("/fixtures", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: { "X-API-KEY": API_KEY },
      params: { date: today }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fixtures" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
