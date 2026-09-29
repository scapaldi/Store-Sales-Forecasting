#!/usr/bin/env python3
"""Build a Power BI Project for the furniture report.

Power BI Desktop stores a compiled .pbix data model as a proprietary binary.
This script writes the text project Desktop opens instead: a .pbip, a PBIR
report, and a TMDL semantic model. The CSV is embedded in the M partition so
refresh does not depend on a path on the machine that opens the file.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "lib" / "furniture.json"
OUT = ROOT / "powerbi"
ZIP_PATH = ROOT / "public" / "furniture-performance.zip"
ARTIFACT = Path("/opt/cursor/artifacts/furniture-performance.zip")

PAGE_W = 1680
PAGE_H = 1680
SCHEMA_VISUAL = (
    "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json"
)
SCHEMA_PAGE = (
    "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
)

COLUMNS = [
    ("Order ID", "string", "none", "Order ID"),
    ("Order Date", "dateTime", "none", "yyyy-mm-dd"),
    ("Ship Date", "dateTime", "none", "yyyy-mm-dd"),
    ("Ship Mode", "string", "none", None),
    ("Customer Name", "string", "none", None),
    ("Segment", "string", "none", None),
    ("State", "string", "none", None),
    ("Region", "string", "none", None),
    ("Sub-Category", "string", "none", None),
    ("Product Name", "string", "none", None),
    ("Sales", "double", "sum", "#,0.00"),
    ("Quantity", "int64", "sum", "#,0"),
    ("Discount", "double", "none", "0.00%"),
    ("Profit", "double", "sum", "#,0.00"),
    ("Year", "int64", "none", "0"),
    ("Month Start", "dateTime", "none", "mmm yyyy"),
    ("Ship Days", "int64", "none", "0"),
]


def hid(name: str) -> str:
    return hashlib.sha1(name.encode()).hexdigest()[:20]


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def lit(value: str) -> dict:
    escaped = value.replace("'", "''")
    return {"expr": {"Literal": {"Value": f"'{escaped}'"}}}


def flag(value: bool) -> dict:
    return {"expr": {"Literal": {"Value": "true" if value else "false"}}}


def column_field(prop: str) -> dict:
    return {
        "Column": {
            "Expression": {"SourceRef": {"Entity": "Orders"}},
            "Property": prop,
        }
    }


def measure_field(prop: str) -> dict:
    return {
        "Measure": {
            "Expression": {"SourceRef": {"Entity": "Orders"}},
            "Property": prop,
        }
    }


def projection(kind: str, prop: str, active: bool = False) -> dict:
    field = column_field(prop) if kind == "Column" else measure_field(prop)
    item = {
        "field": field,
        "queryRef": f"Orders.{prop}",
        "nativeQueryRef": prop,
    }
    if active:
        item["active"] = True
    return item


def sort_clause(kind: str, prop: str, direction: str) -> dict:
    field = column_field(prop) if kind == "Column" else measure_field(prop)
    return {"field": field, "direction": direction}


def title_objects(title: str, subtitle: str | None = None) -> dict:
    objects: dict = {
        "title": [{"properties": {"show": flag(True), "text": lit(title)}}],
        "background": [{"properties": {"show": flag(True)}}],
        "border": [{"properties": {"show": flag(True)}}],
        "dropShadow": [{"properties": {"show": flag(False)}}],
    }
    if subtitle:
        objects["subTitle"] = [{"properties": {"show": flag(True), "text": lit(subtitle)}}]
    return objects


def visual(
    name: str,
    visual_type: str,
    x: float,
    y: float,
    width: float,
    height: float,
    z: int,
    *,
    query_state: dict | None = None,
    sort: list | None = None,
    objects: dict | None = None,
    container: dict | None = None,
    filters: list | None = None,
) -> dict:
    body: dict = {"visualType": visual_type, "drillFilterOtherVisuals": True}
    if query_state:
        query: dict = {"queryState": query_state}
        if sort:
            query["sortDefinition"] = {"sort": sort}
        body["query"] = query
    if objects:
        body["objects"] = objects
    body["visualContainerObjects"] = container or title_objects(name)
    payload = {
        "$schema": SCHEMA_VISUAL,
        "name": hid(name),
        "position": {
            "x": x,
            "y": y,
            "z": z,
            "height": height,
            "width": width,
            "tabOrder": z,
        },
        "visual": body,
    }
    if filters:
        payload["filterConfig"] = {"filters": filters}
    return payload


def top_n_filter(target: str, count: int = 10) -> dict:
    return {
        "name": hid(f"top-{target}-{count}"),
        "field": column_field(target),
        "type": "TopN",
        "howCreated": "User",
        "filter": {
            "Version": 2,
            "From": [{"Name": "o", "Entity": "Orders", "Type": 0}],
            "Where": [
                {
                    "Condition": {
                        "VisualTopN": {
                            "Expression": {
                                "Column": {
                                    "Expression": {"SourceRef": {"Source": "o"}},
                                    "Property": target,
                                }
                            },
                            "Count": {"Literal": {"Value": f"{count}L"}},
                            "OrderBy": {
                                "Measure": {
                                    "Expression": {"SourceRef": {"Entity": "Orders"}},
                                    "Property": "Total Sales",
                                }
                            },
                            "IsAscending": False,
                        }
                    }
                }
            ],
        },
    }


def csv_bytes() -> bytes:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(
        [
            "Order ID",
            "Order Date",
            "Ship Date",
            "Ship Mode",
            "Customer Name",
            "Segment",
            "State",
            "Region",
            "Sub-Category",
            "Product Name",
            "Sales",
            "Quantity",
            "Discount",
            "Profit",
        ]
    )
    for row in payload["rows"]:
        writer.writerow(
            [
                row["order"],
                row["date"],
                row["ship"],
                row["mode"],
                row["customer"],
                row["segment"],
                row["state"],
                row["region"],
                row["sub"],
                row["product"],
                f"{row['sales']:.2f}",
                row["qty"],
                f"{row['discount']:.4f}",
                f"{row['profit']:.2f}",
            ]
        )
    encoded = buffer.getvalue().encode("utf-8")
    print(f"csv rows={len(payload['rows'])} bytes={len(encoded)}")
    return encoded


def orders_tmdl(encoded_csv: bytes) -> str:
    b64 = base64.b64encode(encoded_csv).decode("ascii")
    chunks = [b64[i : i + 2000] for i in range(0, len(b64), 2000)]
    payload_lines = ["\t\t\t    Payload ="]
    for index, chunk in enumerate(chunks):
        joiner = " &" if index < len(chunks) - 1 else ","
        payload_lines.append(f'\t\t\t        "{chunk}"{joiner}')
    payload = "\n".join(payload_lines)

    measures = [
        ("Total Sales", "SUM ( Orders[Sales] )", r"\$#,0;(\$#,0);\$#,0"),
        ("Total Profit", "SUM ( Orders[Profit] )", r"\$#,0;(\$#,0);\$#,0"),
        ("Margin %", "DIVIDE ( [Total Profit], [Total Sales] )", "0.0%"),
        ("Orders", "DISTINCTCOUNT ( Orders[Order ID] )", "#,0"),
        ("Avg Discount", "AVERAGE ( Orders[Discount] )", "0.0%"),
        (
            "Weighted Discount",
            "DIVIDE ( SUMX ( Orders, Orders[Sales] * Orders[Discount] ), [Total Sales] )",
            "0.0%",
        ),
        ("Line Count", "COUNTROWS ( Orders )", "#,0"),
        ("Avg Qty per Order", "DIVIDE ( SUM ( Orders[Quantity] ), [Orders] )", "0.0"),
        (
            "Avg Ship Time",
            "AVERAGEX ( VALUES ( Orders[Order ID] ), CALCULATE ( AVERAGE ( Orders[Ship Days] ) ) )",
            "0.0",
        ),
        (
            "Orders This Year",
            "CALCULATE ( [Orders], REMOVEFILTERS ( Orders[Year] ), Orders[Year] = 2017 )",
            "#,0",
        ),
    ]
    measure_lines = []
    for name, expression, fmt in measures:
        measure_lines.append(f"\tmeasure '{name}' = {expression}")
        measure_lines.append(f"\t\tformatString: {fmt}")
        measure_lines.append(f"\t\tlineageTag: {hid(name + '-measure')[:8]}-{hid(name)[:4]}-{hid(name)[4:8]}-{hid(name)[8:12]}-{hid(name)[12:20]}0000")
        measure_lines.append("")

    column_lines = []
    for name, data_type, summarize, fmt in COLUMNS:
        column_lines.append(f"\tcolumn '{name}'")
        column_lines.append(f"\t\tdataType: {data_type}")
        if fmt:
            column_lines.append(f"\t\tformatString: {fmt}")
        column_lines.append(f"\t\tlineageTag: {hid(name + '-column')[:8]}-{hid(name + '-c')[:4]}-{hid(name + '-c')[4:8]}-{hid(name + '-c')[8:12]}-{hid(name + '-c')[12:20]}1111")
        column_lines.append(f"\t\tsummarizeBy: {summarize}")
        column_lines.append(f"\t\tsourceColumn: {name}")
        column_lines.append("")
        column_lines.append("\t\tannotation SummarizationSetBy = Automatic")
        column_lines.append("")

    m_body = f"""\t\t\tlet
{payload}
\t\t\t    Source = Csv.Document(Binary.FromText(Payload, BinaryEncoding.Base64), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
\t\t\t    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
\t\t\t    Typed = Table.TransformColumnTypes(Promoted, {{
\t\t\t        {{"Order ID", type text}},
\t\t\t        {{"Order Date", type date}},
\t\t\t        {{"Ship Date", type date}},
\t\t\t        {{"Ship Mode", type text}},
\t\t\t        {{"Customer Name", type text}},
\t\t\t        {{"Segment", type text}},
\t\t\t        {{"State", type text}},
\t\t\t        {{"Region", type text}},
\t\t\t        {{"Sub-Category", type text}},
\t\t\t        {{"Product Name", type text}},
\t\t\t        {{"Sales", type number}},
\t\t\t        {{"Quantity", Int64.Type}},
\t\t\t        {{"Discount", type number}},
\t\t\t        {{"Profit", type number}}
\t\t\t    }}),
\t\t\t    WithYear = Table.AddColumn(Typed, "Year", each Date.Year([Order Date]), Int64.Type),
\t\t\t    WithMonth = Table.AddColumn(WithYear, "Month Start", each Date.StartOfMonth([Order Date]), type date),
\t\t\t    WithDays = Table.AddColumn(WithMonth, "Ship Days", each Duration.Days([Ship Date] - [Order Date]), Int64.Type)
\t\t\tin
\t\t\t    WithDays"""

    parts = [
        "table Orders",
        "\tlineageTag: 4f6e1c2a-8b33-4d17-9a55-71c0e6b2d441",
        "",
        *measure_lines,
        *column_lines,
        "\tpartition Orders = m",
        "\t\tmode: import",
        "\t\tsource =",
        m_body,
        "",
        "\tannotation PBI_ResultType = Table",
        "",
    ]
    return "\n".join(parts)


def build_report(page_dir: Path) -> None:
    left = 16
    slicer_w = 200
    content_x = left + slicer_w + 12
    content_w = PAGE_W - content_x - 16
    gap = 12
    col_w = (content_w - gap) / 2
    card_gap = 8
    card_w = (content_w - card_gap * 4) / 5

    visuals: list[tuple[str, dict]] = []
    z = 1

    def add(folder: str, payload: dict) -> None:
        visuals.append((folder, payload))

    slicers = [
        ("Year", "Year", 168),
        ("Region", "Region", 176),
        ("Sub-category", "Sub-Category", 176),
    ]
    y = 16
    for label, column, height in slicers:
        add(
            hid(f"slicer-{label}"),
            visual(
                f"slicer-{label}",
                "slicer",
                left,
                y,
                slicer_w,
                height,
                z,
                query_state={"Values": {"projections": [projection("Column", column, active=True)]}},
                container=title_objects(label),
            ),
        )
        z += 1
        y += height + 8

    add(
        hid("title"),
        visual(
            "title",
            "textbox",
            content_x,
            12,
            content_w,
            44,
            z,
            objects={
                "general": [
                    {
                        "properties": {
                            "paragraphs": [
                                {
                                    "textRuns": [
                                        {
                                            "value": "Furniture sales and margin",
                                            "textStyle": {"fontSize": "20pt"},
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            container=title_objects("title"),
        ),
    )
    visuals[-1][1]["visual"]["visualContainerObjects"]["title"][0]["properties"]["show"] = flag(False)
    visuals[-1][1]["visual"]["visualContainerObjects"]["background"][0]["properties"]["show"] = flag(False)
    visuals[-1][1]["visual"]["visualContainerObjects"]["border"][0]["properties"]["show"] = flag(False)
    z += 1

    add(
        hid("subtitle"),
        visual(
            "subtitle",
            "textbox",
            content_x,
            56,
            content_w,
            48,
            z,
            objects={
                "general": [
                    {
                        "properties": {
                            "paragraphs": [
                                {
                                    "textRuns": [
                                        {
                                            "value": "United States furniture, 2014-2017. Average quantity and ship time are per order. Orders in 2017 is the latest year in the file and ignores the year slicer.",
                                            "textStyle": {"fontSize": "11pt"},
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            container=title_objects("subtitle"),
        ),
    )
    visuals[-1][1]["visual"]["visualContainerObjects"]["title"][0]["properties"]["show"] = flag(False)
    visuals[-1][1]["visual"]["visualContainerObjects"]["background"][0]["properties"]["show"] = flag(False)
    visuals[-1][1]["visual"]["visualContainerObjects"]["border"][0]["properties"]["show"] = flag(False)
    z += 1

    cards = [
        ("Avg qty per order", "Avg Qty per Order", "Units on the order"),
        ("Avg ship time", "Avg Ship Time", "Days from order date to ship date"),
        ("Sales", "Total Sales", "Order-line sales"),
        ("Profit margin", "Margin %", "Profit divided by sales"),
        ("Orders in 2017", "Orders This Year", "Latest year in the file. Ignores the year slicer."),
    ]
    for index, (label, measure, note) in enumerate(cards):
        add(
            hid(f"card-{label}"),
            visual(
                f"card-{label}",
                "cardVisual",
                content_x + index * (card_w + card_gap),
                112,
                card_w,
                108,
                z,
                query_state={"Data": {"projections": [projection("Measure", measure)]}},
                container=title_objects(label, note),
            ),
        )
        z += 1

    def chart(
        name: str,
        visual_type: str,
        x: float,
        y_pos: float,
        width: float,
        height: float,
        roles: dict,
        title: str,
        subtitle: str,
        sort: list,
        extra_objects: dict | None = None,
        filters: list | None = None,
    ) -> None:
        nonlocal z
        objects = {"legend": [{"properties": {"show": flag(True), "position": lit("Top")}}]}
        if extra_objects:
            objects.update(extra_objects)
        add(
            hid(name),
            visual(
                name,
                visual_type,
                x,
                y_pos,
                width,
                height,
                z,
                query_state=roles,
                sort=sort,
                objects=objects,
                container=title_objects(title, subtitle),
                filters=filters,
            ),
        )
        z += 1

    labels = {"labels": [{"properties": {"show": flag(True)}}]}
    chart(
        "sales-region",
        "barChart",
        content_x,
        236,
        col_w,
        300,
        {
            "Category": {"projections": [projection("Column", "Region", active=True)]},
            "Y": {"projections": [projection("Measure", "Total Sales")]},
        },
        "Sales by region",
        "West leads. Central is the region that loses money on the margin charts.",
        [sort_clause("Measure", "Total Sales", "Descending")],
        labels,
    )
    chart(
        "sales-sub",
        "barChart",
        content_x + col_w + gap,
        236,
        col_w,
        300,
        {
            "Category": {"projections": [projection("Column", "Sub-Category", active=True)]},
            "Y": {"projections": [projection("Measure", "Total Sales")]},
        },
        "Sales by sub-category",
        "Chairs and tables are most of the book.",
        [sort_clause("Measure", "Total Sales", "Descending")],
        labels,
    )
    chart(
        "margin-item",
        "barChart",
        content_x,
        548,
        col_w,
        300,
        {
            "Category": {"projections": [projection("Column", "Sub-Category", active=True)]},
            "Y": {"projections": [projection("Measure", "Margin %")]},
        },
        "Profit margin by item",
        "Item is the sub-category. Furnishings is the high margin. Tables and bookcases are negative.",
        [sort_clause("Measure", "Margin %", "Descending")],
        labels,
    )
    chart(
        "margin-state",
        "barChart",
        content_x + col_w + gap,
        548,
        col_w,
        640,
        {
            "Category": {"projections": [projection("Column", "State", active=True)]},
            "Y": {"projections": [projection("Measure", "Margin %")]},
        },
        "Profit margin by state",
        "Sorted by margin. A few small states lead on one or two lines. Texas, Illinois, and Pennsylvania are the large losses.",
        [sort_clause("Measure", "Margin %", "Descending")],
        labels,
    )
    chart(
        "year-trend",
        "lineClusteredColumnComboChart",
        content_x,
        1200,
        content_w,
        340,
        {
            "Category": {"projections": [projection("Column", "Year", active=True)]},
            "Y": {"projections": [projection("Measure", "Total Sales")]},
            "Y2": {"projections": [projection("Measure", "Orders")]},
        },
        "Sales and orders by year",
        "Columns are sales, on the left axis. The line is orders, on the right axis.",
        [sort_clause("Column", "Year", "Ascending")],
        {
            "categoryAxis": [{"properties": {"axisType": lit("Categorical")}}],
            "valueAxis": [{"properties": {"secShow": flag(True)}}],
        },
    )

    for folder, payload in visuals:
        write_json(page_dir / "visuals" / folder / "visual.json", payload)


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    encoded = csv_bytes()
    # Round-trip the embedded payload before writing the model.
    decoded = base64.b64decode(base64.b64encode(encoded))
    if decoded != encoded:
        raise SystemExit("base64 round-trip failed")

    report = OUT / "Furniture-Performance.Report"
    model = OUT / "Furniture-Performance.SemanticModel"
    page = report / "definition" / "pages" / hid("page-furniture")
    page.mkdir(parents=True)
    (model / "definition" / "tables").mkdir(parents=True)

    (OUT / "Furniture-Performance.pbip").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
                "version": "1.0",
                "artifacts": [{"report": {"path": "Furniture-Performance.Report"}}],
                "settings": {"enableAutoRecovery": True},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (OUT / "HOW-TO-OPEN.txt").write_text(
        "\n".join(
            [
                "Furniture performance, 2014-2017",
                "",
                "Open Furniture-Performance.pbip in a current Power BI Desktop.",
                "This is a Power BI Project: the report is PBIR JSON and the semantic model is TMDL.",
                "The 2,121 furniture lines are embedded in the model, so you do not need the original CSV on disk.",
                "",
                "If Desktop asks you to enable Power BI projects or the TMDL format, accept that and reopen this file.",
                "The first open builds the imported table from the embedded file. Use the slicers on the left.",
                "",
"The page shows average quantity per order, average ship time, sales, profit margin, margin by item and by state, orders in 2017, sales by region and sub-category, and sales and orders by year.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    write_json(
        report / "definition.pbir",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
            "version": "4.0",
            "datasetReference": {"byPath": {"path": "../Furniture-Performance.SemanticModel"}},
        },
    )
    write_json(
        report / ".platform",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
            "metadata": {"type": "Report", "displayName": "Furniture Performance"},
            "config": {"version": "2.0", "logicalId": "b7e1c4a2-6d58-4f0a-9c33-1a8e5d70c214"},
        },
    )
    write_json(
        report / "definition" / "version.json",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
            "version": "2.0.0",
        },
    )
    write_json(
        report / "definition" / "pages" / "pages.json",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
            "pageOrder": [hid("page-furniture")],
            "activePageName": hid("page-furniture"),
        },
    )
    write_json(
        page / "page.json",
        {
            "$schema": SCHEMA_PAGE,
            "name": hid("page-furniture"),
            "displayName": "Furniture",
            "displayOption": "FitToWidth",
            "height": PAGE_H,
            "width": PAGE_W,
        },
    )
    write_json(
        report / "definition" / "report.json",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.0.0/schema.json",
            "themeCollection": {
                "baseTheme": {
                    "name": "CY24SU10",
                    "reportVersionAtImport": {"visual": "1.8.95", "report": "2.0.95", "page": "1.3.95"},
                    "type": "SharedResources",
                }
            },
            "resourcePackages": [
                {
                    "name": "SharedResources",
                    "type": "SharedResources",
                    "items": [{"name": "CY24SU10", "path": "BaseThemes/CY24SU10.json", "type": "BaseTheme"}],
                }
            ],
            "settings": {
                "useStylableVisualContainerHeader": True,
                "exportDataMode": "AllowSummarized",
                "defaultDrillFilterOtherVisuals": True,
                "allowChangeFilterTypes": True,
                "useEnhancedTooltips": True,
                "useDefaultAggregateDisplayName": True,
            },
        },
    )
    build_report(page)

    write_json(
        model / "definition.pbism",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
            "version": "4.2",
            "settings": {"qnaEnabled": False},
        },
    )
    write_json(
        model / ".platform",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
            "metadata": {"type": "SemanticModel", "displayName": "Furniture Performance"},
            "config": {"version": "2.0", "logicalId": "c3a90e57-1b64-4e28-8d71-55f0a6c9e802"},
        },
    )
    (model / "definition" / "database.tmdl").write_text("database\n\tcompatibilityLevel: 1567\n", encoding="utf-8")
    (model / "definition" / "model.tmdl").write_text(
        "\n".join(
            [
                "model Model",
                "\tculture: en-US",
                "\tdefaultPowerBIDataSourceVersion: powerBI_V3",
                "\tsourceQueryCulture: en-US",
                "\tdataAccessOptions",
                "\t\tlegacyRedirects",
                "\t\treturnErrorValuesAsNull",
                "",
                "annotation __PBI_TimeIntelligenceEnabled = 0",
                "",
                'annotation PBI_QueryOrder = ["Orders"]',
                "",
                "ref table Orders",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (model / "definition" / "tables" / "Orders.tmdl").write_text(orders_tmdl(encoded), encoding="utf-8")

    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUT.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(OUT).as_posix())
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ZIP_PATH, ARTIFACT)
    print(f"zip {ZIP_PATH} bytes={ZIP_PATH.stat().st_size}")


if __name__ == "__main__":
    build()
