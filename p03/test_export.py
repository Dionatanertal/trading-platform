import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from export import export, summarize

FIXTURE = Path(__file__).parent / "artifacts/first-run"
ROOT = Path(__file__).resolve().parents[1]


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.native = json.loads((FIXTURE / "p03-spy.json").read_text())
        self.events = json.loads((FIXTURE / "p03-spy-order-events.json").read_text())
        self.manifest = json.loads((FIXTURE / "manifest.json").read_text())
        self.console = (FIXTURE / "console.txt").read_text()
        self.report = json.loads(next(FIXTURE.glob("data-monitor-report-*.json")).read_text())

    def summary(self):
        return summarize(self.native, self.events, self.manifest, self.console, self.report)

    def test_native_result_and_export_are_identical(self):
        expected = json.loads((FIXTURE / "dashboard.json").read_text())
        actual = self.summary()
        self.assertEqual(actual, {k: v for k, v in expected.items() if k != "artifactHashes"})
        self.assertEqual(len(actual["equity"]), 396)
        self.assertEqual(actual["equity"][-1]["value"], 101691.9198)
        self.assertEqual(actual["fills"][0]["quantity"], 688)
        self.assertEqual(actual["fills"][0]["fee"], 3.44)

    def test_preserved_artifacts_and_local_inputs_match_hashes(self):
        dashboard = json.loads((FIXTURE / "dashboard.json").read_text())
        for name, digest in dashboard["artifactHashes"].items():
            self.assertEqual(hashlib.sha256((FIXTURE / name).read_bytes()).hexdigest(), digest, name)
        for name, digest in self.manifest["inputs"].items():
            self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), digest, name)
        receipt = json.loads((FIXTURE.parent / "repeat-check.json").read_text())
        content = {key: dashboard[key] for key in receipt["comparedFields"]}
        digest = hashlib.sha256(json.dumps(
            content, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()
        self.assertEqual(digest, receipt["financialContentSha256"])
        self.assertTrue(receipt["equal"])
        self.assertEqual(receipt["runs"][0]["nativeResultSha256"],
                         dashboard["artifactHashes"]["p03-spy.json"])

    def test_exit_success_is_not_sufficient(self):
        for status in ("Running", "RuntimeError", "Stopped"):
            with self.subTest(status=status):
                self.native["state"]["Status"] = status
                with self.assertRaisesRegex(ValueError, "complete"):
                    self.summary()

    def test_rejects_runtime_error_and_failed_process(self):
        self.native["state"]["RuntimeError"] = "Failure"
        with self.assertRaises(ValueError):
            self.summary()
        self.native["state"]["RuntimeError"] = ""
        self.manifest["exitCode"] = 1
        with self.assertRaises(ValueError):
            self.summary()

    def test_rejects_missing_or_failed_data(self):
        self.report["failed-data-requests-count"] = 1
        with self.assertRaisesRegex(ValueError, "historical"):
            self.summary()
        self.report["failed-data-requests-count"] = 0
        self.console = self.console.replace("3,943", "3,942")
        with self.assertRaisesRegex(ValueError, "coverage"):
            self.summary()

    def test_rejects_incomplete_or_inconsistent_curve(self):
        values = self.native["charts"]["Strategy Equity"]["series"]["Equity"]["values"]
        for bad in ([], values[:1], [[1, 2]], [[1, 1, 1, 1, float("nan")], values[-1]]):
            with self.subTest(bad=bad):
                self.native["charts"]["Strategy Equity"]["series"]["Equity"]["values"] = bad
                with self.assertRaises(ValueError):
                    self.summary()
        self.native["charts"]["Strategy Equity"]["series"]["Equity"]["values"] = values
        self.native["statistics"]["End Equity"] = "100000"
        with self.assertRaisesRegex(ValueError, "disagrees"):
            self.summary()

    def test_rejects_unfilled_or_inconsistent_order(self):
        self.events[-1]["status"] = "submitted"
        with self.assertRaisesRegex(ValueError, "filled"):
            self.summary()
        self.events[-1]["status"] = "filled"
        self.events[-1]["fillQuantity"] = 1
        with self.assertRaisesRegex(ValueError, "inconsistent"):
            self.summary()

    def test_rejects_wrong_currency_or_missing_provenance(self):
        self.native["algorithmConfiguration"]["accountCurrency"] = "BRL"
        with self.assertRaises(ValueError):
            self.summary()
        self.native["algorithmConfiguration"]["accountCurrency"] = "USD"
        del self.manifest["inputs"]["Data/equity/usa/hour/spy.zip"]
        with self.assertRaisesRegex(ValueError, "benchmark"):
            self.summary()

    def test_rejects_error_log(self):
        self.console += "\nERROR:: test failure"
        with self.assertRaisesRegex(ValueError, "logged"):
            self.summary()

    def test_export_refuses_overwrite(self):
        with self.assertRaisesRegex(ValueError, "overwrite"):
            export(FIXTURE)

    def test_export_rejects_missing_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "report"):
                export(Path(directory))

    def test_export_does_not_modify_native_objects(self):
        original = copy.deepcopy(self.native)
        self.summary()
        self.assertEqual(self.native, original)


if __name__ == "__main__":
    unittest.main()
