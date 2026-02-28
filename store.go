package main

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// DBStore owns SQLite lifecycle and query helpers.
type DBStore struct {
	db *sql.DB
}

func openDBStore() (*DBStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user config dir: %w", err)
	}

	appDir := filepath.Join(configDir, "stock-position")
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return nil, fmt.Errorf("create app dir: %w", err)
	}

	dsn := filepath.Join(appDir, "position_calculator.db")
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	store := &DBStore{db: db}
	if err := store.bootstrap(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

func (s *DBStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *DBStore) bootstrap() error {
	queries := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA foreign_keys=ON;",
		`CREATE TABLE IF NOT EXISTS markets (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			currency TEXT NOT NULL,
			description TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS instruments (
			id TEXT PRIMARY KEY,
			market_id TEXT NOT NULL,
			symbol TEXT NOT NULL,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			quote_currency TEXT NOT NULL,
			contract_multiplier REAL NOT NULL,
			tick_size REAL NOT NULL,
			lot_step INTEGER NOT NULL,
			margin_rate REAL NOT NULL,
			fee_per_unit REAL NOT NULL,
			slippage_per_unit REAL NOT NULL,
			notes TEXT NOT NULL,
			FOREIGN KEY(market_id) REFERENCES markets(id),
			UNIQUE(market_id, symbol)
		);`,
		`CREATE TABLE IF NOT EXISTS calculations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at TEXT NOT NULL,
			market_id TEXT NOT NULL,
			instrument_id TEXT NOT NULL,
			direction TEXT NOT NULL,
			entry_price REAL NOT NULL,
			stop_price REAL NOT NULL,
			account_equity REAL NOT NULL,
			available_funds REAL NOT NULL,
			risk_pct REAL NOT NULL,
			margin_usage_limit REAL NOT NULL,
			fee_per_unit REAL NOT NULL,
			slippage_per_unit REAL NOT NULL,
			max_position_limit INTEGER NOT NULL,
			fx_rate REAL NOT NULL,
			risk_budget REAL NOT NULL,
			unit_risk_with_cost REAL NOT NULL,
			qty_by_risk INTEGER NOT NULL,
			qty_by_margin INTEGER NOT NULL,
			final_qty INTEGER NOT NULL,
			margin_required REAL NOT NULL,
			estimated_loss REAL NOT NULL,
			FOREIGN KEY(market_id) REFERENCES markets(id),
			FOREIGN KEY(instrument_id) REFERENCES instruments(id)
		);`,
	}

	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			return fmt.Errorf("bootstrap query failed: %w", err)
		}
	}

	if err := s.seedMarkets(); err != nil {
		return err
	}
	if err := s.seedInstruments(); err != nil {
		return err
	}
	return nil
}

func (s *DBStore) seedMarkets() error {
	markets := []Market{
		{ID: "a_share", Name: "A股", Category: "stock", Currency: "CNY", Description: "沪深股票，默认100股一手，T+1"},
		{ID: "cn_futures", Name: "国内期货", Category: "futures", Currency: "CNY", Description: "上期所/大商所/郑商所/中金所等"},
		{ID: "global_futures", Name: "海外期货", Category: "futures", Currency: "USD", Description: "CME/COMEX/NYMEX等，支持汇率换算"},
	}

	stmt, err := s.db.Prepare(`
		INSERT INTO markets(id, name, category, currency, description)
		VALUES(?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name=excluded.name,
			category=excluded.category,
			currency=excluded.currency,
			description=excluded.description;
	`)
	if err != nil {
		return fmt.Errorf("prepare seed markets: %w", err)
	}
	defer stmt.Close()

	for _, m := range markets {
		if _, err := stmt.Exec(m.ID, m.Name, m.Category, m.Currency, m.Description); err != nil {
			return fmt.Errorf("seed market %s: %w", m.ID, err)
		}
	}

	return nil
}

