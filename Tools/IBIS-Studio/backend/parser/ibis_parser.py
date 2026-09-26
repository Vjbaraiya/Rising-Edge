"""
ibis_parser.py — Python IBIS file parser for the FastAPI backend.
Mirrors the logic in js/parser.js but returns Pydantic model instances.
"""
from __future__ import annotations
import math
import re
from typing import Optional, Tuple
import sys, os
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from models.schemas import (
    ParsedIBIS, IBISComponent, IBISModel, PinEntry, PackageData,
    CornerValues, IVPoint, WaveformTable, WaveformPoint, RampData,
)

UNIT_MAP = {
    'f': 1e-15, 'p': 1e-12, 'n': 1e-9, 'u': 1e-6, 'm': 1e-3,
    'k': 1e3,   'M': 1e6,   'G': 1e9,
}


def parse_value(s: str) -> Optional[float]:
    if not s:
        return None
    s = s.strip().lower()
    if s in ('na', 'n/a', ''):
        return None
    m = re.match(r'^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([fpnumkMG]?)(.*)$', s, re.IGNORECASE)
    if not m:
        return None
    num = float(m.group(1))
    suffix = m.group(2)
    return num * UNIT_MAP.get(suffix, 1.0)


def split_corners(s: str) -> CornerValues:
    if not s:
        return CornerValues()
    parts = s.strip().split()
    return CornerValues(
        typ=parse_value(parts[0]) if len(parts) > 0 else None,
        min=parse_value(parts[1]) if len(parts) > 1 else None,
        max=parse_value(parts[2]) if len(parts) > 2 else None,
    )


