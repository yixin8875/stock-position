# 全市场仓位计算器

基于 `Wails + Go + SQLite + React + TailwindCSS` 的桌面仓位计算工具。

覆盖市场：
- A股
- 国内期货
- 海外期货（含汇率换算）

## 核心规则

以损定仓，统一公式：

1. `risk_budget = account_equity * risk_pct`
2. `unit_risk = abs(entry - stop) * multiplier * fx + (fee + slippage) * fx`
3. `qty_by_risk = floor(risk_budget / unit_risk)`
4. `qty_by_margin = floor(available_funds * margin_usage_limit / margin_per_unit)`
5. `final_qty = lot_step对齐(min(qty_by_risk, qty_by_margin, max_position_limit))`

## 本地开发

```bash
wails dev
```

## 打包构建

```bash
wails build
```

## GitHub Tag 自动发布

已集成 GitHub Actions 工作流：

- 文件：`.github/workflows/release-tag.yml`
- 触发：推送 tag（`v*`）
- 动作：自动构建 `macOS(universal)` 和 `Windows(amd64)`，并上传到 GitHub Release

发布步骤：

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送后在 GitHub 的 `Actions` 里能看到构建任务，成功后在 `Releases` 出现对应版本资产包。

## 数据库位置

应用会在本机用户配置目录自动创建 SQLite：

- macOS: `~/Library/Application Support/stock-position/position_calculator.db`
- 路径来自 Go 的 `os.UserConfigDir()`，不同系统会自动适配。

## 当前内置品种

- A股：`600519.SH`, `300750.SZ`
- 国内期货：`RB`, `IF`
- 海外期货：`ES`, `GC`

可在 `store.go` 的 `seedInstruments()` 里继续扩展。
