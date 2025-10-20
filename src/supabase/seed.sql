-- Seed a couple algos
insert into public.algos (code, name, "desc", status, min_alloc_sol, fee_bps) values
('DCA_SOL','DCA into SOL','Hourly DCA from USDC to SOL','active',0.20,40),
('KOI_TREND','Momentum Trend','MA cross with trailing stop','active',0.50,50)
on conflict (code) do nothing;