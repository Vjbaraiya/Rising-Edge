"""
main.py — Rising Edge IBIS-Studio FastAPI backend
Run with: uvicorn main:app --reload --port 8000

Endpoints:
  POST /api/ibis/parse      — Parse raw IBIS text, return structured JSON
  POST /api/ibis/validate   — Validate parsed IBIS, return scored issues
  POST /api/ibis/report     — Generate PDF/DOCX/HTML/MD report
  POST /api/ibis/generate   — Generate a new IBIS model file from parameters
  GET  /api/health          — Health check
"""
from __future__ import annotations

import sys
import os

# Allow running as: uvicorn main:app from the backend/ directory
# Add backend/ itself so submodules (parser/, validator/, etc.) resolve correctly
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional

from parser.ibis_parser import parse_ibis  # noqa: E402
from validator.ibis_validator import validate  # noqa: E402
from report.report_generator import generate_pdf, generate_docx  # noqa: E402
from models.schemas import ParseRequest, ReportRequest, GenerateRequest  # noqa: E402

app = FastAPI(
    title='IBIS-Studio API',
    description='Rising Edge IBIS model analysis backend',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # In production: lock to your domain
    allow_methods=['GET', 'POST'],
    allow_headers=['*'],
)


@app.get('/api/health')
async def health():
    return {'status': 'ok', 'service': 'IBIS-Studio backend'}


