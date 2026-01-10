/**
 * Dental Constants
 * Complete dental data for clinical workflow
 * Uses sequential numbering (1, 2, 3...) with medical tooth names
 */

// PRIMARY (Baby/Deciduous) TEETH - 20 Total
// Sequential numbering: 1-20
export const PRIMARY_TEETH = [
  // Upper Right Quadrant
  { number: 55, name: "Upper Right 2nd Molar", quadrant: "UR", position: 5 },
  { number: 54, name: "Upper Right 1st Molar", quadrant: "UR", position: 4 },
  { number: 53, name: "Upper Right Canine", quadrant: "UR", position: 3 },
  {
    number: 52,
    name: "Upper Right Lateral Incisor",
    quadrant: "UR",
    position: 2,
  },
  {
    number: 51,
    name: "Upper Right Central Incisor",
    quadrant: "UR",
    position: 1,
  },
  // Upper Left Quadrant
  {
    number: 61,
    name: "Upper Left Central Incisor",
    quadrant: "UL",
    position: 1,
  },
  {
    number: 62,
    name: "Upper Left Lateral Incisor",
    quadrant: "UL",
    position: 2,
  },
  { number: 63, name: "Upper Left Canine", quadrant: "UL", position: 3 },
  { number: 64, name: "Upper Left 1st Molar", quadrant: "UL", position: 4 },
  { number: 65, name: "Upper Left 2nd Molar", quadrant: "UL", position: 5 },
  // Lower Left Quadrant
  { number: 75, name: "Lower Left 2nd Molar", quadrant: "LL", position: 5 },
  { number: 74, name: "Lower Left 1st Molar", quadrant: "LL", position: 4 },
  { number: 73, name: "Lower Left Canine", quadrant: "LL", position: 3 },
  {
    number: 72,
    name: "Lower Left Lateral Incisor",
    quadrant: "LL",
    position: 2,
  },
  {
    number: 71,
    name: "Lower Left Central Incisor",
    quadrant: "LL",
    position: 1,
  },
  // Lower Right Quadrant
  {
    number: 81,
    name: "Lower Right Central Incisor",
    quadrant: "LR",
    position: 1,
  },
  {
    number: 82,
    name: "Lower Right Lateral Incisor",
    quadrant: "LR",
    position: 2,
  },
  { number: 83, name: "Lower Right Canine", quadrant: "LR", position: 3 },
  { number: 84, name: "Lower Right 1st Molar", quadrant: "LR", position: 4 },
  { number: 85, name: "Lower Right 2nd Molar", quadrant: "LR", position: 5 },
];

