"""
ibis_validator.py — Server-side IBIS validation engine.
Returns structured ValidationResult with scored rules.
"""
from __future__ import annotations
from typing import List, Dict
import sys, os
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from models.schemas import ParsedIBIS, ValidationResult, ValidationIssue

SEV = dict(ERROR='error', WARN='warn', INFO='info', PASS='pass')

RULES = [
    ('R001', 'IBIS Version present',       'File Header', 10),
    ('R002', 'File name present',           'File Header',  3),
    ('R003', 'Manufacturer present',        'File Header',  3),
    ('R004', 'At least one component',      'Component',   15),
    ('R005', 'Component has pins',          'Pins',        10),
    ('R006', 'Pins reference valid models', 'Pins',         8),
    ('R007', 'At least one model',          'Models',      15),
    ('R008', 'Model_type set',              'Models',       8),
    ('R009', 'Voltage range defined',       'Models',       5),
    ('R010', 'Output I(V) tables present',  'I(V) Tables', 10),
    ('R011', 'Clamp tables present',        'I(V) Tables',  5),
    ('R012', 'Waveform tables present',     'Waveforms',    8),
    ('R013', 'Ramp data present',           'Waveforms',    5),
    ('R014', 'Package parasitics defined',  'Package',      4),
    ('R015', 'C_comp defined',              'Models',       4),
    ('R016', 'IBIS version >= 3.2',         'File Header',  3),
    ('R017', 'Waveform time is monotonic',  'Waveforms',    5),
    ('R018', 'I(V) tables >= 2 points',     'I(V) Tables',  4),
]

def _pass(msg): return SEV['PASS'],  msg
def _fail(msg): return SEV['ERROR'], msg
def _warn(msg): return SEV['WARN'],  msg
def _info(msg): return SEV['INFO'],  msg
def _skip(msg): return SEV['INFO'],  f'Skipped: {msg}'


def _check(rule_id: str, parsed: ParsedIBIS):
    comp = parsed.components[0] if parsed.components else None
    models = comp.models if comp else []

    if rule_id == 'R001':
        return _pass(f'IBIS ver: {parsed.version}') if parsed.version else _fail('Missing [IBIS Ver]')
    if rule_id == 'R002':
        return _pass(parsed.file_name) if parsed.file_name else _warn('Missing [File Name]')
    if rule_id == 'R003':
        mfr = parsed.manufacturer or (comp.manufacturer if comp else '')
        return _pass(mfr) if mfr else _warn('Missing [Manufacturer]')
    if rule_id == 'R004':
        n = len(parsed.components)
        return _pass(f'{n} component(s)') if n > 0 else _fail('No [Component] block')
    if rule_id == 'R005':
        if not comp: return _fail('No component')
        n = len(comp.pins)
        return _pass(f'{n} pin(s)') if n > 0 else _fail('No [Pin] data')
    if rule_id == 'R006':
        if not comp: return _skip('No component')
        names = {m.name for m in models}
        bad = [p for p in comp.pins if p.model_name not in ('NC', 'POWER', 'GND') and p.model_name not in names]
        return _pass('All pin refs valid') if not bad else _warn(f'{len(bad)} pin(s) ref missing models')
    if rule_id == 'R007':
        n = len(models)
        return _pass(f'{n} model(s)') if n > 0 else _fail('No [Model] blocks')
    if rule_id == 'R008':
        bad = [m.name for m in models if not m.model_type]
        return _pass('All models have Model_type') if not bad else _warn(f'{len(bad)} missing Model_type')
    if rule_id == 'R009':
        bad = [m.name for m in models if not m.voltage_range or m.voltage_range.typ is None]
        return _pass('Voltage range defined') if not bad else _warn(f'{len(bad)} missing Voltage_range')
    if rule_id == 'R010':
        outputs = [m for m in models if any(t in (m.model_type or '').lower() for t in ['output', 'i/o', '3-state', 'open'])]
        if not outputs: return _info('No output models')
        missing = [m for m in outputs if not m.pullup and not m.pulldown]
        return _pass(f'{len(outputs)} output(s) have I(V)') if not missing else _warn(f'{len(missing)} output(s) missing I(V) tables')
    if rule_id == 'R011':
        has = any(m.pwr_clamp or m.gnd_clamp for m in models)
        return _pass('Clamp tables found') if has else _info('No clamp tables')
    if rule_id == 'R012':
        has = any(m.rising_waveforms or m.falling_waveforms for m in models)
        return _pass('Waveforms found') if has else _warn('No waveform tables')
    if rule_id == 'R013':
        has = any(m.ramp and (m.ramp.dvdt_r or m.ramp.dvdt_f) for m in models)
        return _pass('Ramp data found') if has else _warn('No [Ramp] data')
    if rule_id == 'R014':
        if not comp: return _skip('No component')
        pkg = comp.package
        has = pkg and (pkg.r or pkg.l or pkg.c)
        return _pass('Package R/L/C found') if has else _info('No [Package] parasitics')
    if rule_id == 'R015':
        bad = [m.name for m in models if not m.c_comp or m.c_comp.typ is None]
        return _pass('C_comp defined') if not bad else _info(f'{len(bad)} missing C_comp')
    if rule_id == 'R016':
        if not parsed.version: return _skip('No version')
        try:
            v = float(parsed.version)
            return _pass(f'IBIS {parsed.version}') if v >= 3.2 else _warn(f'IBIS {parsed.version} is old')
        except ValueError:
            return _warn(f'Cannot parse version: {parsed.version}')
    if rule_id == 'R017':
        issues = 0
        for m in models:
            for wf in (m.rising_waveforms + m.falling_waveforms):
                for i in range(1, len(wf.points)):
                    if wf.points[i].t <= wf.points[i - 1].t:
                        issues += 1
        return _pass('Waveform time axes monotonic') if issues == 0 else _fail(f'Non-monotonic time in {issues} location(s)')
    if rule_id == 'R018':
        bad = [m for m in models if (m.pullup and len(m.pullup) < 2) or (m.pulldown and len(m.pulldown) < 2)]
        return _pass('I(V) tables have ≥2 points') if not bad else _warn(f'{len(bad)} table(s) < 2 points')
    return _info('Unknown rule')