@app.post('/api/ibis/parse')
async def api_parse(req: ParseRequest):
    """Parse a raw IBIS file and return structured data."""
    try:
        parsed = parse_ibis(req.ibis_text, req.file_name)
        return JSONResponse(content=parsed.model_dump())
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post('/api/ibis/validate')
async def api_validate(req: ParseRequest):
    """Parse and validate an IBIS file, return scored results."""
    try:
        parsed = parse_ibis(req.ibis_text, req.file_name)
        result = validate(parsed)
        return JSONResponse(content=result.model_dump())
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post('/api/ibis/report')
async def api_report(req: ReportRequest):
    """Generate a report in the requested format."""
    try:
        parsed = parse_ibis(req.ibis_text, req.file_name)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f'Parse error: {e}')

    fmt = req.format.lower()

    if fmt == 'pdf':
        try:
            data = generate_pdf(parsed)
        except ImportError:
            raise HTTPException(status_code=501, detail='ReportLab not installed. Run: pip install reportlab')
        return Response(
            content=data,
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="ibis-report.pdf"'},
        )

    elif fmt in ('docx', 'word'):
        try:
            data = generate_docx(parsed)
        except ImportError:
            raise HTTPException(status_code=501, detail='python-docx not installed. Run: pip install python-docx')
        return Response(
            content=data,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            headers={'Content-Disposition': f'attachment; filename="ibis-report.docx"'},
        )

    elif fmt == 'html':
        vr = validate(parsed)
        comp = parsed.components[0] if parsed.components else None
        models = comp.models if comp else []
        s_comp = comp.name if comp else '—'
        s_mfr  = (comp.manufacturer if comp else None) or parsed.manufacturer or '—'
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>IBIS Report — {s_comp}</title>
<style>
body {{ font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a2e; }}
h1 {{ color: #6366f1; }} h2 {{ color: #3730a3; border-bottom: 2px solid #eee; padding-bottom:8px; }}
table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
th {{ background: #f0f0ff; }}
.score {{ font-size: 24px; font-weight: 700; color: #6366f1; }}
</style></head><body>
<h1>IBIS Analysis Report</h1>
<p><strong>Component:</strong> {s_comp} &nbsp;&nbsp; <strong>Manufacturer:</strong> {s_mfr}</p>
<p><strong>IBIS Version:</strong> {parsed.version or '—'}</p>
<h2>Scores</h2>
<table><tr><th>Metric</th><th>Score</th></tr>
<tr><td>Overall</td><td class="score">{vr.overall_score}/100</td></tr>
<tr><td>Syntax</td><td>{vr.syntax_score}/100</td></tr>
<tr><td>Simulation Ready</td><td>{vr.sim_score}/100</td></tr>
<tr><td>Quality</td><td>{vr.quality_score}/100</td></tr>
</table>
<h2>Summary</h2>
<table><tr><th>Parameter</th><th>Value</th></tr>
<tr><td>Total Pins</td><td>{len(comp.pins) if comp else 0}</td></tr>
<tr><td>Total Models</td><td>{len(models)}</td></tr>
<tr><td>Has Waveforms</td><td>{'Yes' if any(m.rising_waveforms or m.falling_waveforms for m in models) else 'No'}</td></tr>
<tr><td>Errors</td><td>{vr.counts.get('errors', 0)}</td></tr>
<tr><td>Warnings</td><td>{vr.counts.get('warnings', 0)}</td></tr>
</table>
<p style="color:#888;font-size:11px">IBIS-Studio — Rising Edge</p>
</body></html>"""
        return Response(content=html, media_type='text/html')

    elif fmt in ('md', 'markdown'):
        vr = validate(parsed)
        comp = parsed.components[0] if parsed.components else None
        md = f'# IBIS Analysis Report\n\n'
        md += f'**Component:** {comp.name if comp else "—"}  \n'
        md += f'**IBIS Version:** {parsed.version or "—"}  \n\n'
        md += f'## Scores\n\n| Metric | Score |\n|--------|-------|\n'
        md += f'| Overall | {vr.overall_score}/100 |\n'
        md += f'| Syntax | {vr.syntax_score}/100 |\n'
        md += f'| Sim Ready | {vr.sim_score}/100 |\n'
        md += f'| Quality | {vr.quality_score}/100 |\n\n'
        errors = [i for i in vr.issues if i.severity == 'error']
        warnings = [i for i in vr.issues if i.severity == 'warn']
        if errors or warnings:
            md += '## Issues\n\n'
            for i in errors + warnings:
                icon = '✗' if i.severity == 'error' else '⚠'
                md += f'- {icon} **[{i.rule_id}]** {i.name}: {i.message}\n'
        return Response(content=md, media_type='text/markdown')

    else:
        raise HTTPException(status_code=400, detail=f'Unknown format: {fmt}')


@app.post('/api/ibis/generate')
async def api_generate(req: GenerateRequest):
    """Generate a skeleton IBIS model file from parameters."""
    vdd   = req.voltage_typ
    vmin  = req.voltage_min
    vmax  = req.voltage_max
    ttyp  = req.temp_typ
    tmin  = req.temp_min
    tmax  = req.temp_max
    ccomp = req.c_comp_typ

    ibis = f"""[IBIS Ver]      {req.ibis_ver}
[File Name]     {req.file_name}
[File Rev]      1.0
[Source]        IBIS-Studio — Rising Edge (generated)

[Component]     {req.component_name}
[Manufacturer]  {req.manufacturer or 'Unknown'}

[Package]
R_pkg           100m        80m         120m
L_pkg           2.50n       2.00n       3.00n
C_pkg           0.50p       0.40p       0.60p

[Pin]  signal_name     model_name
1      IO_0            {req.model_name}

[Model]         {req.model_name}
Model_type      {req.model_type}
Vmeas           {vdd / 2:.3f}

[Voltage Range]   {vdd}        {vmin}       {vmax}
[Temperature Range] {ttyp}     {tmin}       {tmax}
[C_comp]          {ccomp:.3e}  NA           NA

[Pullup]
| voltage     I(typ)
{-vdd:.3f}       -40.0m
 0.000           0.000
 {vdd:.3f}        5.0m

[Pulldown]
| voltage     I(typ)
 0.000           0.000
 {vdd/2:.3f}      30.0m
 {vdd:.3f}        40.0m

[Power Clamp]
| voltage     I(typ)
{-vdd:.3f}       -80.0m
 0.000           0.000

[GND Clamp]
| voltage     I(typ)
-0.700          -8.0m
 0.000           0.000

[Ramp]
dV/dt_r      {vdd:.2f}/1n
dV/dt_f      {vdd:.2f}/1n
R_load       50

[End]
"""
    return Response(
        content=ibis,
        media_type='text/plain',
        headers={'Content-Disposition': f'attachment; filename="{req.file_name}"'},
    )


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
