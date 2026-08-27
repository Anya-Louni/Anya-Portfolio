/**
 * Project records.
 *
 * Framing text and every number come from each repository's own README or its
 * GitHub description — nothing here is invented. Live demo links are the
 * project's GitHub Pages build, checked to resolve.
 */

export const GITHUB_USER = 'Anya-Louni'
export const GITHUB_PROFILE = `https://github.com/${GITHUB_USER}`

export interface ResultRow {
  label: string
  value: string
}

export interface Project {
  slug: string
  name: string
  kicker: string
  /** 1–2 sentences: problem, approach, result. Never biography. */
  blurb: string
  finding: string
  results: ResultRow[]
  tags: string[]
  github: string
  demo?: string
  demoLabel?: string
  note?: string
  tint: 'violet' | 'aqua' | 'blue' | 'peri' | 'green'
  featured?: boolean
}

export const PROJECTS: Project[] = [
  {
    slug: 'galaxy-compass',
    name: 'Galaxy Compass',
    kicker: 'Learning under rotational symmetry',
    blurb:
      'Galaxy morphology carries no preferred orientation, so most classifiers learn rotation invariance by being shown rotated copies. This one encodes the symmetry in the architecture instead, using E(2)-steerable convolutions, and measures what the encoding is worth under a controlled comparison on Galaxy10 DECaLS.',
    finding:
      'The steerable network reaches the dense CNN’s all-label accuracy at roughly 14% of the labels — a label-efficiency factor near 7 — while carrying 11.8× fewer parameters.',
    results: [
      { label: 'Accuracy at 5% labels', value: '0.6930 vs 0.6366  (+5.6 pp)' },
      { label: 'Accuracy at 100% labels', value: '0.8217 vs 0.7745  (+4.7 pp)' },
      { label: 'Label efficiency', value: '7.5× (range 6.0–10.4×)' },
      { label: 'Held-out split', value: '3,549 galaxies, 3 seeds' },
    ],
    tags: ['E(2)-steerable CNN', 'Galaxy10 DECaLS', 'self-supervised atlas'],
    github: `${GITHUB_PROFILE}/Galaxy-Compass`,
    demo: 'https://anya-louni.github.io/Galaxy-Compass/',
    demoLabel: 'Galaxies Without a Compass',
    tint: 'violet',
    featured: true,
  },
  {
    slug: 'deep-sea-ood',
    name: 'Deep-Sea OOD',
    kicker: 'Open-set recognition on ROV footage',
    blurb:
      'Four out-of-distribution detectors — MSP, Energy, Mahalanobis and ViM — evaluated on deep-sea ROV footage of gelatinous zooplankton from FathomNet, across 230 species under a 73.8× class imbalance, with novel species stratified by taxonomic distance.',
    finding:
      'The clean-data ranking flips under degradation. ViM leads on clean data at AUROC 0.677; once low light, blur, scale loss and compression are applied, Mahalanobis is the most robust and ViM degrades the most.',
    results: [
      { label: 'Closed-set top-1', value: '59.3%  (82.5% top-3)' },
      { label: 'Best clean AUROC', value: 'ViM, 0.677' },
      { label: 'Most robust degraded', value: 'Mahalanobis, 0.539' },
      { label: 'Hardest degradation', value: 'low light — chance by severity 2' },
    ],
    tags: ['ViM / Mahalanobis / Energy', 'FathomNet', 'degradation battery'],
    github: `${GITHUB_PROFILE}/Deep-Sea-OOD`,
    demo: 'https://anya-louni.github.io/Deep-Sea-OOD/',
    demoLabel: 'Paper and interactive demo',
    tint: 'aqua',
    featured: true,
  },
  {
    slug: 'strandwise',
    name: 'Strandwise',
    kicker: 'Reverse-complement equivariance in regulatory DNA',
    blurb:
      'DNA reads the same on both strands, so a regulatory-element classifier should score a sequence and its reverse complement identically. Strandwise builds that symmetry into the convolution weights rather than learning it from augmentation, and benchmarks it against a 485M-parameter genomic language model.',
    finding:
      'Exact invariance at float32, matched against the language model at 1/2500th of the parameters — alongside an ancestry-stratified audit of SIFT and PolyPhen-2 calibration.',
    results: [
      { label: 'Parameter ratio vs gLM', value: '1 / 2500' },
      { label: 'Invariance', value: 'exact at float32, before training' },
      { label: 'Ancestry audit', value: 'ClinVar × 1000 Genomes, per-population AUROC' },
      { label: 'Calibrator', value: 'European-fitted, applied unchanged' },
    ],
    tags: ['equivariant CNN', 'ClinVar', 'variant effect calibration'],
    github: `${GITHUB_PROFILE}/Strandwise`,
    demo: 'https://anya-louni.github.io/Strandwise/',
    demoLabel: 'Project site',
    tint: 'blue',
  },
  {
    slug: 'textile-defect-detection',
    name: 'Weave Symmetry',
    kicker: 'When the advantage is the threshold',
    blurb:
      'Woven cloth repeats. This measures the repeat in twelve real textures, encodes the measured symmetry in a defect classifier for the ten with enough annotated defects, and compares it against a network of identical computational cost trained with the equivalent augmentation.',
    finding:
      'The steerable network’s advantage does not survive an honestly chosen threshold. It wins 85 of 147 comparisons at a fixed threshold of one half (p = 0.069) and 76 of 149 once the threshold is fitted on validation (p = 0.87). The gap between those two readings is the actual finding.',
    results: [
      { label: 'Runs', value: '495 across 10 textures, 5 budgets, 3 seeds' },
      { label: 'Macro-F1, fixed threshold', value: '85 / 147  (p = 0.069)' },
      { label: 'Macro-F1, fitted threshold', value: '76 / 149  (p = 0.87)' },
      { label: 'ROC area, threshold-free', value: '68 / 150  (p = 0.288)' },
    ],
    tags: ['steerable CNN', 'threshold calibration', 'sign test'],
    github: `${GITHUB_PROFILE}/Textile-Defect-Detection`,
    demo: 'https://anya-louni.github.io/Textile-Defect-Detection/',
    demoLabel: 'Project site',
    tint: 'peri',
  },
  {
    slug: 'enose-classifier',
    name: 'eNose Classifier',
    kicker: 'A whole pipeline on an ESP32',
    blurb:
      'Six TGS gas-sensor channels, classified on the microcontroller itself: moving-average filtering, L1 normalisation into a feature vector, then a nearest-centroid model with distance-based rejection so outliers are declined rather than forced into a class.',
    finding:
      '98.4% held-out accuracy on a public breath-VOC dataset — 1,000 samples, a 75/25 stratified split at seed 42. The repository is explicit that this is a demonstration exercise and the output is a demo label, not a medical result.',
    results: [
      { label: 'Held-out accuracy', value: '98.4%' },
      { label: 'Split', value: '75/25 stratified, seed 42' },
      { label: 'Samples', value: '1,000 from a public dataset' },
      { label: 'Model', value: 'nearest centroid with rejection' },
    ],
    tags: ['ESP32', 'embedded ML', 'nearest centroid', 'Wokwi'],
    github: `${GITHUB_PROFILE}/eNose-Classifier`,
    demo: 'https://wokwi.com/projects/473171326258585601',
    demoLabel: 'Run the Wokwi simulation',
    note: 'A demonstration exercise. The output is a demo label, not a medical result.',
    tint: 'green',
    featured: true,
  },
  {
    slug: 'mini-games',
    name: 'Mini-Games',
    kicker: 'An arcade with no mouse and no keyboard',
    blurb:
      'A webcam-controlled mini-arcade in a single HTML file. MediaPipe tracks hands and body, and you select a game by hovering a hand over it — three games driven entirely by gesture: slicing, a timed cooking loop, and a full-body flight game you steer by flapping your arms.',
    finding:
      'Everything runs client-side in the browser off one webcam feed. There is no input device at any point, including the menu.',
    results: [
      { label: 'Input', value: 'webcam only — hands and body' },
      { label: 'Tracking', value: 'MediaPipe hand and pose landmarks' },
      { label: 'Games', value: 'three, plus a gesture-driven menu' },
      { label: 'Delivery', value: 'a single HTML file' },
    ],
    tags: ['MediaPipe', 'computer vision', 'gesture input'],
    github: `${GITHUB_PROFILE}/Mini-Games`,
    demo: 'https://anya-louni.github.io/Mini-Games/',
    demoLabel: 'Retro Web Arcade',
    tint: 'aqua',
  },
]

/**
 * The rest of the public repositories, shown as a second group in Finder.
 * Descriptions are the ones GitHub shows, verbatim.
 */
export interface Repo {
  name: string
  desc: string
  language: string
  url: string
}

export const REPOS: Repo[] = [
  {
    name: 'Internet-Artifact',
    desc: 'React + Supabase app for cataloguing and discussing internet-history artifacts. Auth, admin tools, and a full Postgres schema included.',
    language: 'JavaScript',
    url: `${GITHUB_PROFILE}/Internet-Artifact`,
  },
  {
    name: 'IAterpreter',
    desc: 'Full-stack translation platform with an interactive 3D globe. Voice, image/OCR, and document translation tools built with Next.js and Three.js.',
    language: 'TypeScript',
    url: `${GITHUB_PROFILE}/IAterpreter`,
  },
  {
    name: 'lasik-healing-predictor',
    desc: 'ML model to predict LASIK healing quality.',
    language: 'JavaScript',
    url: `${GITHUB_PROFILE}/lasik-healing-predictor`,
  },
]

export const byslug = (slug: string) => PROJECTS.find((p) => p.slug === slug)
