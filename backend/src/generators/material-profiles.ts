/**
 * Procurement-grade material metadata for Builder Spec Section 2.0 / Appendix A.
 * Curated IDs match material-selector; unknown / MP IDs fall back to generic profile.
 */

export interface MaterialProcessProfile {
  alloySpecification: string
  powderMorphology: string
  /** Chemistry / handling — align with PubChem when available */
  toxicityAndSafety: string
  primaryModality: 'metal_lpbf' | 'polymer_fdm' | 'polymer_sls' | 'hybrid'
  thermalDictate: {
    layerMicrons: number
    laserPowerW?: number
    scanSpeedMmS?: number
    hatchSpacingMm?: number
    extrusionTempC?: { min: number; max: number }
    bedTempC?: number
    orientationNote: string
  }
  metallurgical: {
    stressRelief: string
    supportRemoval: string
    surfaceFinish: string
  }
  qa: {
    dimensionalToleranceMm: string
    massToleranceG: string
  }
  bom: {
    primaryMaterial: string
    substrate: string
    atmosphere: string
    consumables: string
    ppe: string
  }
}

const DEFAULT_PROFILE: MaterialProcessProfile = {
  alloySpecification:
    'Procure material to the grade required by your supplier CoC. This document does not replace material certification.',
  powderMorphology:
    'Specify particle size distribution (typical metal LPBF: 15–45 µm), sphericity, and lot traceability with your powder vendor.',
  toxicityAndSafety:
    'Follow SDS for the exact product lot. Use local exhaust ventilation; metal powders may be combustible or pose respiratory hazards.',
  primaryModality: 'metal_lpbf',
  thermalDictate: {
    layerMicrons: 30,
    laserPowerW: 250,
    scanSpeedMmS: 1200,
    hatchSpacingMm: 0.1,
    orientationNote:
      'Orient stiffest functional axis along build (Z) where possible; avoid cantilevered lattice overhangs >45° without supports. Validate with your equipment OEM.',
  },
  metallurgical: {
    stressRelief:
      'Stress-relief or hot isostatic press (HIP) per alloy handbook and part criticality — typical Ti-6Al-4V: solution + age or stress-relief 650–700 °C range (vendor-specific).',
    supportRemoval:
      'Remove supports without gouging struts; EDM or band-saw from plate; avoid vibration on thin lattice members.',
    surfaceFinish:
      'Light bead blast or chemical clean per implant/aerospace QMS; document Ra target if regulated.',
  },
  qa: {
    dimensionalToleranceMm: '±0.1 mm on mating features unless drawing states otherwise',
    massToleranceG: '±0.5 g or 2% (whichever is larger) vs target — under-mass may indicate incomplete fusion or missing struts',
  },
  bom: {
    primaryMaterial: 'Metal powder per Section 2.0 (lot-controlled)',
    substrate: 'Stainless or Ni-alloy build plate per machine qualified stack',
    atmosphere: 'High-purity argon or nitrogen per OEM; maintain O₂ below qualified threshold',
    consumables: 'Filters, recoater blade, spreader wipes per OEM PM schedule',
    ppe: 'Respirator (P100 or better for powders), nitrile/thermal gloves, face shield, ESD as required',
  },
}

