import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { generateToken } from '../lib/auth.js';
import routes from "./routes/index.ts";

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required but not set');
  console.error('Please create a .env.local file with JWT_SECRET=your_secret_key');
  process.exit(1);
}

import dns from "dns";
dns.setDefaultResultOrder?.("ipv4first");

const app: Express = express();
const PORT = Number(process.env.PORT || 3001);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Mounts route modules
app.use(routes);

// Login endpoint to generate JWT token
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Generate JWT token
    const token = generateToken(userId, email);
    
    res.json({
      success: true,
      token,
      userId,
      email
    });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token'
    });
  }
});


// Public endpoints
app.get('/', (req, res) => {
  res.send('hi');
});

app.get("/health", (_req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

// Start server
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST   /api/auth/login - Generate JWT token`);
  console.log(`   POST   /api/wallet/create - Create new wallet`);
  console.log(`   GET    /api/wallet/:address - Get wallet info`);
  console.log(`   POST   /api/trade/buy - Execute trade`);
});

export default app;
