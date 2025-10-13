import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import cors from "cors";
import routes from "./routes/index.ts";


const app = express();
app.use(express.json());
app.use(cors());

// Mounts route modules
app.use(routes);

// Public endpoints
app.get('/', (req, res) => {
  res.send('hi');
});

app.get("/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));


const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