// PERMANENT (Adult) TEETH - 32 Total
// Sequential numbering: 1-32
export const PERMANENT_TEETH = [
  // Upper Right Quadrant
  {
    number: 18,
    name: "Upper Right 3rd Molar (Wisdom)",
    quadrant: "UR",
    position: 8,
  },
  { number: 17, name: "Upper Right 2nd Molar", quadrant: "UR", position: 7 },
  { number: 16, name: "Upper Right 1st Molar", quadrant: "UR", position: 6 },
  {
    number: 15,
    name: "Upper Right 2nd Premolar (Bicuspid)",
    quadrant: "UR",
    position: 5,
  },
  { number: 14, name: "Upper Right 1st Premolar", quadrant: "UR", position: 4 },
  { number: 13, name: "Upper Right Canine", quadrant: "UR", position: 3 },
  {
    number: 12,
    name: "Upper Right Lateral Incisor",
    quadrant: "UR",
    position: 2,
  },
  {
    number: 11,
    name: "Upper Right Central Incisor",
    quadrant: "UR",
    position: 1,
  },
  // Upper Left Quadrant
  {
    number: 21,
    name: "Upper Left Central Incisor",
    quadrant: "UL",
    position: 1,
  },
  {
    number: 22,
    name: "Upper Left Lateral Incisor",
    quadrant: "UL",
    position: 2,
  },
  { number: 23, name: "Upper Left Canine", quadrant: "UL", position: 3 },
  { number: 24, name: "Upper Left 1st Premolar", quadrant: "UL", position: 4 },
  { number: 25, name: "Upper Left 2nd Premolar", quadrant: "UL", position: 5 },
  { number: 26, name: "Upper Left 1st Molar", quadrant: "UL", position: 6 },
  { number: 27, name: "Upper Left 2nd Molar", quadrant: "UL", position: 7 },
  {
    number: 28,
    name: "Upper Left 3rd Molar (Wisdom)",
    quadrant: "UL",
    position: 8,
  },
  // Lower Left Quadrant
  {
    number: 38,
    name: "Lower Left 3rd Molar (Wisdom)",
    quadrant: "LL",
    position: 8,
  },
  { number: 37, name: "Lower Left 2nd Molar", quadrant: "LL", position: 7 },
  { number: 36, name: "Lower Left 1st Molar", quadrant: "LL", position: 6 },
  { number: 35, name: "Lower Left 2nd Premolar", quadrant: "LL", position: 5 },
  { number: 34, name: "Lower Left 1st Premolar", quadrant: "LL", position: 4 },
  { number: 33, name: "Lower Left Canine", quadrant: "LL", position: 3 },
  {
    number: 32,
    name: "Lower Left Lateral Incisor",
    quadrant: "LL",
    position: 2,
  },
  {
    number: 31,
    name: "Lower Left Central Incisor",
    quadrant: "LL",
    position: 1,
  },
  // Lower Right Quadrant
  {
    number: 41,
    name: "Lower Right Central Incisor",
    quadrant: "LR",
    position: 1,
  },
  {
    number: 42,
    name: "Lower Right Lateral Incisor",
    quadrant: "LR",
    position: 2,
  },
  { number: 43, name: "Lower Right Canine", quadrant: "LR", position: 3 },
  { number: 44, name: "Lower Right 1st Premolar", quadrant: "LR", position: 4 },
  { number: 45, name: "Lower Right 2nd Premolar", quadrant: "LR", position: 5 },
  { number: 46, name: "Lower Right 1st Molar", quadrant: "LR", position: 6 },
  { number: 47, name: "Lower Right 2nd Molar", quadrant: "LR", position: 7 },
  {
    number: 48,
    name: "Lower Right 3rd Molar (Wisdom)",
    quadrant: "LR",
    position: 8,
  },
];

// Helper function to get tooth by number
export const getToothByNumber = (number, isPrimary = false) => {
  const teeth = isPrimary ? PRIMARY_TEETH : PERMANENT_TEETH;
  return teeth.find((t) => t.number === parseInt(number));
};

