import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Database,
  Layers,
  PencilLine,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  CalculateAndSave,
  CalculatePosition,
  DeleteInstrument,
  GetAppVersion,
  GetRecentCalculations,
  ListInstruments,
  ListMarkets,
  UpsertInstrument,
} from "../wailsjs/go/main/App";
import type {
  CalculationRecord,
  Instrument,
  InstrumentUpsertRequest,
  Market,
  PositionRequest,
  PositionResult,
} from "./types";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Slider } from "./components/ui/slider";
import { Switch } from "./components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { cn, formatCurrency, formatNumber } from "./lib/utils";

const initialCalcForm: PositionRequest = {
  marketId: "",
  instrumentId: "",
  direction: "long",
  entryPrice: 3400,
  stopPrice: 3370,
  accountEquity: 100000,
  availableFunds: 100000,
  riskPct: 1,
  marginUsageLimit: 70,
  feePerUnit: 8,
  slippagePerUnit: 5,
  maxPositionLimit: 30,
  fxRate: 1,
};

const blankInstrumentDraft: InstrumentUpsertRequest = {
  id: "",
  marketId: "",
  symbol: "",
  name: "",
  category: "commodity",
  quoteCurrency: "CNY",
  contractMultiplier: 1,
  tickSize: 0.2,
  lotStep: 1,
  marginRate: 0.12,
  feePerUnit: 0,
  slippagePerUnit: 0,
  notes: "",
};

function getSamplePrices(symbol: string) {
  const sampleBySymbol: Record<string, { entry: number; stop: number }> = {
    RB: { entry: 3400, stop: 3370 },
    IF: { entry: 3800, stop: 3788 },
    ES: { entry: 5200, stop: 5188 },
    GC: { entry: 2250, stop: 2244 },
    "600519.SH": { entry: 1500, stop: 1460 },
    "300750.SZ": { entry: 180, stop: 172 },
  };
  return sampleBySymbol[symbol] ?? { entry: 100, stop: 98 };
}