const PROFILES: Record<string, MaterialProcessProfile> = {
  ti64: {
    alloySpecification:
      'Titanium Ti-6Al-4V (UNS R56400). For regulated use specify Grade 23 ELI (extra-low interstitial) and ASTM F3001 / AMS 4911 as applicable.',
    powderMorphology:
      'Gas-atomized spherical Ti-6Al-4V powder, typical PSD 15–45 µm (some vendors 20–63 µm); verify tap density and Hall flow per lot CoA.',
    toxicityAndSafety:
      'Titanium fines are combustible; avoid ignition sources. Inert chamber mandatory. P100+ respirator when handling loose powder. Follow SDS and NFPA 484 guidance.',
    primaryModality: 'metal_lpbf',
    thermalDictate: {
      layerMicrons: 30,
      laserPowerW: 280,
      scanSpeedMmS: 1000,
      hatchSpacingMm: 0.1,
      orientationNote:
        'Minimize unsupported down-faces; prefer Z along load path. Thin lattice struts: reduce scan speed locally per OEM parameter sets.',
    },
    metallurgical: {
      stressRelief:
        'Stress relief or HIP typically 650–720 °C in inert/vacuum per AMS 2801 class or OEM recipe; document cycle chart.',
      supportRemoval:
        'Wire EDM or low-vibration cut-off from plate; avoid bending struts during depowdering — use approved vibratory or manual pick.',
      surfaceFinish:
        'Bead blast (glass or ceramic media per spec), optional acid clean for Ti — confirm biocompatibility if medical.',
    },
    qa: {
      dimensionalToleranceMm: '±0.1 mm interfaces; lattice strut ±0.05 mm where CMM accessible',
      massToleranceG: '±0.5 g vs surrogate target — investigate voids if light',
    },
    bom: {
      primaryMaterial: 'Ti-6Al-4V powder, qualified lot, PSD on CoA',
      substrate: 'Ti or dedicated fixturing plate per qualified stack',
      atmosphere: 'Argon, O₂ < 0.1% typical target (machine-qualified)',
      consumables: 'New recoater blade for fine features; sieved powder if policy requires',
      ppe: 'Class P100 respirator, thermal gloves for hot parts, face shield',
    },
  },
  'al-7075': {
    alloySpecification:
      'Aluminum 7075 series — note: wrought 7075 is not standard LPBF; many shops use AlSi10Mg or Scalmalloy for laser PBF. If printing Al, confirm alloy is explicitly qualified for your LPBF process.',
    powderMorphology:
      'If using LPBF-qualified Al alloy: 15–45 µm spherical atomized powder with lot traceability.',
    toxicityAndSafety:
      'Aluminum dust is combustible and may explode if dispersed; inert gas, grounding, and housekeeping critical. Follow SDS.',
    primaryModality: 'metal_lpbf',
    thermalDictate: {
      layerMicrons: 25,
      laserPowerW: 370,
      scanSpeedMmS: 1300,
      hatchSpacingMm: 0.11,
      orientationNote:
        'Prefer thick sections down; thin lattice: watch overheating — use OEM parameter sets for fine struts.',
    },
    metallurgical: {
      stressRelief:
        'LPBF Al often stress-relieved 300–350 °C range per vendor recipe; 7075-wrought analogs do not transfer — follow qualified chart.',
      supportRemoval: 'Same as default metal lattice guidance.',
      surfaceFinish: 'Bead blast; anodize only after stress relief and if alloy/wall thickness supports it.',
    },
    qa: DEFAULT_PROFILE.qa,
    bom: {
      ...DEFAULT_PROFILE.bom,
      primaryMaterial: 'LPBF-qualified Al powder (confirm alloy — not generic 7075 unless qualified)',
    },
  },
  'pa12-cf': {
    alloySpecification:
      'Carbon-fiber-reinforced PA12 (typical 15% CF by weight). Specify vendor grade (e.g. PA2210CF-class) and dryness (<0.05% moisture) before processing.',
    powderMorphology:
      'SLS powder: particle size ~50–80 µm common; refresh ratio per OEM; sieve per schedule.',
    toxicityAndSafety:
      'Molten polymer burns; ventilate. Carbon fiber irritant — P100 when handling fines. Follow SDS.',
    primaryModality: 'polymer_sls',
    thermalDictate: {
      layerMicrons: 100,
      orientationNote:
        'Nest to minimize Z-stepping on load-bearing faces; lattice windows: ensure powder drain holes in design if required.',
    },
    metallurgical: {
      stressRelief: 'Anneal per vendor datasheet if dimensional stability required (typically 80–120 °C, time bounded).',
      supportRemoval: 'Remove unsintered cake per SLS workflow; bead blast to open pores if needed.',
      surfaceFinish: 'Media blast or vapor smoothing per cosmetic/QA level.',
    },
    qa: {
      dimensionalToleranceMm: '±0.2 mm typical SLS; tighter only with metrology correlation',
      massToleranceG: '±1 g or 3% vs target for unfused-cake variability',
    },
    bom: {
      primaryMaterial: 'PA12-CF powder, refreshed per OEM ratio',
      substrate: 'SLS build platform, preheat per recipe',
      atmosphere: 'Inert chamber N₂ for some machines; otherwise closed process per OEM',
      consumables: 'Packing material, brushes, vacuum for depowdering',
      ppe: 'P100 respirator, gloves',
    },
  },
  ss316l: {
    alloySpecification:
      'Stainless steel 316L (UNS S31603) for AM — specify low-carbon L-grade; medical uses may reference ASTM F3184.',
    powderMorphology: '15–45 µm spherical 316L LPBF powder; lot CoA with chemistry and PSD.',
    toxicityAndSafety:
      'Metal powder combustion risk; Cr/Ni sensitization — avoid skin contact with fines; P100+; inert processing.',
    primaryModality: 'metal_lpbf',
    thermalDictate: {
      layerMicrons: 30,
      laserPowerW: 275,
      scanSpeedMmS: 960,
      hatchSpacingMm: 0.1,
      orientationNote: 'Corrosion-sensitive faces: orient away from down-skin if roughness drives pitting risk.',
    },
    metallurgical: {
      stressRelief:
        'Stress relief 1040–1120 °C hold + inert cool per OEM for 316L LPBF or HIP for full density if required.',
      supportRemoval: DEFAULT_PROFILE.metallurgical.supportRemoval,
      surfaceFinish: 'Passivation (citric or nitric per ASTM A967) after mechanical finish if implant/food-adjacent.',
    },
    qa: DEFAULT_PROFILE.qa,
    bom: { ...DEFAULT_PROFILE.bom, primaryMaterial: '316L powder, medical/industrial grade per use case' },
  },
  pla: {
    alloySpecification: 'PLA (polylactic acid) filament or resin per vendor TDS; food-contact not implied.',
    powderMorphology: 'FDM: 1.75 mm or 2.85 mm filament; dry per vendor (<200 ppm moisture typical guidance).',
    toxicityAndSafety:
      'Low acute toxicity; avoid inhaling ultrafine emissions — use enclosure with HEPA or ventilate per ANSI/CAN/UL 2904 awareness.',
    primaryModality: 'polymer_fdm',
    thermalDictate: {
      layerMicrons: 200,
      extrusionTempC: { min: 200, max: 230 },
      bedTempC: 60,
      orientationNote:
        'Lattice struts: use minimum layer time to avoid overheating; orient for best bridge paths across cells.',
    },
    metallurgical: {
      stressRelief: 'Not typically required; anneal 60–80 °C short cycle only if vendor recommends dimensional stabilization.',
      supportRemoval: 'Break away tree supports; avoid snapping thin struts.',
      surfaceFinish: 'Sanding or coating; PLA creeps under load and heat — not for high-temp service.',
    },
    qa: {
      dimensionalToleranceMm: '±0.2 mm typical desktop FDM',
      massToleranceG: '±1 g vs target for open-lattice airflow',
    },
    bom: {
      primaryMaterial: 'PLA filament, dry box stored',
      substrate: 'PEI / textured PEI sheet or vendor plate',
      atmosphere: 'N/A (FDM)',
      consumables: 'Nozzle, glue stick / adhesive per vendor',
      ppe: 'Ventilation; cut-resistant gloves when removing supports',
    },
  },
  petg: {
    alloySpecification: 'PETG copolyester filament per vendor grade.',
    powderMorphology: 'FDM filament 1.75 / 2.85 mm; dry per vendor.',
    toxicityAndSafety: 'Ventilate; molten PETG can burn — follow SDS.',
    primaryModality: 'polymer_fdm',
    thermalDictate: {
      layerMicrons: 200,
      extrusionTempC: { min: 230, max: 250 },
      bedTempC: 75,
      orientationNote: 'Stronger in XY than Z — orient tensile axis in XY when possible.',
    },
    metallurgical: {
      stressRelief: 'Generally none.',
      supportRemoval: 'Same as PLA.',
      surfaceFinish: 'Sand / coat; chemical resistance better than PLA.',
    },
    qa: {
      dimensionalToleranceMm: '±0.2 mm typical',
      massToleranceG: '±1 g',
    },
    bom: {
      primaryMaterial: 'PETG filament',
      substrate: 'PEI or painter tape per adhesion tests',
      atmosphere: 'N/A',
      consumables: 'Nozzle',
      ppe: 'Ventilation',
    },
  },
  tpe: {
    alloySpecification: 'Thermoplastic elastomer (TPE) filament — shore hardness per vendor.',
    powderMorphology: 'FDM filament; flexible — use direct-drive extruder guidance.',
    toxicityAndSafety: 'Ventilate; follow SDS for additives.',
    primaryModality: 'polymer_fdm',
    thermalDictate: {
      layerMicrons: 200,
      extrusionTempC: { min: 210, max: 230 },
      bedTempC: 40,
      orientationNote: 'Slow print speeds; lattice may require thicker struts than metals — validate first article.',
    },
    metallurgical: {
      stressRelief: 'None.',
      supportRemoval: 'Careful cutting — elastic recovery.',
      surfaceFinish: 'Wash; avoid solvents incompatible with elastomer.',
    },
    qa: {
      dimensionalToleranceMm: '±0.3 mm (flex)',
      massToleranceG: '±2 g',
    },
    bom: {
      primaryMaterial: 'TPE filament',
      substrate: 'Glue stick / dedicated flex surface',
      atmosphere: 'N/A',
      consumables: 'Spare extruder liners',
      ppe: 'Gloves',
    },
  },
  'co-cr': {
    alloySpecification:
      'Cobalt-chromium alloy suitable for AM (e.g. CoCrMo per ASTM F75 / ISO 5832-4 context) — confirm powder grade with supplier.',
    powderMorphology: '15–45 µm spherical CoCr powder for LPBF; lot CoA.',
    toxicityAndSafety:
      'Co/Cr hazards; metal powder combustion; strict P100+ and inert gas; follow SDS and local Co rules.',
    primaryModality: 'metal_lpbf',
    thermalDictate: {
      layerMicrons: 25,
      laserPowerW: 260,
      scanSpeedMmS: 800,
      hatchSpacingMm: 0.09,
      orientationNote: 'Dental/medical: minimize down-skin on articulating surfaces.',
    },
    metallurgical: {
      stressRelief: 'HIP common for dental implants — follow validated cycle.',
      supportRemoval: DEFAULT_PROFILE.metallurgical.supportRemoval,
      surfaceFinish: 'Polish / passivate per QMS.',
    },
    qa: DEFAULT_PROFILE.qa,
    bom: { ...DEFAULT_PROFILE.bom, primaryMaterial: 'CoCr AM powder, implant grade if applicable' },
  },
}

export function getMaterialProcessProfile(materialId: string): MaterialProcessProfile {
  const key = materialId?.toLowerCase?.() ?? ''
  return PROFILES[key] ?? DEFAULT_PROFILE
}
