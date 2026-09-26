/*
 * components-db.js — MTBF & Reliability Calculator
 * Built-in component failure-rate (FIT) library.
 *
 * FIT = Failures In Time = failures per 10^9 device-hours at nominal
 * (25°C, Ground Benign) reference conditions.
 *
 * IMPORTANT: The base FIT values below are representative / typical
 * order-of-magnitude defaults intended for educational and first-pass
 * design exploration only. For production reliability sign-off, replace
 * these with values sourced from component datasheets, qualified
 * standard-specific handbooks (IEC 61709, MIL-HDBK-217F, Telcordia
 * SR-332), or supplier-provided reliability reports.
 */
(function (global) {
  'use strict';

  // Each entry: { name, category, baseFIT, note }
  const COMPONENT_LIBRARY = [
    {
      name: 'Microcontroller',
      category: 'Digital IC',
      baseFIT: 25,
      note: 'General-purpose MCU, moderate complexity',
    },
    { name: 'FPGA', category: 'Digital IC', baseFIT: 45, note: 'Mid-density FPGA / SoC' },
    { name: 'DDR Memory', category: 'Memory', baseFIT: 30, note: 'DDR3/DDR4 SDRAM' },
    { name: 'Flash', category: 'Memory', baseFIT: 20, note: 'NAND/NOR flash memory' },
    { name: 'EEPROM', category: 'Memory', baseFIT: 8, note: 'Small serial EEPROM' },
    { name: 'Oscillator', category: 'Timing', baseFIT: 12, note: 'MEMS/quartz active oscillator' },
    { name: 'Crystal', category: 'Timing', baseFIT: 5, note: 'Passive crystal resonator' },
    {
      name: 'Power Supply',
      category: 'Power',
      baseFIT: 60,
      note: 'AC/DC or isolated DC/DC module',
    },
    { name: 'LDO', category: 'Power', baseFIT: 10, note: 'Linear voltage regulator' },
    { name: 'Buck Converter', category: 'Power', baseFIT: 18, note: 'Switching DC/DC IC' },
    { name: 'MOSFET', category: 'Discrete', baseFIT: 6, note: 'Power MOSFET' },
    { name: 'IGBT', category: 'Discrete', baseFIT: 15, note: 'High-power switching device' },
    { name: 'Diode', category: 'Discrete', baseFIT: 2, note: 'Small-signal / rectifier diode' },
    { name: 'TVS Diode', category: 'Discrete', baseFIT: 3, note: 'ESD/surge protection diode' },
    { name: 'Ferrite Bead', category: 'Passive', baseFIT: 0.5, note: 'EMI suppression bead' },
    { name: 'Resistor', category: 'Passive', baseFIT: 0.2, note: 'Thick/thin film chip resistor' },
    {
      name: 'Capacitor',
      category: 'Passive',
      baseFIT: 1,
      note: 'Ceramic/tantalum/electrolytic (generic)',
    },
    { name: 'Inductor', category: 'Passive', baseFIT: 0.8, note: 'Power/signal inductor' },
    {
      name: 'Connector',
      category: 'Electromechanical',
      baseFIT: 4,
      note: 'Per mated contact pair, generic',
    },
    { name: 'Relay', category: 'Electromechanical', baseFIT: 40, note: 'Electromechanical relay' },
    {
      name: 'Transformer',
      category: 'Electromechanical',
      baseFIT: 10,
      note: 'Signal/power transformer',
    },
    {
      name: 'Fan',
      category: 'Electromechanical',
      baseFIT: 200,
      note: 'Cooling fan, moving-part wearout dominated',
    },
    { name: 'LCD', category: 'Display', baseFIT: 100, note: 'Character/graphic LCD module' },
    {
      name: 'Ethernet PHY',
      category: 'Interface IC',
      baseFIT: 20,
      note: 'Ethernet transceiver IC',
    },
    {
      name: 'USB Controller',
      category: 'Interface IC',
      baseFIT: 18,
      note: 'USB host/device controller IC',
    },
    { name: 'CAN Transceiver', category: 'Interface IC', baseFIT: 12, note: 'CAN bus transceiver' },
    { name: 'RS485', category: 'Interface IC', baseFIT: 10, note: 'RS-485/RS-422 transceiver' },
    { name: 'ADC', category: 'Analog IC', baseFIT: 15, note: 'Analog-to-digital converter' },
    { name: 'DAC', category: 'Analog IC', baseFIT: 15, note: 'Digital-to-analog converter' },
    {
      name: 'Temperature Sensor',
      category: 'Sensor',
      baseFIT: 6,
      note: 'Digital/analog temperature sensor IC',
    },
    {
      name: 'Current Sensor',
      category: 'Sensor',
      baseFIT: 8,
      note: 'Shunt/Hall-effect current sensor',
    },
    {
      name: 'Battery',
      category: 'Power Source',
      baseFIT: 50,
      note: 'Li-ion/Li-poly cell, wearout dominated',
    },
    { name: 'Fuse', category: 'Protection', baseFIT: 3, note: 'Overcurrent protection fuse' },
  ];

  global.MTBF_COMPONENT_LIBRARY = COMPONENT_LIBRARY;
})(window);
