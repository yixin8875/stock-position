export namespace main {
	
	export class CalculationRecord {
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
	
	    static createFrom(source: any = {}) {
	        return new CalculationRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.createdAt = source["createdAt"];
	        this.marketName = source["marketName"];
	        this.instrumentSymbol = source["instrumentSymbol"];
	        this.instrumentName = source["instrumentName"];
	        this.direction = source["direction"];
	        this.entryPrice = source["entryPrice"];
	        this.stopPrice = source["stopPrice"];
	        this.finalQty = source["finalQty"];
	        this.estimatedLoss = source["estimatedLoss"];
	        this.marginRequired = source["marginRequired"];
	        this.riskPct = source["riskPct"];
	    }
	}
	export class Instrument {
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
	
	    static createFrom(source: any = {}) {
	        return new Instrument(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.marketId = source["marketId"];
	        this.symbol = source["symbol"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.quoteCurrency = source["quoteCurrency"];
	        this.contractMultiplier = source["contractMultiplier"];
	        this.tickSize = source["tickSize"];
	        this.lotStep = source["lotStep"];
	        this.marginRate = source["marginRate"];
	        this.feePerUnit = source["feePerUnit"];
	        this.slippagePerUnit = source["slippagePerUnit"];
	        this.notes = source["notes"];
	    }
	}
	export class InstrumentUpsertRequest {
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
	
	    static createFrom(source: any = {}) {
	        return new InstrumentUpsertRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.marketId = source["marketId"];
	        this.symbol = source["symbol"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.quoteCurrency = source["quoteCurrency"];
	        this.contractMultiplier = source["contractMultiplier"];
	        this.tickSize = source["tickSize"];
	        this.lotStep = source["lotStep"];
	        this.marginRate = source["marginRate"];
	        this.feePerUnit = source["feePerUnit"];
	        this.slippagePerUnit = source["slippagePerUnit"];
	        this.notes = source["notes"];
	    }
	}
	export class Market {
	    id: string;
	    name: string;
	    category: string;
	    currency: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new Market(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.currency = source["currency"];
	        this.description = source["description"];
	    }
	}
	export class PositionRequest {
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
	
	    static createFrom(source: any = {}) {
	        return new PositionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.marketId = source["marketId"];
	        this.instrumentId = source["instrumentId"];
	        this.direction = source["direction"];
	        this.entryPrice = source["entryPrice"];
	        this.stopPrice = source["stopPrice"];
	        this.accountEquity = source["accountEquity"];
	        this.availableFunds = source["availableFunds"];
	        this.riskPct = source["riskPct"];
	        this.marginUsageLimit = source["marginUsageLimit"];
	        this.feePerUnit = source["feePerUnit"];
	        this.slippagePerUnit = source["slippagePerUnit"];
	        this.maxPositionLimit = source["maxPositionLimit"];
	        this.fxRate = source["fxRate"];
	    }
	}
	export class PositionResult {
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
	
	    static createFrom(source: any = {}) {
	        return new PositionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.recordId = source["recordId"];
	        this.createdAt = source["createdAt"];
	        this.instrument = this.convertValues(source["instrument"], Instrument);
	        this.direction = source["direction"];
	        this.riskPct = source["riskPct"];
	        this.riskBudget = source["riskBudget"];
	        this.unitPriceRisk = source["unitPriceRisk"];
	        this.unitRiskWithCost = source["unitRiskWithCost"];
	        this.qtyByRisk = source["qtyByRisk"];
	        this.qtyByMargin = source["qtyByMargin"];
	        this.finalQty = source["finalQty"];
	        this.lotStep = source["lotStep"];
	        this.marginPerUnit = source["marginPerUnit"];
	        this.marginRequired = source["marginRequired"];
	        this.estimatedLoss = source["estimatedLoss"];
	        this.estimatedLossPct = source["estimatedLossPct"];
	        this.fxRate = source["fxRate"];
	        this.warnings = source["warnings"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

