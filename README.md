# koi fish

A Solana trading backend that provides wallet management and trading capabilities.

## API Endpoints

### Wallet Management

#### Create Wallet
```
POST /api/wallet/create
```
Creates a new Solana wallet and stores the encrypted private key securely.
- **Response**: `{ success: boolean, walletAddress: string, message: string }`

#### Get Wallet Info
```
GET /api/wallet/:walletAddress
```
Retrieves information about a wallet without exposing the private key.
- **Response**: `{ success: boolean, walletAddress: string, exists: boolean }`

### Trading

#### Buy Token
```
POST /api/trade/buy
```
Swaps SOL for a specified token using Jupiter.
- **Body**: `{ mint: string, amountSol: number, walletAddress: string }`
- **Response**: `{ success: boolean, tx: string, estOut: number }`

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for backend operations
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `SLIPPAGE_BPS`: Slippage tolerance in basis points (default: 100)
- `PRIORITY_FEE_MICROLAMPORTS`: Priority fee for transactions (default: 0)