def parse_ibis(text: str, file_name: str = '') -> ParsedIBIS:
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    result = ParsedIBIS(file_name=file_name)

    current_comp: Optional[IBISComponent] = None
    current_model: Optional[IBISModel] = None
    current_wf: Optional[WaveformTable] = None
    in_section: str = ''

    for raw in lines:
        # Strip inline comment
        ci = raw.find('|')
        line = (raw[:ci] if ci >= 0 else raw).strip()
        if not line:
            continue

        if line.startswith('['):
            m = re.match(r'^\[([^\]]+)\](.*)', line)
            if not m:
                continue
            kw = m.group(1).strip().lower().replace(' ', '_')
            rest = m.group(2).strip()

            if kw == 'ibis_ver':
                result.version = rest
            elif kw == 'file_name':
                result.file_name = rest
            elif kw == 'file_rev':
                result.file_rev = rest
            elif kw == 'date':
                result.date = rest
            elif kw == 'source':
                result.source = rest
            elif kw == 'manufacturer' and current_comp is None:
                result.manufacturer = rest
            elif kw == 'manufacturer' and current_comp is not None:
                current_comp.manufacturer = rest
            elif kw == 'component':
                current_comp = IBISComponent(name=rest)
                result.components.append(current_comp)
                current_model = None
                in_section = 'component'
            elif kw == 'package':
                in_section = 'package'
                if current_comp and not current_comp.package:
                    current_comp.package = PackageData()
            elif kw == 'pin':
                in_section = 'pin'
            elif kw == 'diff_pin':
                in_section = 'diff_pin'
            elif kw == 'model':
                in_section = 'model'
                current_model = IBISModel(name=rest)
                if current_comp:
                    current_comp.models.append(current_model)
                current_wf = None
            elif kw == 'voltage_range' and current_model:
                current_model.voltage_range = split_corners(rest)
            elif kw == 'temperature_range' and current_model:
                current_model.temp_range = split_corners(rest)
            elif kw == 'c_comp' and current_model:
                current_model.c_comp = split_corners(rest)
            elif kw == 'ramp':
                in_section = 'ramp'
                if current_model and not current_model.ramp:
                    current_model.ramp = RampData()
            elif kw == 'pullup':
                in_section = 'pullup'
            elif kw == 'pulldown':
                in_section = 'pulldown'
            elif kw == 'power_clamp':
                in_section = 'power_clamp'
            elif kw == 'gnd_clamp':
                in_section = 'gnd_clamp'
            elif kw in ('rising_waveform', 'falling_waveform'):
                wf_type = 'rising' if kw == 'rising_waveform' else 'falling'
                current_wf = WaveformTable(type=wf_type)
                if current_model:
                    if wf_type == 'rising':
                        current_model.rising_waveforms.append(current_wf)
                    else:
                        current_model.falling_waveforms.append(current_wf)
                in_section = 'waveform'
            elif kw == 'end':
                in_section = ''
                current_model = None
                current_wf = None
            continue

        # Data lines
        cols = line.split()
        if not cols:
            continue

        if in_section == 'package' and current_comp:
            if not current_comp.package:
                current_comp.package = PackageData()
            kl = cols[0].lower()
            rest_str = ' '.join(cols[1:])
            if kl == 'r_pkg':
                current_comp.package.r = split_corners(rest_str)
            elif kl == 'l_pkg':
                current_comp.package.l = split_corners(rest_str)
            elif kl == 'c_pkg':
                current_comp.package.c = split_corners(rest_str)

        elif in_section == 'pin' and current_comp:
            if len(cols) >= 3:
                current_comp.pins.append(PinEntry(
                    number=cols[0],
                    signal_name=cols[1],
                    model_name=cols[2],
                    r_pin=parse_value(cols[3]) if len(cols) > 3 else None,
                    l_pin=parse_value(cols[4]) if len(cols) > 4 else None,
                    c_pin=parse_value(cols[5]) if len(cols) > 5 else None,
                ))

        elif in_section == 'model' and current_model:
            kl = cols[0].lower()
            val = cols[1] if len(cols) > 1 else ''
            if kl == 'model_type':
                current_model.model_type = val
            elif kl == 'polarity':
                current_model.polarity = val

        elif in_section == 'ramp' and current_model:
            if not current_model.ramp:
                current_model.ramp = RampData()
            kl = cols[0].lower()
            rest_str = ' '.join(cols[1:])
            if kl == 'dv/dt_r':
                current_model.ramp.dvdt_r = split_corners(rest_str)
            elif kl == 'dv/dt_f':
                current_model.ramp.dvdt_f = split_corners(rest_str)
            elif kl == 'r_load':
                current_model.ramp.r_load = parse_value(cols[1]) if len(cols) > 1 else None

        elif in_section in ('pullup', 'pulldown', 'power_clamp', 'gnd_clamp') and current_model:
            if len(cols) >= 2:
                v = parse_value(cols[0])
                if v is not None:
                    pt = IVPoint(
                        v=v,
                        typ=parse_value(cols[1]),
                        min=parse_value(cols[2]) if len(cols) > 2 else None,
                        max=parse_value(cols[3]) if len(cols) > 3 else None,
                    )
                    if in_section == 'pullup':
                        current_model.pullup.append(pt)
                    elif in_section == 'pulldown':
                        current_model.pulldown.append(pt)
                    elif in_section == 'power_clamp':
                        current_model.pwr_clamp.append(pt)
                    elif in_section == 'gnd_clamp':
                        current_model.gnd_clamp.append(pt)

        elif in_section == 'waveform' and current_wf:
            kl = cols[0].lower()
            if kl == 'r_fixture':
                current_wf.r_fixture = parse_value(cols[1]) if len(cols) > 1 else None
            elif kl == 'v_fixture':
                current_wf.v_fixture = parse_value(cols[1]) if len(cols) > 1 else None
            elif len(cols) >= 2:
                t = parse_value(cols[0])
                if t is not None:
                    current_wf.points.append(WaveformPoint(
                        t=t,
                        typ=parse_value(cols[1]),
                        min=parse_value(cols[2]) if len(cols) > 2 else None,
                        max=parse_value(cols[3]) if len(cols) > 3 else None,
                    ))

    return result