func (s *DBStore) seedInstruments() error {
	instruments := []Instrument{
		{
			ID:                 "a_share_600519",
			MarketID:           "a_share",
			Symbol:             "600519.SH",
			Name:               "贵州茅台",
			Category:           "stock",
			QuoteCurrency:      "CNY",
			ContractMultiplier: 1,
			TickSize:           0.01,
			LotStep:            100,
			MarginRate:         1,
			FeePerUnit:         0.03,
			SlippagePerUnit:    0.02,
			Notes:              "默认费用按每股估算，可在计算面板调整",
		},
		{
			ID:                 "a_share_300750",
			MarketID:           "a_share",
			Symbol:             "300750.SZ",
			Name:               "宁德时代",
			Category:           "stock",
			QuoteCurrency:      "CNY",
			ContractMultiplier: 1,
			TickSize:           0.01,
			LotStep:            100,
			MarginRate:         1,
			FeePerUnit:         0.03,
			SlippagePerUnit:    0.03,
			Notes:              "默认费用按每股估算，可在计算面板调整",
		},
		{
			ID:                 "cnf_rb",
			MarketID:           "cn_futures",
			Symbol:             "RB",
			Name:               "螺纹钢",
			Category:           "commodity",
			QuoteCurrency:      "CNY",
			ContractMultiplier: 10,
			TickSize:           1,
			LotStep:            1,
			MarginRate:         0.12,
			FeePerUnit:         8,
			SlippagePerUnit:    5,
			Notes:              "上期所螺纹钢，点值10元/手",
		},
		{
			ID:                 "cnf_if",
			MarketID:           "cn_futures",
			Symbol:             "IF",
			Name:               "沪深300股指",
			Category:           "index",
			QuoteCurrency:      "CNY",
			ContractMultiplier: 300,
			TickSize:           0.2,
			LotStep:            1,
			MarginRate:         0.14,
			FeePerUnit:         12,
			SlippagePerUnit:    8,
			Notes:              "中金所IF，点值300元/手",
		},
		{
			ID:                 "glf_es",
			MarketID:           "global_futures",
			Symbol:             "ES",
			Name:               "E-mini S&P 500",
			Category:           "index",
			QuoteCurrency:      "USD",
			ContractMultiplier: 50,
			TickSize:           0.25,
			LotStep:            1,
			MarginRate:         0.12,
			FeePerUnit:         4,
			SlippagePerUnit:    6,
			Notes:              "CME指数期货，费用按每手美元估算",
		},
		{
			ID:                 "glf_gc",
			MarketID:           "global_futures",
			Symbol:             "GC",
			Name:               "COMEX Gold",
			Category:           "commodity",
			QuoteCurrency:      "USD",
			ContractMultiplier: 100,
			TickSize:           0.1,
			LotStep:            1,
			MarginRate:         0.08,
			FeePerUnit:         6,
			SlippagePerUnit:    8,
			Notes:              "COMEX黄金，费用按每手美元估算",
		},
	}

	stmt, err := s.db.Prepare(`
		INSERT INTO instruments(
			id, market_id, symbol, name, category, quote_currency,
			contract_multiplier, tick_size, lot_step, margin_rate,
			fee_per_unit, slippage_per_unit, notes
		)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			market_id=excluded.market_id,
			symbol=excluded.symbol,
			name=excluded.name,
			category=excluded.category,
			quote_currency=excluded.quote_currency,
			contract_multiplier=excluded.contract_multiplier,
			tick_size=excluded.tick_size,
			lot_step=excluded.lot_step,
			margin_rate=excluded.margin_rate,
			fee_per_unit=excluded.fee_per_unit,
			slippage_per_unit=excluded.slippage_per_unit,
			notes=excluded.notes;
	`)
	if err != nil {
		return fmt.Errorf("prepare seed instruments: %w", err)
	}
	defer stmt.Close()

	for _, in := range instruments {
		if _, err := stmt.Exec(
			in.ID,
			in.MarketID,
			in.Symbol,
			in.Name,
			in.Category,
			in.QuoteCurrency,
			in.ContractMultiplier,
			in.TickSize,
			in.LotStep,
			in.MarginRate,
			in.FeePerUnit,
			in.SlippagePerUnit,
			in.Notes,
		); err != nil {
			return fmt.Errorf("seed instrument %s: %w", in.ID, err)
		}
	}
	return nil
}