// DIAGNOSES - Ethiopian Dental Clinic Format
export const DIAGNOSES = [
  // Dental Caries
  {
    code: "CARIES",
    name: "Dental caries",
    category: "Dental Caries",
    description: "Tooth decay",
  },
  {
    code: "REV_PULP",
    name: "Reversible pulpitis",
    category: "Dental Caries",
    description:
      "Early pulp inflammation, pain goes away when stimulus is removed",
  },
  {
    code: "IRREV_PULP",
    name: "Irreversible pulpitis",
    category: "Dental Caries",
    description: "Severe pulp inflammation, pain persists",
  },
  {
    code: "CHR_PULP",
    name: "Chronic pulpitis",
    category: "Dental Caries",
    description: "Long-standing pulp inflammation",
  },
  {
    code: "ACU_PULP",
    name: "Acute pulpitis",
    category: "Dental Caries",
    description: "Sudden, severe pulp inflammation",
  },

  // Periodontal (Gum) Conditions
  {
    code: "GING",
    name: "Gingivitis",
    category: "Periodontal",
    description: "Inflammation of the gums",
  },
  {
    code: "PERIO",
    name: "Periodontitis",
    category: "Periodontal",
    description: "Advanced gum disease with bone loss",
  },
  {
    code: "CHR_PERIO",
    name: "Chronic periodontitis",
    category: "Periodontal",
    description: "Slow-progressing gum disease",
  },
  {
    code: "ACU_PERIO",
    name: "Acute periodontitis",
    category: "Periodontal",
    description: "Rapid, painful gum infection",
  },

  // Periapical Conditions
  {
    code: "PERI_ABS",
    name: "Periapical abscess",
    category: "Periapical",
    description: "Infection at the root apex",
  },
  {
    code: "PERI_GRAN",
    name: "Periapical granuloma",
    category: "Periapical",
    description: "Chronic inflammatory lesion",
  },
  {
    code: "PERI_CYST",
    name: "Periapical cyst",
    category: "Periapical",
    description: "Fluid-filled lesion at root apex",
  },

  // Tooth Structure Problems
  {
    code: "CRWN_FRAC",
    name: "Tooth crown fracture",
    category: "Tooth Structure",
    description: "Broken crown",
  },
  {
    code: "ROOT_FRAC",
    name: "Tooth root fracture",
    category: "Tooth Structure",
    description: "Fracture of the root",
  },
  {
    code: "ATTR",
    name: "Attrition",
    category: "Tooth Structure",
    description: "Tooth wear from grinding",
  },
  {
    code: "ABR",
    name: "Abrasion",
    category: "Tooth Structure",
    description: "Tooth wear from brushing or habits",
  },
  {
    code: "ERO",
    name: "Erosion",
    category: "Tooth Structure",
    description: "Chemical tooth wear",
  },

  // Malocclusion (Angle Classification)
  {
    code: "CLS_I",
    name: "Class I malocclusion",
    category: "Malocclusion",
    description: "Normal molar relationship",
  },
  {
    code: "CLS_II",
    name: "Class II malocclusion",
    category: "Malocclusion",
    description: "Upper jaw forward (overbite)",
  },
  {
    code: "CLS_III",
    name: "Class III malocclusion",
    category: "Malocclusion",
    description: "Lower jaw forward (underbite)",
  },

  // Tooth Position Abnormalities
  {
    code: "ANKYL",
    name: "Ankylosed tooth",
    category: "Tooth Position",
    description: "Tooth fused to bone",
  },
  {
    code: "POS_ANOM",
    name: "Positional anomaly",
    category: "Tooth Position",
    description: "Abnormally positioned tooth",
  },
  {
    code: "HOR_IMP",
    name: "Horizontal impaction",
    category: "Tooth Position",
    description: "Tooth lying horizontally",
  },
  {
    code: "VER_IMP",
    name: "Vertical impaction",
    category: "Tooth Position",
    description: "Tooth upright but unerupted",
  },

  // Missing / Extra Teeth
  {
    code: "MISS",
    name: "Missing tooth",
    category: "Missing/Extra",
    description: "Congenitally or extracted",
  },
  {
    code: "FLOAT",
    name: "Floating tooth",
    category: "Missing/Extra",
    description: "Tooth with severe bone loss",
  },
  {
    code: "SUPER",
    name: "Supernumerary tooth",
    category: "Missing/Extra",
    description: "Extra tooth",
  },

  // Tooth Mobility (Gingival & Periodontal)
  {
    code: "MOB_1",
    name: "Grade 1 mobility",
    category: "Tooth Mobility",
    description: "Slight mobility",
  },
  {
    code: "MOB_2",
    name: "Grade 2 mobility",
    category: "Tooth Mobility",
    description: "Moderate mobility",
  },
  {
    code: "MOB_3",
    name: "Grade 3 mobility",
    category: "Tooth Mobility",
    description: "Severe mobility",
  },

  // Soft Tissue Conditions
  {
    code: "ST_LESION",
    name: "Soft tissue lesion",
    category: "Soft Tissue",
    description: "Any abnormal oral tissue",
  },
  {
    code: "ULCER",
    name: "Oral ulcer",
    category: "Soft Tissue",
    description: "Open sore in the mouth",
  },
  {
    code: "ST_ABS",
    name: "Abscess (soft tissue)",
    category: "Soft Tissue",
    description: "Pus-filled infection",
  },
  {
    code: "FIBROMA",
    name: "Fibroma",
    category: "Soft Tissue",
    description: "Benign soft tissue growth",
  },
];