function App() {
  const [activeTab, setActiveTab] = useState("calculator");

  const [markets, setMarkets] = useState<Market[]>([]);
  const [calcMarketId, setCalcMarketId] = useState("");
  const [configMarketId, setConfigMarketId] = useState("");
  const [calcInstruments, setCalcInstruments] = useState<Instrument[]>([]);
  const [configInstruments, setConfigInstruments] = useState<Instrument[]>([]);

  const [calcForm, setCalcForm] = useState<PositionRequest>(initialCalcForm);
  const [result, setResult] = useState<PositionResult | null>(null);
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [autoSave, setAutoSave] = useState(true);

  const [instrumentDraft, setInstrumentDraft] = useState<InstrumentUpsertRequest>(blankInstrumentDraft);
  const [editingInstrumentId, setEditingInstrumentId] = useState("");

  const [booting, setBooting] = useState(true);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [loadingSaveInstrument, setLoadingSaveInstrument] = useState(false);
  const [appVersion, setAppVersion] = useState("dev");
  const [error, setError] = useState("");

  const selectedCalcInstrument = useMemo(
    () => calcInstruments.find((item) => item.id === calcForm.instrumentId),
    [calcInstruments, calcForm.instrumentId],
  );

  const isGlobalFuture = selectedCalcInstrument?.quoteCurrency === "USD";
  const displayCurrency = selectedCalcInstrument?.quoteCurrency ?? "CNY";

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const version = (await GetAppVersion()) as string;
        setAppVersion(version || "dev");

        const marketRows = (await ListMarkets()) as Market[];
        setMarkets(marketRows);
        if (marketRows.length === 0) {
          return;
        }

        const defaultCalcMarket = marketRows.find((m) => m.id === "cn_futures")?.id ?? marketRows[0].id;
        const defaultConfigMarket = defaultCalcMarket;

        setCalcMarketId(defaultCalcMarket);
        setConfigMarketId(defaultConfigMarket);

        await Promise.all([
          loadCalcInstruments(defaultCalcMarket),
          loadConfigInstruments(defaultConfigMarket),
          loadHistory(),
        ]);
      } catch (e) {
        setError(String(e));
      } finally {
        setBooting(false);
      }
    };

    void bootstrap();
  }, []);

  const loadHistory = async () => {
    const rows = (await GetRecentCalculations(30)) as CalculationRecord[];
    setHistory(rows);
  };

  const loadCalcInstruments = async (marketId: string) => {
    const rows = (await ListInstruments(marketId)) as Instrument[];
    setCalcInstruments(rows);

    const preferred = rows.find((item) => item.symbol === "RB") ?? rows[0];
    if (!preferred) {
      setCalcForm((prev) => ({ ...prev, marketId, instrumentId: "" }));
      return;
    }

    const sample = getSamplePrices(preferred.symbol);
    setCalcForm((prev) => ({
      ...prev,
      marketId,
      instrumentId: preferred.id,
      entryPrice: sample.entry,
      stopPrice: sample.stop,
      feePerUnit: preferred.feePerUnit,
      slippagePerUnit: preferred.slippagePerUnit,
      maxPositionLimit: preferred.lotStep === 100 ? 200000 : 30,
      fxRate: preferred.quoteCurrency === "USD" ? 7.2 : 1,
    }));
  };

  const loadConfigInstruments = async (marketId: string) => {
    const rows = (await ListInstruments(marketId)) as Instrument[];
    setConfigInstruments(rows);
  };

  const onCalcMarketChange = async (marketId: string) => {
    setCalcMarketId(marketId);
    await loadCalcInstruments(marketId);
  };

  const onCalcInstrumentChange = (instrumentId: string) => {
    const instrument = calcInstruments.find((item) => item.id === instrumentId);
    if (!instrument) {
      return;
    }

    const sample = getSamplePrices(instrument.symbol);
    setCalcForm((prev) => ({
      ...prev,
      instrumentId,
      entryPrice: sample.entry,
      stopPrice: sample.stop,
      feePerUnit: instrument.feePerUnit,
      slippagePerUnit: instrument.slippagePerUnit,
      maxPositionLimit: instrument.lotStep === 100 ? 200000 : 30,
      fxRate: instrument.quoteCurrency === "USD" ? 7.2 : 1,
    }));
  };

  const updateCalcNumber = (key: keyof PositionRequest, raw: string) => {
    const value = Number(raw);
    setCalcForm((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
  };

  const runCalculation = async () => {
    if (!calcForm.marketId || !calcForm.instrumentId) {
      setError("请先选择市场和品种");
      return;
    }
    setLoadingCalc(true);
    setError("");
    try {
      const payload: PositionRequest = {
        ...calcForm,
        riskPct: Number(calcForm.riskPct.toFixed(2)),
        marginUsageLimit: Number(calcForm.marginUsageLimit.toFixed(1)),
      };
      const data = autoSave
        ? ((await CalculateAndSave(payload)) as PositionResult)
        : ((await CalculatePosition(payload)) as PositionResult);
      setResult(data);
      if (autoSave) {
        await loadHistory();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingCalc(false);
    }
  };

  const onConfigMarketChange = async (marketId: string) => {
    setConfigMarketId(marketId);
    setInstrumentDraft((prev) => ({ ...prev, marketId }));
    await loadConfigInstruments(marketId);
  };

  const updateDraftNumber = (key: keyof InstrumentUpsertRequest, raw: string) => {
    const value = Number(raw);
    setInstrumentDraft((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
  };

  const startCreateInstrument = () => {
    const defaultCurrency = configMarketId === "global_futures" ? "USD" : "CNY";
    setEditingInstrumentId("");
    setInstrumentDraft({
      ...blankInstrumentDraft,
      marketId: configMarketId,
      quoteCurrency: defaultCurrency,
      category: configMarketId === "a_share" ? "stock" : "commodity",
      lotStep: configMarketId === "a_share" ? 100 : 1,
      marginRate: configMarketId === "a_share" ? 1 : 0.12,
    });
  };

  const startEditInstrument = (instrument: Instrument) => {
    setEditingInstrumentId(instrument.id);
    setInstrumentDraft({
      id: instrument.id,
      marketId: instrument.marketId,
      symbol: instrument.symbol,
      name: instrument.name,
      category: instrument.category,
      quoteCurrency: instrument.quoteCurrency,
      contractMultiplier: instrument.contractMultiplier,
      tickSize: instrument.tickSize,
      lotStep: instrument.lotStep,
      marginRate: instrument.marginRate,
      feePerUnit: instrument.feePerUnit,
      slippagePerUnit: instrument.slippagePerUnit,
      notes: instrument.notes,
    });
  };

  const saveInstrument = async () => {
    if (!instrumentDraft.marketId) {
      setError("请先选择市场");
      return;
    }
    setLoadingSaveInstrument(true);
    setError("");
    try {
      const saved = (await UpsertInstrument(instrumentDraft)) as Instrument;
      setEditingInstrumentId(saved.id);
      setInstrumentDraft((prev) => ({ ...prev, id: saved.id }));

      await Promise.all([
        loadConfigInstruments(configMarketId),
        calcMarketId ? loadCalcInstruments(calcMarketId) : Promise.resolve(),
      ]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingSaveInstrument(false);
    }
  };

  const removeInstrument = async (instrument: Instrument) => {
    const confirmed = window.confirm(`确认删除 ${instrument.symbol} / ${instrument.name} ?`);
    if (!confirmed) {
      return;
    }

    setError("");
    try {
      await DeleteInstrument(instrument.id);
      if (editingInstrumentId === instrument.id) {
        startCreateInstrument();
      }
      await Promise.all([
        loadConfigInstruments(configMarketId),
        calcMarketId ? loadCalcInstruments(calcMarketId) : Promise.resolve(),
      ]);
    } catch (e) {
      setError(String(e));
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#f4fbff] grid place-items-center text-sky-700">
        <div className="rounded-2xl border border-sky-100 bg-white px-6 py-4 shadow-sm">正在加载...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-slate-700">
      <div className="mx-auto max-w-[1380px] px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-white/90 px-5 py-4 shadow-[0_12px_35px_rgba(14,165,233,0.12)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              全市场仓位系统
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">仓位计算器 + 品种配置</h1>
            <p className="mt-1 text-sm text-slate-500">
              A股 / 国内期货 / 海外期货统一以损定仓
              <span className="ml-2 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                {appVersion}
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 text-white shadow-md">
            <p className="text-xs opacity-90">当前单笔风险预算</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(calcForm.accountEquity * (calcForm.riskPct / 100), "CNY")}
            </p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              仓位计算
            </TabsTrigger>
            <TabsTrigger value="instruments" className="gap-2">
              <Database className="h-4 w-4" />
              品种配置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-sky-600" />
                    计算参数
                  </CardTitle>
                  <CardDescription>先定止损，再算仓位</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="市场">
                    <Select value={calcMarketId} onValueChange={(value) => void onCalcMarketChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择市场" />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.id} value={market.id}>
                            {market.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="品种">
                    <Select value={calcForm.instrumentId} onValueChange={onCalcInstrumentChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择品种" />
                      </SelectTrigger>
                      <SelectContent>
                        {calcInstruments.map((instrument) => (
                          <SelectItem key={instrument.id} value={instrument.id}>
                            {instrument.symbol} / {instrument.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="方向">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCalcForm((prev) => ({ ...prev, direction: "long" }))}
                        className={cn(
                          "h-11 rounded-xl border text-sm font-semibold transition",
                          calcForm.direction === "long"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-sky-100 bg-white text-slate-600 hover:bg-sky-50",
                        )}
                      >
                        做多
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcForm((prev) => ({ ...prev, direction: "short" }))}
                        className={cn(
                          "h-11 rounded-xl border text-sm font-semibold transition",
                          calcForm.direction === "short"
                            ? "border-orange-300 bg-orange-50 text-orange-700"
                            : "border-sky-100 bg-white text-slate-600 hover:bg-sky-50",
                        )}
                      >
                        做空
                      </button>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="入场价">
                      <Input type="number" value={calcForm.entryPrice} onChange={(e) => updateCalcNumber("entryPrice", e.target.value)} />
                    </Field>
                    <Field label="止损价">
                      <Input type="number" value={calcForm.stopPrice} onChange={(e) => updateCalcNumber("stopPrice", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="总资金 (CNY)">
                      <Input type="number" value={calcForm.accountEquity} onChange={(e) => updateCalcNumber("accountEquity", e.target.value)} />
                    </Field>
                    <Field label="可用资金 (CNY)">
                      <Input type="number" value={calcForm.availableFunds} onChange={(e) => updateCalcNumber("availableFunds", e.target.value)} />
                    </Field>
                  </div>

                  <Field label={`单笔风险比例: ${formatNumber(calcForm.riskPct, 2)}%`}>
                    <Slider
                      min={0.2}
                      max={3}
                      step={0.1}
                      value={[calcForm.riskPct]}
                      onValueChange={(value) =>
                        setCalcForm((prev) => ({ ...prev, riskPct: value[0] ?? prev.riskPct }))
                      }
                    />
                  </Field>

                  <Field label={`保证金占用上限: ${formatNumber(calcForm.marginUsageLimit, 1)}%`}>
                    <Slider
                      min={20}
                      max={95}
                      step={1}
                      value={[calcForm.marginUsageLimit]}
                      onValueChange={(value) =>
                        setCalcForm((prev) => ({
                          ...prev,
                          marginUsageLimit: value[0] ?? prev.marginUsageLimit,
                        }))
                      }
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`手续费/单位 (${displayCurrency})`}>
                      <Input type="number" value={calcForm.feePerUnit} onChange={(e) => updateCalcNumber("feePerUnit", e.target.value)} />
                    </Field>
                    <Field label={`滑点/单位 (${displayCurrency})`}>
                      <Input type="number" value={calcForm.slippagePerUnit} onChange={(e) => updateCalcNumber("slippagePerUnit", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="最大持仓上限">
                      <Input type="number" value={calcForm.maxPositionLimit} onChange={(e) => updateCalcNumber("maxPositionLimit", e.target.value)} />
                    </Field>
                    <Field label="汇率 USD/CNY">
                      <Input
                        type="number"
                        value={calcForm.fxRate}
                        disabled={!isGlobalFuture}
                        onChange={(e) => updateCalcNumber("fxRate", e.target.value)}
                        className={!isGlobalFuture ? "opacity-60" : ""}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">计算后自动写入历史</p>
                      <p className="text-xs text-slate-500">关闭后仅预览</p>
                    </div>
                    <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                  </div>

                  {selectedCalcInstrument?.notes ? (
                    <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                      {selectedCalcInstrument.notes}
                    </p>
                  ) : null}

                  <Button className="w-full" onClick={() => void runCalculation()} disabled={loadingCalc}>
                    <Calculator className="mr-2 h-4 w-4" />
                    {loadingCalc ? "计算中..." : "计算建议仓位"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="风险预算" value={result ? formatCurrency(result.riskBudget, "CNY") : formatCurrency(calcForm.accountEquity * (calcForm.riskPct / 100), "CNY")} />
                  <MetricCard label="建议仓位" value={result ? `${result.finalQty} 单位` : "--"} />
                  <MetricCard label="预计最大亏损" value={result ? formatCurrency(result.estimatedLoss, "CNY") : "--"} />
                  <MetricCard label="保证金占用" value={result ? formatCurrency(result.marginRequired, "CNY") : "--"} />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>计算明细</CardTitle>
                    <CardDescription>floor(风险预算 / 单位风险) 后叠加保证金与最小交易单位约束</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <DetailItem label="单位价格风险" value={formatCurrency(result.unitPriceRisk, "CNY")} />
                        <DetailItem label="单位总风险(含费滑)" value={formatCurrency(result.unitRiskWithCost, "CNY")} />
                        <DetailItem label="风险约束数量" value={`${result.qtyByRisk}`} />
                        <DetailItem label="保证金约束数量" value={`${result.qtyByMargin}`} />
                        <DetailItem label="最终建议数量" value={`${result.finalQty}`} />
                        <DetailItem label="预计亏损占比" value={`${formatNumber(result.estimatedLossPct * 100, 2)}%`} />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">填写参数后点击“计算建议仓位”。</p>
                    )}

                    {result?.warnings?.length ? (
                      <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        {result.warnings.map((warning) => (
                          <p key={warning} className="text-sm text-amber-700">
                            {warning}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>历史记录</CardTitle>
                    <CardDescription>最近 30 条计算结果（SQLite 本地存储）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[300px] overflow-auto rounded-xl border border-sky-100">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-sky-50 text-xs text-slate-500">
                          <tr>
                            <th className="px-3 py-2">时间</th>
                            <th className="px-3 py-2">市场/品种</th>
                            <th className="px-3 py-2">方向</th>
                            <th className="px-3 py-2">建议仓位</th>
                            <th className="px-3 py-2">预计亏损</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.length === 0 ? (
                            <tr>
                              <td className="px-3 py-5 text-slate-400" colSpan={5}>
                                暂无记录
                              </td>
                            </tr>
                          ) : (
                            history.map((item, index) => (
                              <tr key={item.id} className={cn("border-t border-sky-100", index % 2 === 0 ? "bg-white" : "bg-sky-50/40")}>
                                <td className="px-3 py-2 text-slate-500">
                                  {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {item.marketName} · {item.instrumentSymbol}
                                </td>
                                <td className="px-3 py-2">{item.direction === "short" ? "做空" : "做多"}</td>
                                <td className="px-3 py-2 text-sky-700">{item.finalQty}</td>
                                <td className="px-3 py-2 text-rose-600">{formatCurrency(item.estimatedLoss, "CNY")}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="instruments">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader className="flex flex-row items-end justify-between gap-3">
                  <div>
                    <CardTitle>品种列表</CardTitle>
                    <CardDescription>按市场管理可交易品种参数</CardDescription>
                  </div>
                  <div className="w-48">
                    <Select value={configMarketId} onValueChange={(value) => void onConfigMarketChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择市场" />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.id} value={market.id}>
                            {market.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex justify-end">
                    <Button variant="secondary" onClick={startCreateInstrument}>
                      <Plus className="mr-2 h-4 w-4" />
                      新增品种
                    </Button>
                  </div>

                  <div className="max-h-[520px] overflow-auto rounded-xl border border-sky-100">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-sky-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2">代码</th>
                          <th className="px-3 py-2">名称</th>
                          <th className="px-3 py-2">乘数</th>
                          <th className="px-3 py-2">保证金率</th>
                          <th className="px-3 py-2 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configInstruments.length === 0 ? (
                          <tr>
                            <td className="px-3 py-5 text-slate-400" colSpan={5}>
                              当前市场暂无品种
                            </td>
                          </tr>
                        ) : (
                          configInstruments.map((instrument, index) => (
                            <tr key={instrument.id} className={cn("border-t border-sky-100", index % 2 === 0 ? "bg-white" : "bg-sky-50/40")}>
                              <td className="px-3 py-2 font-medium text-slate-700">{instrument.symbol}</td>
                              <td className="px-3 py-2 text-slate-600">{instrument.name}</td>
                              <td className="px-3 py-2">{instrument.contractMultiplier}</td>
                              <td className="px-3 py-2">{formatNumber(instrument.marginRate * 100, 2)}%</td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => startEditInstrument(instrument)}>
                                    <PencilLine className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => void removeInstrument(instrument)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{editingInstrumentId ? "编辑品种" : "新增品种"}</CardTitle>
                  <CardDescription>保存后立即可在计算器中使用</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="市场">
                      <Select
                        value={instrumentDraft.marketId || configMarketId}
                        onValueChange={(value) =>
                          setInstrumentDraft((prev) => ({
                            ...prev,
                            marketId: value,
                            quoteCurrency: value === "global_futures" ? "USD" : "CNY",
                            lotStep: value === "a_share" ? 100 : prev.lotStep,
                            marginRate: value === "a_share" ? 1 : prev.marginRate,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择市场" />
                        </SelectTrigger>
                        <SelectContent>
                          {markets.map((market) => (
                            <SelectItem key={market.id} value={market.id}>
                              {market.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="币种">
                      <Select
                        value={instrumentDraft.quoteCurrency}
                        onValueChange={(value) =>
                          setInstrumentDraft((prev) => ({ ...prev, quoteCurrency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择币种" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="代码">
                      <Input
                        value={instrumentDraft.symbol}
                        onChange={(e) =>
                          setInstrumentDraft((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }))
                        }
                        placeholder="如 RB / ES / 600519.SH"
                      />
                    </Field>
                    <Field label="名称">
                      <Input
                        value={instrumentDraft.name}
                        onChange={(e) => setInstrumentDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="如 螺纹钢"
                      />
                    </Field>
                  </div>

                  <Field label="类别">
                    <Select
                      value={instrumentDraft.category}
                      onValueChange={(value) =>
                        setInstrumentDraft((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择类别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">stock</SelectItem>
                        <SelectItem value="commodity">commodity</SelectItem>
                        <SelectItem value="index">index</SelectItem>
                        <SelectItem value="other">other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="合约乘数">
                      <Input
                        type="number"
                        value={instrumentDraft.contractMultiplier}
                        onChange={(e) => updateDraftNumber("contractMultiplier", e.target.value)}
                      />
                    </Field>
                    <Field label="最小跳动">
                      <Input
                        type="number"
                        value={instrumentDraft.tickSize}
                        onChange={(e) => updateDraftNumber("tickSize", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="最小交易单位">
                      <Input
                        type="number"
                        value={instrumentDraft.lotStep}
                        onChange={(e) => updateDraftNumber("lotStep", e.target.value)}
                      />
                    </Field>
                    <Field label="保证金率 (0~1)">
                      <Input
                        type="number"
                        value={instrumentDraft.marginRate}
                        onChange={(e) => updateDraftNumber("marginRate", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="手续费/单位">
                      <Input
                        type="number"
                        value={instrumentDraft.feePerUnit}
                        onChange={(e) => updateDraftNumber("feePerUnit", e.target.value)}
                      />
                    </Field>
                    <Field label="滑点/单位">
                      <Input
                        type="number"
                        value={instrumentDraft.slippagePerUnit}
                        onChange={(e) => updateDraftNumber("slippagePerUnit", e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="备注">
                    <Input
                      value={instrumentDraft.notes}
                      onChange={(e) => setInstrumentDraft((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="如 交易所、点值说明"
                    />
                  </Field>

                  <Button className="w-full" onClick={() => void saveInstrument()} disabled={loadingSaveInstrument}>
                    <Save className="mr-2 h-4 w-4" />
                    {loadingSaveInstrument ? "保存中..." : "保存品种"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-700">{value}</p>
    </div>
  );
}

export default App;
