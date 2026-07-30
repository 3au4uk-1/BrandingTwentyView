#!/usr/bin/env python3
"""Add PROIZVODSTVO to dealLineItem.tip SELECT options (idempotent)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid

PROIZVODSTVO = {
    "value": "PROIZVODSTVO",
    "label": "Производство",
    "color": "orange",
}


def gql(base: str, api_key: str, query: str, variables: dict | None = None) -> dict:
    body: dict = {"query": query}
    if variables is not None:
        body["variables"] = variables
    req = urllib.request.Request(
        f"{base.rstrip('/')}/metadata",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        payload = json.load(resp)
    if payload.get("errors"):
        raise SystemExit(json.dumps(payload["errors"], ensure_ascii=False, indent=2))
    return payload["data"]


def main() -> None:
    base = os.environ["TWENTY_BASE_URL"].rstrip("/")
    api_key = os.environ["TWENTY_API_KEY"]

    data = gql(
        base,
        api_key,
        """
        query {
          fields(filter: { name: { eq: "tip" } }, paging: { first: 50 }) {
            edges { node { id name options object { nameSingular } } }
          }
        }
        """,
    )
    edges = data["fields"]["edges"]
    tip = next(
        (
            e["node"]
            for e in edges
            if e["node"]["name"] == "tip"
            and (e["node"].get("object") or {}).get("nameSingular") == "dealLineItem"
        ),
        None,
    )
    if tip is None:
        tip = next((e["node"] for e in edges if e["node"]["name"] == "tip"), None)
    if tip is None:
        raise SystemExit("tip field not found")

    options = list(tip.get("options") or [])
    if any(opt.get("value") == "PROIZVODSTVO" for opt in options):
        print(f"OK already present on {base} field={tip['id']} options={len(options)}")
        return

    # Insert after PODRYAD when possible; otherwise append before NE_NASHE/RESTAVRACIYA tail.
    new_opt = {
        "id": str(uuid.uuid4()),
        "value": PROIZVODSTVO["value"],
        "label": PROIZVODSTVO["label"],
        "color": PROIZVODSTVO["color"],
        "position": 0,
    }
    insert_at = len(options)
    for i, opt in enumerate(options):
        if opt.get("value") == "PODRYAD":
            insert_at = i + 1
            break
    options.insert(insert_at, new_opt)
    for i, opt in enumerate(options):
        opt["position"] = i

    updated = gql(
        base,
        api_key,
        """
        mutation($id: UUID!, $options: [FieldMetadataOptionInput!]!) {
          updateOneField(input: { id: $id, update: { options: $options } }) {
            id
            options
          }
        }
        """,
        {"id": tip["id"], "options": options},
    )
    values = [o.get("value") for o in (updated["updateOneField"].get("options") or [])]
    print(f"OK updated {base} field={tip['id']} values={values}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(body, file=sys.stderr)
        raise SystemExit(f"HTTP {exc.code}") from exc