// DENTAL PROCEDURES
export const DENTAL_PROCEDURES = [
  {
    name: "Oral Examination (Comprehensive Oral Exam)",
    category: "Diagnostic",
  },
  {
    name: "Extraction",
    category: "Oral Surgery",
  },
  {
    name: "Scaling (Prophylaxis / Cleaning)",
    category: "Preventive",
  },
  {
    name: "Scaling and Root Planing (Deep Cleaning)",
    category: "Periodontics",
  },
  {
    name: "Restoration with Composite (Composite Filling)",
    category: "Restorative",
  },
  {
    name: "Restoration with Glass Ionomer (GI Filling)",
    category: "Restorative",
  },
  {
    name: "Temporary Filling",
    category: "Restorative",
  },
  {
    name: "Disimpaction / Impacted Tooth Removal",
    category: "Oral Surgery",
  },
  {
    name: "Dental Implant Placement",
    category: "Prosthodontics",
  },
  {
    name: "Metal-Ceramic Bridge",
    category: "Prosthodontics",
  },
  {
    name: "Zirconia Bridge",
    category: "Prosthodontics",
  },
  {
    name: "Jacket Crown (All-Ceramic Crown)",
    category: "Prosthodontics",
  },
  {
    name: "Jacket Crown (Zirconia Crown)",
    category: "Prosthodontics",
  },
  {
    name: "Splinting (Tooth Splinting)",
    category: "Periodontics",
  },
  {
    name: "Fixed Orthodontic Treatment – Upper Arch",
    category: "Orthodontics",
  },
  {
    name: "Fixed Orthodontic Treatment – Lower Arch",
    category: "Orthodontics",
  },
  {
    name: "Fixed Orthodontic Treatment – Both Arches",
    category: "Orthodontics",
  },
  {
    name: "Invisalign (Clear Aligner Orthodontics)",
    category: "Orthodontics",
  },
  {
    name: "Intermaxillary Fixation (Jaw Immobilization / IMF)",
    category: "Oral Surgery",
  },
];

// DENTAL TOOLS AND INSTRUMENTS
export const DENTAL_TOOLS = [
  // Examination Tools
  { id: "MIRROR", name: "Mouth Mirror", category: "Examination" },
  { id: "PROBE", name: "Periodontal Probe", category: "Examination" },
  { id: "EXPLORER", name: "Dental Explorer", category: "Examination" },
  { id: "FORCEPS", name: "Forceps", category: "Examination" },
  { id: "COTTON_PLIERS", name: "Cotton Pliers", category: "Examination" },

  // Restorative Tools
  { id: "HAND_PIECE", name: "Hand Piece (Drill)", category: "Restorative" },
  { id: "BUR", name: "Dental Bur", category: "Restorative" },
  { id: "FILLING_INSTR", name: "Filling Instrument", category: "Restorative" },
  { id: "MATRIX_BAND", name: "Matrix Band", category: "Restorative" },
  { id: "WEDGE", name: "Wedge", category: "Restorative" },
  { id: "BURNISHER", name: "Burnisher", category: "Restorative" },
  { id: "CARVER", name: "Carver", category: "Restorative" },

  // Endodontic Tools
  { id: "ROOT_CANAL_FILE", name: "Root Canal File", category: "Endodontic" },
  {
    id: "ROOT_CANAL_REAMER",
    name: "Root Canal Reamer",
    category: "Endodontic",
  },
  { id: "GUTTA_PERCHA", name: "Gutta Percha", category: "Endodontic" },
  {
    id: "ROOT_CANAL_SEALER",
    name: "Root Canal Sealer",
    category: "Endodontic",
  },
  { id: "SPREADER", name: "Spreader", category: "Endodontic" },
  { id: "PLUGGER", name: "Plugger", category: "Endodontic" },

  // Surgical Tools
  { id: "ELEVATOR", name: "Periosteal Elevator", category: "Surgery" },
  { id: "EXTRACTION_FORCEPS", name: "Extraction Forceps", category: "Surgery" },
  { id: "SCALPEL", name: "Scalpel", category: "Surgery" },
  { id: "SUTURE", name: "Suture Material", category: "Surgery" },
  { id: "CURETTE", name: "Curette", category: "Surgery" },

  // Preventive Tools
  { id: "SCALER", name: "Scaler", category: "Preventive" },
  { id: "ULTRASONIC", name: "Ultrasonic Scaler", category: "Preventive" },
  { id: "POLISH_CUP", name: "Polishing Cup", category: "Preventive" },
  { id: "FLOSS", name: "Dental Floss", category: "Preventive" },
  { id: "PROPHY_PASTE", name: "Prophylaxis Paste", category: "Preventive" },

  // Radiography Tools
  { id: "XRAY_FILM", name: "X-Ray Film", category: "Radiography" },
  { id: "XRAY_HOLDER", name: "X-Ray Film Holder", category: "Radiography" },
  { id: "BITE_WING_TAB", name: "Bite Wing Tab", category: "Radiography" },

  // Anesthesia
  { id: "ANESTHESIA", name: "Local Anesthesia", category: "Anesthesia" },
  { id: "SYRINGE", name: "Dental Syringe", category: "Anesthesia" },
  {
    id: "ANESTHESIA_CARPULE",
    name: "Anesthesia Carpule",
    category: "Anesthesia",
  },

  // Isolation
  { id: "RUBBER_DAM", name: "Rubber Dam", category: "Isolation" },
  { id: "RUBBER_DAM_CLAMP", name: "Rubber Dam Clamp", category: "Isolation" },
  { id: "SUCTION", name: "Suction Tip", category: "General" },
  { id: "AIR_WATER_SYRINGE", name: "Air/Water Syringe", category: "General" },
];