func (s *DBStore) ListMarkets() ([]Market, error) {
	rows, err := s.db.Query(`
		SELECT id, name, category, currency, description
		FROM markets
		ORDER BY CASE id
			WHEN 'a_share' THEN 1
			WHEN 'cn_futures' THEN 2
			ELSE 3
		END;
	`)
	if err != nil {
		return nil, fmt.Errorf("query markets: %w", err)
	}
	defer rows.Close()

	items := make([]Market, 0, 4)
	for rows.Next() {
		var m Market
		if err := rows.Scan(&m.ID, &m.Name, &m.Category, &m.Currency, &m.Description); err != nil {
			return nil, fmt.Errorf("scan market: %w", err)
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (s *DBStore) ListInstruments(marketID string) ([]Instrument, error) {
	rows, err := s.db.Query(`
		SELECT id, market_id, symbol, name, category, quote_currency,
			contract_multiplier, tick_size, lot_step, margin_rate,
			fee_per_unit, slippage_per_unit, notes
		FROM instruments
		WHERE market_id = ?
		ORDER BY symbol;
	`, marketID)
	if err != nil {
		return nil, fmt.Errorf("query instruments: %w", err)
	}
	defer rows.Close()

	items := make([]Instrument, 0, 16)
	for rows.Next() {
		var in Instrument
		if err := rows.Scan(
			&in.ID,
			&in.MarketID,
			&in.Symbol,
			&in.Name,
			&in.Category,
			&in.QuoteCurrency,
			&in.ContractMultiplier,
			&in.TickSize,
			&in.LotStep,
			&in.MarginRate,
			&in.FeePerUnit,
			&in.SlippagePerUnit,
			&in.Notes,
		); err != nil {
			return nil, fmt.Errorf("scan instrument: %w", err)
		}
		items = append(items, in)
	}
	return items, rows.Err()
}

func (s *DBStore) GetInstrument(instrumentID string) (Instrument, error) {
	row := s.db.QueryRow(`
		SELECT id, market_id, symbol, name, category, quote_currency,
			contract_multiplier, tick_size, lot_step, margin_rate,
			fee_per_unit, slippage_per_unit, notes
		FROM instruments
		WHERE id = ?;
	`, instrumentID)

	var in Instrument
	err := row.Scan(
		&in.ID,
		&in.MarketID,
		&in.Symbol,
		&in.Name,
		&in.Category,
		&in.QuoteCurrency,
		&in.ContractMultiplier,
		&in.TickSize,
		&in.LotStep,
		&in.MarginRate,
		&in.FeePerUnit,
		&in.SlippagePerUnit,
		&in.Notes,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Instrument{}, fmt.Errorf("instrument %s not found", instrumentID)
		}
		return Instrument{}, fmt.Errorf("scan instrument: %w", err)
	}

	return in, nil
}

func normalizeInstrumentIDPart(raw string) string {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return ""
	}

	var b strings.Builder
	lastUnderscore := false
	for _, r := range trimmed {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			b.WriteRune('_')
			lastUnderscore = true
		}
	}

	result := strings.Trim(b.String(), "_")
	if result == "" {
		return "instrument"
	}
	return result
}

func buildInstrumentID(marketID string, symbol string) string {
	return normalizeInstrumentIDPart(marketID) + "_" + normalizeInstrumentIDPart(symbol)
}

func (s *DBStore) UpsertInstrument(req InstrumentUpsertRequest) (Instrument, error) {
	req.MarketID = strings.TrimSpace(req.MarketID)
	req.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
	req.Name = strings.TrimSpace(req.Name)
	req.Category = strings.TrimSpace(req.Category)
	req.QuoteCurrency = strings.ToUpper(strings.TrimSpace(req.QuoteCurrency))
	req.Notes = strings.TrimSpace(req.Notes)

	if req.MarketID == "" {
		return Instrument{}, fmt.Errorf("marketId 不能为空")
	}
	if req.Symbol == "" {
		return Instrument{}, fmt.Errorf("symbol 不能为空")
	}
	if req.Name == "" {
		return Instrument{}, fmt.Errorf("name 不能为空")
	}
	if req.ContractMultiplier <= 0 {
		return Instrument{}, fmt.Errorf("contractMultiplier 必须大于0")
	}
	if req.TickSize <= 0 {
		return Instrument{}, fmt.Errorf("tickSize 必须大于0")
	}
	if req.LotStep <= 0 {
		return Instrument{}, fmt.Errorf("lotStep 必须大于0")
	}
	if req.MarginRate <= 0 {
		return Instrument{}, fmt.Errorf("marginRate 必须大于0")
	}
	if req.Category == "" {
		req.Category = "other"
	}
	if req.QuoteCurrency == "" {
		req.QuoteCurrency = "CNY"
	}

	var marketCount int
	if err := s.db.QueryRow(`SELECT COUNT(1) FROM markets WHERE id = ?;`, req.MarketID).Scan(&marketCount); err != nil {
		return Instrument{}, fmt.Errorf("check market: %w", err)
	}
	if marketCount == 0 {
		return Instrument{}, fmt.Errorf("marketId 不存在: %s", req.MarketID)
	}

	instrumentID := strings.TrimSpace(req.ID)
	if instrumentID == "" {
		instrumentID = buildInstrumentID(req.MarketID, req.Symbol)
	}

	_, err := s.db.Exec(`
		INSERT INTO instruments(
			id, market_id, symbol, name, category, quote_currency,
			contract_multiplier, tick_size, lot_step, margin_rate,
			fee_per_unit, slippage_per_unit, notes
		)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			market_id=excluded.market_id,
			symbol=excluded.symbol,
			name=excluded.name,
			category=excluded.category,
			quote_currency=excluded.quote_currency,
			contract_multiplier=excluded.contract_multiplier,
			tick_size=excluded.tick_size,
			lot_step=excluded.lot_step,
			margin_rate=excluded.margin_rate,
			fee_per_unit=excluded.fee_per_unit,
			slippage_per_unit=excluded.slippage_per_unit,
			notes=excluded.notes;
	`,
		instrumentID,
		req.MarketID,
		req.Symbol,
		req.Name,
		req.Category,
		req.QuoteCurrency,
		req.ContractMultiplier,
		req.TickSize,
		req.LotStep,
		req.MarginRate,
		req.FeePerUnit,
		req.SlippagePerUnit,
		req.Notes,
	)
	if err != nil {
		return Instrument{}, fmt.Errorf("upsert instrument: %w", err)
	}

	return s.GetInstrument(instrumentID)
}

