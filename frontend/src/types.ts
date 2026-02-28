export interface Market {
  id: string;
  name: string;
  category: string;
  currency: string;
  description: string;
}

export interface Instrument {
  id: string;
  marketId: string;
  symbol: string;
  name: string;
  category: string;
  quoteCurrency: string;
  contractMultiplier: number;
  tickSize: number;
  lotStep: number;
  marginRate: number;
  feePerUnit: number;
  slippagePerUnit: number;
  notes: string;
}

export interface InstrumentUpsertRequest {
  id: string;
  marketId: string;
  symbol: string;
  name: string;
  category: string;
  quoteCurrency: string;
  contractMultiplier: number;
  tickSize: number;
  lotStep: number;
  marginRate: number;
  feePerUnit: number;
  slippagePerUnit: number;
  notes: string;
}

export interface PositionRequest {
  marketId: string;
  instrumentId: string;
  direction: string;
  entryPrice: number;
  stopPrice: number;
  accountEquity: number;
  availableFunds: number;
  riskPct: number;
  marginUsageLimit: number;
  feePerUnit: number;
  slippagePerUnit: number;
  maxPositionLimit: number;
  fxRate: number;
}

export interface PositionResult {
  recordId: number;
  createdAt: string;
  instrument: Instrument;
  direction: string;
  riskPct: number;
  riskBudget: number;
  unitPriceRisk: number;
  unitRiskWithCost: number;
  qtyByRisk: number;
  qtyByMargin: number;
  finalQty: number;
  lotStep: number;
  marginPerUnit: number;
  marginRequired: number;
  estimatedLoss: number;
  estimatedLossPct: number;
  fxRate: number;
  warnings: string[];
}

export interface CalculationRecord {
  id: number;
  createdAt: string;
  marketName: string;
  instrumentSymbol: string;
  instrumentName: string;
  direction: string;
  entryPrice: number;
  stopPrice: number;
  finalQty: number;
  estimatedLoss: number;
  marginRequired: number;
  riskPct: number;
}