// X-RAY TYPES - Ethiopian Dental Clinic Format
export const XRAY_TYPES = [
  // Clinical Examination
  {
    value: "VISUAL_EXAM",
    name: "Visual examination",
    category: "Clinical Examination",
    description: "Inspection of teeth and oral tissues",
    abbreviation: null,
  },
  {
    value: "PALPATION",
    name: "Palpation",
    category: "Clinical Examination",
    description: "Feeling tissues for swelling or tenderness",
    abbreviation: null,
  },
  {
    value: "PERCUSSION_TEST",
    name: "Percussion test",
    category: "Clinical Examination",
    description: "Tapping tooth to check periapical pathology",
    abbreviation: null,
  },
  {
    value: "MOBILITY_TEST",
    name: "Mobility test",
    category: "Clinical Examination",
    description: "Checking tooth movement",
    abbreviation: null,
  },

  // Intra-oral X-rays
  {
    value: "IOPA",
    name: "IOPA (Intra-Oral Periapical X-ray)",
    category: "Intra-oral X-rays",
    description: "Used for caries, periapical lesions, root status",
    abbreviation: "IOPA",
  },
  {
    value: "BITEWING",
    name: "Bitewing X-ray",
    category: "Intra-oral X-rays",
    description: "Detects proximal caries and bone level",
    abbreviation: "BW",
  },
  {
    value: "OCCLUSAL",
    name: "Occlusal X-ray",
    category: "Intra-oral X-rays",
    description: "Detects impacted teeth, cysts, stones, fractures",
    abbreviation: null,
  },

  // Extra-oral X-rays
  {
    value: "OPG",
    name: "OPG (Orthopantomogram / Panoramic X-ray)",
    category: "Extra-oral X-rays",
    description: "Full view of jaws, impacted teeth, missing teeth",
    abbreviation: "OPG",
  },
  {
    value: "LATERAL_CEPH",
    name: "Lateral cephalometric X-ray",
    category: "Extra-oral X-rays",
    description: "Orthodontic diagnosis",
    abbreviation: null,
  },
  {
    value: "PA_SKULL",
    name: "PA skull X-ray",
    category: "Extra-oral X-rays",
    description: "Facial bone assessment",
    abbreviation: null,
  },
  {
    value: "TMJ_XRAY",
    name: "TMJ X-ray",
    category: "Extra-oral X-rays",
    description: "Temporomandibular joint evaluation",
    abbreviation: null,
  },

  // Special Investigations
  {
    value: "PULP_VITALITY_TEST",
    name: "Pulp vitality test",
    category: "Special Investigations",
    description: "Electric pulp test or thermal test",
    abbreviation: null,
  },
  {
    value: "PERIODONTAL_PROBING",
    name: "Periodontal probing",
    category: "Special Investigations",
    description: "Pocket depth measurement",
    abbreviation: null,
  },
  {
    value: "RADIOGRAPHIC_BONE_LEVEL",
    name: "Radiographic bone level assessment",
    category: "Special Investigations",
    description: "Assessment of bone loss from X-rays",
    abbreviation: null,
  },
  {
    value: "BIOPSY",
    name: "Biopsy",
    category: "Special Investigations",
    description: "For suspicious soft tissue lesions",
    abbreviation: null,
  },

  // Advanced Imaging
  {
    value: "RVG",
    name: "RVG (Digital X-ray)",
    category: "Advanced Imaging",
    description: "Digital radiovisiography",
    abbreviation: "RVG",
  },
  {
    value: "CBCT",
    name: "CBCT (Cone Beam CT)",
    category: "Advanced Imaging",
    description: "3D dental imaging (if available)",
    abbreviation: "CBCT",
  },
];

