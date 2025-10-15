import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { Keypair } from '@solana/web3.js';
import { saveWallet, checkTeamMembership, checkTeamWallet } from '../lib/supabase.js';
import routes from "./routes/index.ts";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import dns from "dns";
dns.setDefaultResultOrder?.("ipv4first");

const app: Express = express();
const PORT = Number(process.env.PORT || 3001);

// Middleware
app.use(cors());
app.use(express.json());

// Mounts route modules
app.use(routes);

// Generate and store a new wallet with team info
app.post('/api/wallet/generate', async (req: Request, res: Response) => {
  try {
    const {teamName, owner, userId, chain } = req.body;
    
    if (!owner) {
      return res.status(400).json({
        success: false,
        error: 'Owner account required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User id is required'
      });
    }

    if (!chain) {
      return res.status(400).json({
        success: false,
        error: 'Chain is required'
      });
    }

    // Validate chain parameter
    const validChains = ['eth', 'base', 'abs', 'sol'];
    if (!validChains.includes(chain.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chain. Must be one of: eth, base, abs, sol'
      });
    }

    // Check if the team already has a wallet
    const existingTeam = await checkTeamWallet(teamName);
    
    if (existingTeam) {
      // Team already has a wallet, check if user has permission to access it
      const { isAuthorized, role } = await checkTeamMembership(userId, teamName);
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this team's wallet"
        });
      }
      
      // Return the existing wallet information
      return res.json({
        success: true,
        publicAddress: existingTeam.wallet_address,
        id: existingTeam.id,
        teamName: existingTeam.team_name,
        userRole: role || 'owner',
        chain: existingTeam.chain || 'sol', // Default to 'sol' for existing wallets
        message: 'Team already has a wallet'
      });
    }
    
    // Check if the user has permission to generate wallets for this team
    const { isAuthorized, role } = await checkTeamMembership(userId, teamName);
    
    // For existing teams, check authorization
    if (!isAuthorized) {
      // If team doesn't exist yet, verify the userId matches the owner
      if (userId !== owner) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to generate wallets for this team'
        });
      }
      // If userId matches owner, allow creation of new team
    }
    
    // Generate a new, random keypair
    const keypair = Keypair.generate();
    
    const secretKey = keypair.secretKey;
    const walletAddress = keypair.publicKey.toString();
    const secretKeyArray = Array.from(secretKey);
    
    // Save to Supabase with team info
    const savedTeam = await saveWallet(secretKeyArray, walletAddress, teamName, owner, chain.toLowerCase());
    
    // Return only the public address to the frontend
    res.json({
      success: true,
      publicAddress: savedTeam.wallet_address,
      id: savedTeam.id,
      teamName: savedTeam.team_name,
      userRole: role || 'owner',
      chain: chain.toLowerCase()
    });
    
    console.log(`Created wallet: ${walletAddress} by user ${userId} (${role || 'owner'})`);
  } catch (error) {
    console.error('❌ Error generating wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate wallet'
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
  console.log(`   POST   /api/wallet/generate - Generate new wallet`);
});

export default app;
