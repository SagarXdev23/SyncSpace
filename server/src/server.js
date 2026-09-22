const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    message: "SyncSpace API is running",
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