// X-RAY CATEGORIES
export const XRAY_CATEGORIES = [...new Set(XRAY_TYPES.map((x) => x.category))];

// TOOTH SURFACES
export const TOOTH_SURFACES = [
  { code: "O", name: "Occlusal", description: "Biting surface" },
  { code: "M", name: "Mesial", description: "Toward front of mouth" },
  { code: "D", name: "Distal", description: "Toward back of mouth" },
  { code: "B", name: "Buccal", description: "Cheek side" },
  { code: "L", name: "Lingual", description: "Tongue side (lower)" },
  { code: "P", name: "Palatal", description: "Palate side (upper)" },
  { code: "F", name: "Facial", description: "Front surface (anterior)" },
  { code: "I", name: "Incisal", description: "Cutting edge (anterior)" },
];

// TOOTH CONDITIONS (for charting)
export const TOOTH_CONDITIONS = [
  { value: "NORMAL", label: "Normal", color: "green" },
  { value: "CARIES", label: "Caries", color: "red" },
  { value: "RESTORED", label: "Restored", color: "blue" },
  { value: "MISSING", label: "Missing", color: "gray" },
  { value: "EXTRACTED", label: "Extracted", color: "black" },
  { value: "IMPACTED", label: "Impacted", color: "orange" },
  { value: "FRACTURED", label: "Fractured", color: "yellow" },
  { value: "ROOT_CANAL", label: "Root Canal", color: "purple" },
  { value: "CROWN", label: "Crown", color: "indigo" },
  { value: "BRIDGE", label: "Bridge", color: "pink" },
  { value: "IMPLANT", label: "Implant", color: "teal" },
];

// CLINICAL TEST TYPES
export const CLINICAL_TESTS = [
  {
    id: "PULP_VITALITY",
    name: "Pulp Vitality Test",
    description: "Test nerve response",
  },
  {
    id: "PERCUSSION",
    name: "Percussion Test",
    description: "Tap test for inflammation",
  },
  {
    id: "THERMAL_COLD",
    name: "Cold Sensitivity Test",
    description: "Response to cold",
  },
  {
    id: "THERMAL_HOT",
    name: "Hot Sensitivity Test",
    description: "Response to heat",
  },
  {
    id: "MOBILITY",
    name: "Mobility Test",
    description: "Tooth movement assessment",
  },
  {
    id: "ELECTRIC_PULP",
    name: "Electric Pulp Test",
    description: "EPT for nerve vitality",
  },
];

// Get diagnoses by category
export const getDiagnosesByCategory = (category) => {
  return DIAGNOSES.filter((d) => d.category === category);
};

// Get procedures by category
export const getProceduresByCategory = (category) => {
  return DENTAL_PROCEDURES.filter((p) => p.category === category);
};

// Get tools by category
export const getToolsByCategory = (category) => {
  return DENTAL_TOOLS.filter((t) => t.category === category);
};

// Categories for grouping
export const DIAGNOSIS_CATEGORIES = [
  ...new Set(DIAGNOSES.map((d) => d.category)),
];
export const PROCEDURE_CATEGORIES = [
  ...new Set(DENTAL_PROCEDURES.map((p) => p.category)),
];
export const TOOL_CATEGORIES = [
  ...new Set(DENTAL_TOOLS.map((t) => t.category)),
];
