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


def find_tip_field(base: str, api_key: str) -> dict:
    # Prefer object → fields (works across Twenty metadata schema versions).
    data = gql(
        base,
        api_key,
        """
        query {
          objects(paging: { first: 200 }) {
            edges {
              node {
                id
                nameSingular
                fieldsList {
                  id
                  name
                  options
                }
              }
            }
          }
        }
        """,
    )
    for edge in data["objects"]["edges"]:
        node = edge["node"]
        if node.get("nameSingular") != "dealLineItem":
            continue
        fields = node.get("fieldsList") or []
        tip = next((f for f in fields if f.get("name") == "tip"), None)
        if tip:
            return tip

    # Fallback: flat fields connection without name filter.
    data = gql(
        base,
        api_key,
        """
        query {
          fields(paging: { first: 500 }) {
            edges {
              node {
                id
                name
                options
                object { nameSingular }
              }
            }
          }
        }
        """,
    )
    for edge in data["fields"]["edges"]:
        node = edge["node"]
        if node.get("name") != "tip":
            continue
        obj = node.get("object") or {}
        if obj.get("nameSingular") in (None, "dealLineItem"):
            return node
    raise SystemExit("tip field not found on dealLineItem")


def main() -> None:
    base = os.environ["TWENTY_BASE_URL"].rstrip("/")
    api_key = os.environ["TWENTY_API_KEY"]

    tip = find_tip_field(base, api_key)
    options = list(tip.get("options") or [])
    if any(opt.get("value") == "PROIZVODSTVO" for opt in options):
        print(f"OK already present on {base} field={tip['id']} options={len(options)}")
        return

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

    # Drop unknown keys Twenty may reject on input.
    clean_options = [
        {
            "id": opt["id"],
            "value": opt["value"],
            "label": opt["label"],
            "color": opt.get("color") or "gray",
            "position": opt["position"],
        }
        for opt in options
        if opt.get("id") and opt.get("value") and opt.get("label") is not None
    ]

    updated = gql(
        base,
        api_key,
        """
        mutation($id: UUID!, $update: UpdateFieldInput!) {
          updateOneField(input: { id: $id, update: $update }) {
            id
            options
          }
        }
        """,
        {"id": tip["id"], "update": {"options": clean_options}},
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
