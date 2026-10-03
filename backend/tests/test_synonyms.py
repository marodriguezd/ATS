"""Keyword engine: precision-first lexical matching + conformance fixture."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.synonyms import classify_keyword_match

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "fixtures", "ats_conformance.json")


def test_legitimate_aliases():
    assert classify_keyword_match("PostgreSQL", "Worked with Postgres daily")[0] == "ALIAS"
    assert classify_keyword_match("Kubernetes", "Deployed to k8s")[0] == "ALIAS"
    assert classify_keyword_match("CI/CD", "Built ci-cd pipelines")[0] in ("EXACT", "ALIAS")
    assert classify_keyword_match("DAM", "Desarrollo de Aplicaciones Multiplataforma")[0] == "ALIAS"


def test_precision_git_vs_github_and_ci_vs_cicd():
    assert classify_keyword_match("GitHub", "Used git for version control")[0] in ("RELATED", "ABSENT")
    assert classify_keyword_match("GitHub", "Used git for version control")[0] != "EXACT"
    assert classify_keyword_match("GitHub", "Used git for version control")[0] != "ALIAS"
    assert classify_keyword_match("CI/CD", "Ran CI builds")[0] != "ALIAS"
    assert classify_keyword_match("CI/CD", "Ran CI builds")[0] != "EXACT"


def test_short_alias_boundaries():
    # 'ts' inside 'its' must not match TypeScript
    assert classify_keyword_match("TypeScript", "fits its purpose")[0] == "ABSENT"
    assert classify_keyword_match("TypeScript", "Built with TS and React")[0] == "ALIAS"


def test_conformance_fixture():
    with open(FIXTURE) as f:
        data = json.load(f)
    for case in data["cases"]:
        if "keyword" not in case:
            continue
        got, _ = classify_keyword_match(case["keyword"], case["text"])
        if case["expected_match"] == "ABSENT":
            assert got in ("ABSENT", "RELATED"), case["id"]
        else:
            assert got == case["expected_match"], case["id"]