func (s *DBStore) DeleteInstrument(instrumentID string) error {
	instrumentID = strings.TrimSpace(instrumentID)
	if instrumentID == "" {
		return fmt.Errorf("instrumentId 不能为空")
	}

	var calcCount int
	if err := s.db.QueryRow(`SELECT COUNT(1) FROM calculations WHERE instrument_id = ?;`, instrumentID).Scan(&calcCount); err != nil {
		return fmt.Errorf("check calculations: %w", err)
	}
	if calcCount > 0 {
		return fmt.Errorf("该品种已有历史记录，不能删除")
	}

	res, err := s.db.Exec(`DELETE FROM instruments WHERE id = ?;`, instrumentID)
	if err != nil {
		return fmt.Errorf("delete instrument: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete instrument affected: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("instrument %s not found", instrumentID)
	}
	return nil
}

func (s *DBStore) SaveCalculation(req PositionRequest, result PositionResult) (int64, string, error) {
	now := time.Now().Format(time.RFC3339)

	res, err := s.db.Exec(`
		INSERT INTO calculations(
			created_at, market_id, instrument_id, direction,
			entry_price, stop_price, account_equity, available_funds,
			risk_pct, margin_usage_limit, fee_per_unit, slippage_per_unit,
			max_position_limit, fx_rate,
			risk_budget, unit_risk_with_cost,
			qty_by_risk, qty_by_margin, final_qty,
			margin_required, estimated_loss
		)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
	`,
		now,
		req.MarketID,
		req.InstrumentID,
		result.Direction,
		req.EntryPrice,
		req.StopPrice,
		req.AccountEquity,
		req.AvailableFunds,
		result.RiskPct,
		normalizePercent(req.MarginUsageLimit, 0.7),
		req.FeePerUnit,
		req.SlippagePerUnit,
		req.MaxPositionLimit,
		result.FXRate,
		result.RiskBudget,
		result.UnitRiskWithCost,
		result.QtyByRisk,
		result.QtyByMargin,
		result.FinalQty,
		result.MarginRequired,
		result.EstimatedLoss,
	)
	if err != nil {
		return 0, "", fmt.Errorf("insert calculation: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, "", fmt.Errorf("last insert id: %w", err)
	}
	return id, now, nil
}

func (s *DBStore) ListRecentCalculations(limit int) ([]CalculationRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}

	rows, err := s.db.Query(`
		SELECT
			c.id,
			c.created_at,
			m.name,
			i.symbol,
			i.name,
			c.direction,
			c.entry_price,
			c.stop_price,
			c.final_qty,
			c.estimated_loss,
			c.margin_required,
			c.risk_pct
		FROM calculations c
		JOIN markets m ON c.market_id = m.id
		JOIN instruments i ON c.instrument_id = i.id
		ORDER BY c.id DESC
		LIMIT ?;
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("query recent calculations: %w", err)
	}
	defer rows.Close()

	items := make([]CalculationRecord, 0, limit)
	for rows.Next() {
		var r CalculationRecord
		if err := rows.Scan(
			&r.ID,
			&r.CreatedAt,
			&r.MarketName,
			&r.InstrumentSymbol,
			&r.InstrumentName,
			&r.Direction,
			&r.EntryPrice,
			&r.StopPrice,
			&r.FinalQty,
			&r.EstimatedLoss,
			&r.MarginRequired,
			&r.RiskPct,
		); err != nil {
			return nil, fmt.Errorf("scan recent calculation: %w", err)
		}
		items = append(items, r)
	}

	return items, rows.Err()
}
