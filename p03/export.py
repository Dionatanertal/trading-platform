"""Validate native LEAN evidence and export the fixed P03 dashboard contract."""

import argparse
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re


def require(condition, message):
    if not condition:
        raise ValueError(message)


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def summarize(native, events, manifest, console, report):
    require(manifest["exitCode"] == 0, "LEAN process did not exit successfully")
    state = native["state"]
    require(state["Status"] == "Completed" and not state["RuntimeError"]
            and not state["StackTrace"], "LEAN did not complete without runtime errors")
    require("ERROR::" not in console, "LEAN logged an error")
    require("Loaded BasicTemplateAlgorithm" in console
            and "BacktestingBrokerage" in console
            and "Analysis Completed and Results Posted." in console,
            "Missing LEAN execution/backtesting markers")
    match = re.search(r"Processing total of ([\d,]+) data points", console)
    require(match is not None, "Missing processed data point count")
    points = int(match[1].replace(",", ""))
    require(points == 3943, "Unexpected P03 data coverage (expected 3943 points)")
    require(report["failed-data-requests-count"] == 0
            and report["succeeded-data-requests-count"] == 11,
            "Missing or failed historical data requests")
    config = native["algorithmConfiguration"]
    require(config["accountCurrency"] == "USD"
            and config["startDate"] == "2013-10-07T00:00:00Z"
            and config["endDate"] == "2013-10-11T23:59:59Z",
            "Unexpected algorithm currency/date range")

    stats = native["statistics"]
    for key in ("Start Equity", "End Equity", "Net Profit", "Drawdown", "Total Fees", "Total Orders"):
        require(isinstance(stats[key], str) and bool(stats[key]), f"Missing statistic: {key}")
    values = native["charts"]["Strategy Equity"]["series"]["Equity"]["values"]
    require(len(values) >= 2, "Missing equity series")
    equity = []
    previous = 0
    for candle in values:
        require(len(candle) == 5 and all(finite(n) for n in candle),
                "Expected native [timestamp, open, high, low, close] equity candles")
        time, opened, high, low, close = candle
        require(time > previous and low <= min(opened, close)
                and high >= max(opened, close), "Invalid equity candle")
        equity.append({"time": time, "value": close})
        previous = time
    require(abs(equity[0]["value"] - float(stats["Start Equity"])) < 0.01
            and abs(equity[-1]["value"] - float(stats["End Equity"])) < 0.01,
            "Equity curve disagrees with native statistics")
    require(equity[0]["value"] == 100000, "Unexpected initial capital")

    orders = native["orders"]
    fills = [event for event in events if event["status"] == "filled"]
    require(len(orders) == len(fills) == int(stats["Total Orders"]) == 1,
            "Expected one native filled SPY order")
    fill = fills[0]
    order = orders[str(fill["orderId"])]
    require(fill["symbolValue"] == order["symbol"]["value"] == "SPY"
            and order["status"] == 3 and fill["direction"] == "buy"
            and finite(fill["fillQuantity"]) and fill["fillQuantity"] > 0
            and finite(fill["fillPrice"]) and fill["fillPrice"] > 0
            and order["quantity"] == fill["fillQuantity"]
            and order["price"] == fill["fillPrice"]
            and fill["fillPriceCurrency"] == fill["orderFeeCurrency"] == "USD",
            "Invalid or inconsistent native fill")
    require(datetime.fromisoformat(order["lastFillTime"]).timestamp() == fill["time"],
            "Order/fill timestamps disagree")
    require(all(re.fullmatch(r"[a-f0-9]{64}", digest)
                for digest in manifest["inputs"].values()), "Invalid input hashes")
    require("Data/equity/usa/hour/spy.zip" in manifest["inputs"],
            "Missing benchmark data provenance")
    return {
        "schemaVersion": 1,
        "runId": "p03-spy",
        "status": state["Status"],
        "strategy": "BasicTemplateAlgorithm",
        "engine": {
            "name": "QuantConnect LEAN",
            "version": native["serverStatistics"]["LEAN Version"],
            "sourceCommit": manifest["sourceCommit"],
            "assemblies": manifest["assemblies"],
        },
        "execution": {
            "startedAtUtc": manifest["startedAtUtc"],
            "finishedAtUtc": manifest["finishedAtUtc"],
            "exitCode": manifest["exitCode"],
            "dataPoints": points,
            "succeededDataRequests": report["succeeded-data-requests-count"],
            "failedDataRequests": report["failed-data-requests-count"],
        },
        "dataset": {
            "symbol": "SPY", "market": "USA", "resolution": "Minute",
            "start": config["startDate"], "end": config["endDate"],
            "currency": config["accountCurrency"],
            "source": "LEAN repository sample data; Algoseek — ALL RIGHTS RESERVED",
            "notice": "Historical test samples; not live, not B3; quality/completeness not independently audited.",
            "inputs": manifest["inputs"],
        },
        "statistics": stats,
        "equity": equity,
        "fills": [{
            "orderId": fill["orderId"], "symbol": fill["symbolValue"],
            "status": fill["status"], "time": fill["time"],
            "quantity": fill["fillQuantity"], "price": fill["fillPrice"],
            "fee": fill["orderFeeAmount"], "currency": fill["fillPriceCurrency"],
        }],
    }


def export(directory):
    dashboard = directory / "dashboard.json"
    require(not dashboard.exists(), f"Refusing to overwrite {dashboard}")
    reports = list(directory.glob("data-monitor-report-*.json"))
    require(len(reports) == 1, "Expected exactly one native data monitor report")
    paths = [directory / name for name in (
        "p03-spy.json", "p03-spy-order-events.json", "manifest.json", "console.txt",
    )] + reports
    native, events, manifest = [json.loads(path.read_text()) for path in paths[:3]]
    summary = summarize(native, events, manifest, paths[3].read_text(),
                        json.loads(reports[0].read_text()))
    summary["artifactHashes"] = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths
    }
    dashboard.write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n")
    print(f"Validated: Completed, 3943 data points, native SPY fill; exported {dashboard}")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    export(parser.parse_args().directory)
