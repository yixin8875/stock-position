package main

import (
	"context"
	"fmt"
	"sync"
)

// App struct
type App struct {
	ctx   context.Context
	store *DBStore
	mu    sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	store, err := openDBStore()
	if err != nil {
		panic(fmt.Sprintf("初始化数据库失败: %v", err))
	}
	a.mu.Lock()
	a.store = store
	a.mu.Unlock()
}

// shutdown closes sqlite connection gracefully.
func (a *App) shutdown(ctx context.Context) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.store != nil {
		_ = a.store.Close()
	}
}

func (a *App) withStore() (*DBStore, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	return a.store, nil
}

// ListMarkets returns market groups.
func (a *App) ListMarkets() ([]Market, error) {
	store, err := a.withStore()
	if err != nil {
		return nil, err
	}
	return store.ListMarkets()
}

// ListInstruments returns instruments in selected market.
func (a *App) ListInstruments(marketID string) ([]Instrument, error) {
	store, err := a.withStore()
	if err != nil {
		return nil, err
	}
	return store.ListInstruments(marketID)
}

// UpsertInstrument creates or updates an instrument for config page.
func (a *App) UpsertInstrument(req InstrumentUpsertRequest) (Instrument, error) {
	store, err := a.withStore()
	if err != nil {
		return Instrument{}, err
	}
	return store.UpsertInstrument(req)
}

// DeleteInstrument deletes an instrument when no historical rows depend on it.
func (a *App) DeleteInstrument(instrumentID string) error {
	store, err := a.withStore()
	if err != nil {
		return err
	}
	return store.DeleteInstrument(instrumentID)
}

// CalculatePosition runs unified sizing math without saving history.
func (a *App) CalculatePosition(req PositionRequest) (PositionResult, error) {
	store, err := a.withStore()
	if err != nil {
		return PositionResult{}, err
	}
	if req.MarketID == "" {
		return PositionResult{}, fmt.Errorf("marketId 不能为空")
	}
	if req.InstrumentID == "" {
		return PositionResult{}, fmt.Errorf("instrumentId 不能为空")
	}
	in, err := store.GetInstrument(req.InstrumentID)
	if err != nil {
		return PositionResult{}, err
	}
	if req.MarketID != in.MarketID {
		return PositionResult{}, fmt.Errorf("品种与市场不匹配")
	}
	return calculatePosition(req, in)
}

// CalculateAndSave computes and stores a record.
func (a *App) CalculateAndSave(req PositionRequest) (PositionResult, error) {
	store, err := a.withStore()
	if err != nil {
		return PositionResult{}, err
	}

	result, err := a.CalculatePosition(req)
	if err != nil {
		return PositionResult{}, err
	}

	recordID, createdAt, err := store.SaveCalculation(req, result)
	if err != nil {
		return PositionResult{}, err
	}
	result.RecordID = recordID
	result.CreatedAt = createdAt
	return result, nil
}

// GetRecentCalculations returns history rows.
func (a *App) GetRecentCalculations(limit int) ([]CalculationRecord, error) {
	store, err := a.withStore()
	if err != nil {
		return nil, err
	}
	return store.ListRecentCalculations(limit)
}
