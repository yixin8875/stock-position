package main

import (
	"fmt"
	"math"
	"strings"
)

func normalizePercent(value float64, defaultValue float64) float64 {
	if value <= 0 {
		return defaultValue
	}
	if value > 1 {
		return value / 100.0
	}
	return value
}

func positiveOr(value float64, fallback float64) float64 {
	if value > 0 {
		return value
	}
	return fallback
}

func normalizeDirection(direction string) string {
	d := strings.TrimSpace(strings.ToLower(direction))
	if d == "short" {
		return "short"
	}
	return "long"
}

func minInt(values ...int) int {
	if len(values) == 0 {
		return 0
	}
	m := values[0]
	for _, v := range values[1:] {
		if v < m {
			m = v
		}
	}
	return m
}

func alignToLotStep(qty int, lotStep int) int {
	if qty <= 0 {
		return 0
	}
	if lotStep <= 1 {
		return qty
	}
	return (qty / lotStep) * lotStep
}

func calculatePosition(req PositionRequest, in Instrument) (PositionResult, error) {
	if req.AccountEquity <= 0 {
		return PositionResult{}, fmt.Errorf("账户资金必须大于0")
	}
	if req.EntryPrice <= 0 || req.StopPrice <= 0 {
		return PositionResult{}, fmt.Errorf("入场价和止损价必须大于0")
	}

	riskPct := normalizePercent(req.RiskPct, 0.01)
	marginUsageLimit := normalizePercent(req.MarginUsageLimit, 0.7)
	fxRate := positiveOr(req.FXRate, 1)
	maxPositionLimit := req.MaxPositionLimit
	if maxPositionLimit <= 0 {
		maxPositionLimit = math.MaxInt32
	}

	feePerUnit := req.FeePerUnit
	if feePerUnit <= 0 {
		feePerUnit = in.FeePerUnit
	}
	slippagePerUnit := req.SlippagePerUnit
	if slippagePerUnit < 0 {
		slippagePerUnit = 0
	}
	if slippagePerUnit == 0 {
		slippagePerUnit = in.SlippagePerUnit
	}

	availableFunds := req.AvailableFunds
	if availableFunds <= 0 {
		availableFunds = req.AccountEquity
	}

	multiplier := positiveOr(in.ContractMultiplier, 1)
	lotStep := in.LotStep
	if lotStep <= 0 {
		lotStep = 1
	}

	riskBudget := req.AccountEquity * riskPct
	priceRisk := math.Abs(req.EntryPrice-req.StopPrice) * multiplier * fxRate
	costRisk := (feePerUnit + slippagePerUnit) * fxRate
	unitRiskWithCost := priceRisk + costRisk
	if unitRiskWithCost <= 0 {
		return PositionResult{}, fmt.Errorf("单单位风险为0，无法计算")
	}

	qtyByRisk := int(math.Floor(riskBudget / unitRiskWithCost))
	if qtyByRisk < 0 {
		qtyByRisk = 0
	}

	marginPerUnit := req.EntryPrice * multiplier * positiveOr(in.MarginRate, 1) * fxRate
	qtyByMargin := math.MaxInt32
	if marginPerUnit > 0 {
		qtyByMargin = int(math.Floor((availableFunds * marginUsageLimit) / marginPerUnit))
		if qtyByMargin < 0 {
			qtyByMargin = 0
		}
	}

	rawQty := minInt(qtyByRisk, qtyByMargin, maxPositionLimit)
	if rawQty < 0 {
		rawQty = 0
	}
	finalQty := alignToLotStep(rawQty, lotStep)

	estimatedLoss := float64(finalQty) * unitRiskWithCost
	estimatedLossPct := 0.0
	if req.AccountEquity > 0 {
		estimatedLossPct = estimatedLoss / req.AccountEquity
	}
	marginRequired := float64(finalQty) * marginPerUnit

	warnings := make([]string, 0, 4)
	if math.Abs(req.EntryPrice-req.StopPrice) < in.TickSize {
		warnings = append(warnings, "入场与止损距离很小，注意滑点会放大实际风险")
	}
	if qtyByMargin < qtyByRisk {
		warnings = append(warnings, "保证金约束小于风险约束，仓位被保证金限制")
	}
	if finalQty == 0 {
		warnings = append(warnings, "当前参数下建议仓位为0，请放宽止损或提高资金")
	}
	if finalQty > 0 && finalQty < lotStep {
		warnings = append(warnings, "仓位小于最小交易单位，已向下取整")
	}

	return PositionResult{
		Instrument:       in,
		Direction:        normalizeDirection(req.Direction),
		RiskPct:          riskPct,
		RiskBudget:       riskBudget,
		UnitPriceRisk:    priceRisk,
		UnitRiskWithCost: unitRiskWithCost,
		QtyByRisk:        qtyByRisk,
		QtyByMargin:      qtyByMargin,
		FinalQty:         finalQty,
		LotStep:          lotStep,
		MarginPerUnit:    marginPerUnit,
		MarginRequired:   marginRequired,
		EstimatedLoss:    estimatedLoss,
		EstimatedLossPct: estimatedLossPct,
		FXRate:           fxRate,
		Warnings:         warnings,
	}, nil
}