def validate(parsed: ParsedIBIS) -> ValidationResult:
    issues: List[ValidationIssue] = []
    total_weight = 0
    earned = 0.0

    for rule_id, name, category, weight in RULES:
        total_weight += weight
        try:
            status, message = _check(rule_id, parsed)
        except Exception as e:
            status, message = SEV['ERROR'], f'Rule threw: {e}'

        issues.append(ValidationIssue(
            rule_id=rule_id, name=name, category=category,
            severity=status, message=message, weight=weight,
        ))

        if status == 'pass':   earned += weight
        elif status == 'warn': earned += weight * 0.5
        elif status == 'info': earned += weight * 0.8

    overall = round((earned / total_weight) * 100) if total_weight else 0
    counts = {
        'errors':   sum(1 for i in issues if i.severity == 'error'),
        'warnings': sum(1 for i in issues if i.severity == 'warn'),
        'info':     sum(1 for i in issues if i.severity == 'info'),
        'pass':     sum(1 for i in issues if i.severity == 'pass'),
    }
    syntax_score = _syntax_score(parsed)
    sim_score    = _sim_score(parsed)
    qual_score   = _qual_score(parsed)

    return ValidationResult(
        overall_score=overall,
        syntax_score=syntax_score,
        sim_score=sim_score,
        quality_score=qual_score,
        issues=issues,
        counts=counts,
    )


def _syntax_score(p: ParsedIBIS) -> int:
    d = 0
    if not p.version: d += 20
    if not p.file_name: d += 5
    if not p.components: d += 30
    elif not p.components[0].pins: d += 15
    if not (p.components and p.components[0].models): d += 20
    return max(0, 100 - d)


def _sim_score(p: ParsedIBIS) -> int:
    comp = p.components[0] if p.components else None
    models = comp.models if comp else []
    score = 40
    if any(m.rising_waveforms for m in models):  score += 25
    if any(m.falling_waveforms for m in models): score += 10
    if any(m.ramp and m.ramp.dvdt_r for m in models): score += 10
    if any(m.pullup for m in models):   score += 5
    if any(m.pulldown for m in models): score += 5
    if any(m.pwr_clamp for m in models): score += 5
    return min(score, 100)


def _qual_score(p: ParsedIBIS) -> int:
    score = 0
    if p.version:    score += 10
    if p.file_name:  score += 5
    comp = p.components[0] if p.components else None
    if comp and comp.manufacturer: score += 5
    if comp and comp.pins:   score += 10
    if comp and comp.models: score += 10
    models = comp.models if comp else []
    if any(m.rising_waveforms or m.falling_waveforms for m in models): score += 20
    if any(m.ramp and (m.ramp.dvdt_r or m.ramp.dvdt_f) for m in models): score += 10
    if any(m.pullup or m.pulldown for m in models): score += 15
    if any(m.pwr_clamp and m.gnd_clamp for m in models): score += 10
    score += 5  # voltage range string credit
    return min(score, 100)
