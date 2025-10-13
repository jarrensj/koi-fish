import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { Keypair } from '@solana/web3.js';
import { saveWallet, checkTeamMembership, checkTeamWallet } from './supabase.js';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Generate and store a new wallet with team info
app.post('/api/wallet/generate', async (req: Request, res: Response) => {
  try {
    const {teamName, owner, userId } = req.body;
    
    if (!owner) {
      return res.status(400).json({
        success: false,
        error: 'Team name and owner are required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
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
          error: 'You do not have permission to access this team\'s wallet'
        });
      }
      
      // Return the existing wallet information
      return res.json({
        success: true,
        publicAddress: existingTeam.wallet_address,
        id: existingTeam.id,
        teamName: existingTeam.team_name,
        userRole: role || 'owner',
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
    const savedTeam = await saveWallet(secretKeyArray, walletAddress, teamName, owner);
    
    // Return only the public address to the frontend
    res.json({
      success: true,
      publicAddress: savedTeam.wallet_address,
      id: savedTeam.id,
      teamName: savedTeam.team_name,
      userRole: role || 'owner'
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`   POST   /api/wallet/generate - Generate new wallet`);
});

export default app;