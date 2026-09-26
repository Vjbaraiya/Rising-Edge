"""
schemas.py — Pydantic models for IBIS-Studio API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class CornerValues(BaseModel):
    typ: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class IVPoint(BaseModel):
    v: float
    typ: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class WaveformPoint(BaseModel):
    t: float
    typ: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class WaveformTable(BaseModel):
    type: str  # 'rising' | 'falling'
    r_fixture: Optional[float] = None
    v_fixture: Optional[float] = None
    points: List[WaveformPoint] = []


class RampData(BaseModel):
    dvdt_r: Optional[CornerValues] = None
    dvdt_f: Optional[CornerValues] = None
    r_load: Optional[float] = None


class IBISModel(BaseModel):
    name: str
    model_type: str = ''
    polarity: str = ''
    voltage_range: Optional[CornerValues] = None
    temp_range: Optional[CornerValues] = None
    c_comp: Optional[CornerValues] = None
    pullup: List[IVPoint] = []
    pulldown: List[IVPoint] = []
    pwr_clamp: List[IVPoint] = []
    gnd_clamp: List[IVPoint] = []
    ramp: Optional[RampData] = None
    rising_waveforms: List[WaveformTable] = []
    falling_waveforms: List[WaveformTable] = []


class PinEntry(BaseModel):
    number: str
    signal_name: str
    model_name: str
    r_pin: Optional[float] = None
    l_pin: Optional[float] = None
    c_pin: Optional[float] = None


class PackageData(BaseModel):
    r: Optional[CornerValues] = None
    l: Optional[CornerValues] = None
    c: Optional[CornerValues] = None


class IBISComponent(BaseModel):
    name: str
    manufacturer: str = ''
    package: Optional[PackageData] = None
    pins: List[PinEntry] = []
    models: List[IBISModel] = []


class ParsedIBIS(BaseModel):
    version: str = ''
    file_name: str = ''
    file_rev: str = ''
    date: str = ''
    source: str = ''
    manufacturer: str = ''
    components: List[IBISComponent] = []
    errors: List[str] = []
    warnings: List[str] = []


# ── Request / Response schemas ─────────────────────────────────────────

class ParseRequest(BaseModel):
    ibis_text: str = Field(..., description="Raw IBIS file content")
    file_name: str = Field(default="uploaded.ibs")


class ValidationIssue(BaseModel):
    rule_id: str
    name: str
    category: str
    severity: str  # error | warn | info | pass
    message: str
    weight: int


class ValidationResult(BaseModel):
    overall_score: int
    syntax_score: int
    sim_score: int
    quality_score: int
    issues: List[ValidationIssue]
    counts: Dict[str, int]


class ReportRequest(BaseModel):
    ibis_text: str
    format: str  # pdf | docx | html | markdown
    file_name: str = 'report'


class GenerateRequest(BaseModel):
    component_name: str = 'MY_COMPONENT'
    manufacturer: str = ''
    model_name: str = 'MY_MODEL'
    model_type: str = 'Output'
    voltage_typ: float = 3.3
    voltage_min: float = 3.0
    voltage_max: float = 3.6
    temp_typ: float = 25.0
    temp_min: float = 0.0
    temp_max: float = 85.0
    c_comp_typ: float = 2e-12
    ibis_ver: str = '7.0'
    file_name: str = 'generated.ibs'
