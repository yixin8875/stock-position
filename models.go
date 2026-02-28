package main

// Market represents a tradable venue category such as A-share, CN futures or global futures.
type Market struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Currency    string `json:"currency"`
	Description string `json:"description"`
}

// Instrument stores product-level defaults used by the sizing engine.
type Instrument struct {
	ID                 string  `json:"id"`
	MarketID           string  `json:"marketId"`
	Symbol             string  `json:"symbol"`
	Name               string  `json:"name"`
	Category           string  `json:"category"`
	QuoteCurrency      string  `json:"quoteCurrency"`
	ContractMultiplier float64 `json:"contractMultiplier"`
	TickSize           float64 `json:"tickSize"`
	LotStep            int     `json:"lotStep"`
	MarginRate         float64 `json:"marginRate"`
	FeePerUnit         float64 `json:"feePerUnit"`
	SlippagePerUnit    float64 `json:"slippagePerUnit"`
	Notes              string  `json:"notes"`
}

// InstrumentUpsertRequest is the editable payload for instrument configuration.
type InstrumentUpsertRequest struct {
	ID                 string  `json:"id"`
	MarketID           string  `json:"marketId"`
	Symbol             string  `json:"symbol"`
	Name               string  `json:"name"`
	Category           string  `json:"category"`
	QuoteCurrency      string  `json:"quoteCurrency"`
	ContractMultiplier float64 `json:"contractMultiplier"`
	TickSize           float64 `json:"tickSize"`
	LotStep            int     `json:"lotStep"`
	MarginRate         float64 `json:"marginRate"`
	FeePerUnit         float64 `json:"feePerUnit"`
	SlippagePerUnit    float64 `json:"slippagePerUnit"`
	Notes              string  `json:"notes"`
}

// PositionRequest is the unified payload for all markets.
type PositionRequest struct {
	MarketID         string  `json:"marketId"`
	InstrumentID     string  `json:"instrumentId"`
	Direction        string  `json:"direction"`
	EntryPrice       float64 `json:"entryPrice"`
	StopPrice        float64 `json:"stopPrice"`
	AccountEquity    float64 `json:"accountEquity"`
	AvailableFunds   float64 `json:"availableFunds"`
	RiskPct          float64 `json:"riskPct"`
	MarginUsageLimit float64 `json:"marginUsageLimit"`
	FeePerUnit       float64 `json:"feePerUnit"`
	SlippagePerUnit  float64 `json:"slippagePerUnit"`
	MaxPositionLimit int     `json:"maxPositionLimit"`
	FXRate           float64 `json:"fxRate"`
}

// PositionResult returns key metrics and suggestions.
type PositionResult struct {
	RecordID         int64      `json:"recordId"`
	CreatedAt        string     `json:"createdAt"`
	Instrument       Instrument `json:"instrument"`
	Direction        string     `json:"direction"`
	RiskPct          float64    `json:"riskPct"`
	RiskBudget       float64    `json:"riskBudget"`
	UnitPriceRisk    float64    `json:"unitPriceRisk"`
	UnitRiskWithCost float64    `json:"unitRiskWithCost"`
	QtyByRisk        int        `json:"qtyByRisk"`
	QtyByMargin      int        `json:"qtyByMargin"`
	FinalQty         int        `json:"finalQty"`
	LotStep          int        `json:"lotStep"`
	MarginPerUnit    float64    `json:"marginPerUnit"`
	MarginRequired   float64    `json:"marginRequired"`
	EstimatedLoss    float64    `json:"estimatedLoss"`
	EstimatedLossPct float64    `json:"estimatedLossPct"`
	FXRate           float64    `json:"fxRate"`
	Warnings         []string   `json:"warnings"`
}

// CalculationRecord is a compact row for the history table.
type CalculationRecord struct {
	ID               int64   `json:"id"`
	CreatedAt        string  `json:"createdAt"`
	MarketName       string  `json:"marketName"`
	InstrumentSymbol string  `json:"instrumentSymbol"`
	InstrumentName   string  `json:"instrumentName"`
	Direction        string  `json:"direction"`
	EntryPrice       float64 `json:"entryPrice"`
	StopPrice        float64 `json:"stopPrice"`
	FinalQty         int     `json:"finalQty"`
	EstimatedLoss    float64 `json:"estimatedLoss"`
	MarginRequired   float64 `json:"marginRequired"`
	RiskPct          float64 `json:"riskPct"`
}
