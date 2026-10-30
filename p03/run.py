"""Run the fixed upstream SPY backtest using native .NET, never live trading."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

from export import export

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "Launcher/bin/Release"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def input_files():
    paths = [
        "Algorithm.CSharp/BasicTemplateAlgorithm.cs",
        "p03/config.json",
        "Data/equity/usa/map_files/spy.csv",
        "Data/equity/usa/factor_files/spy.csv",
        "Data/equity/usa/hour/spy.zip",
        "Data/market-hours/market-hours-database.json",
        "Data/symbol-properties/symbol-properties-database.csv",
        "Data/alternative/interest-rate/usa/interest-rate.csv",
    ]
    for day in ("07", "08", "09", "10", "11"):
        for kind in ("trade", "quote"):
            paths.append(f"Data/equity/usa/minute/spy/201310{day}_{kind}.zip")
    return {path: sha256(ROOT / path) for path in paths}


def run(output):
    output = output.resolve()
    # Never overwrite an earlier run, even if it failed.
    output.mkdir(parents=True, exist_ok=False)
    inputs = input_files()
    with (output / "build.txt").open("w") as log:
        subprocess.run(
            ["dotnet", "build", str(ROOT / "Launcher/QuantConnect.Lean.Launcher.csproj"),
             "--configuration", "Release", "--verbosity", "quiet"],
            cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=600,
        )
    config = json.loads((ROOT / "p03/config.json").read_text())
    config.update({
        "data-folder": str(ROOT / "Data"),
        "algorithm-location": str(BUILD / "QuantConnect.Algorithm.CSharp.dll"),
        "results-destination-folder": str(output),
        "object-store-root": str(output / "storage"),
    })
    config_path = output / "effective-config.json"
    config_path.write_text(json.dumps(config, indent=2) + "\n")
    manifest = {
        "schemaVersion": 1,
        "sourceCommit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "startedAtUtc": datetime.now(timezone.utc).isoformat(),
        "dotnetSdk": subprocess.check_output(["dotnet", "--version"], text=True).strip(),
        "runnerSha256": sha256(Path(__file__)),
        "exporterSha256": sha256(ROOT / "p03/export.py"),
        "effectiveConfigSha256": sha256(config_path),
        "inputs": inputs,
        "assemblies": {
            name: sha256(BUILD / name) for name in (
                "QuantConnect.Lean.Launcher.dll", "QuantConnect.Lean.Engine.dll",
                "QuantConnect.Algorithm.CSharp.dll",
            )
        },
    }
    with (output / "console.txt").open("w") as log:
        result = subprocess.run(
            ["dotnet", str(BUILD / "QuantConnect.Lean.Launcher.dll"),
             "--config", str(config_path)],
            cwd=BUILD, stdout=log, stderr=subprocess.STDOUT, timeout=180,
        )
    manifest["exitCode"] = result.returncode
    manifest["finishedAtUtc"] = datetime.now(timezone.utc).isoformat()
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    result.check_returncode()
    export(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="New directory for this execution")
    run(parser.parse_args().output)
