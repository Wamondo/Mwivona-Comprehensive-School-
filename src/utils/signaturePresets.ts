/**
 * Utility for generating authentic digitized cursive signatures and official seals
 * as high-resolution transparent PNG Data URLs.
 */

export interface SignaturePreset {
  id: string;
  role: 'hoi' | 'bursar' | 'coordinator' | 'class_teacher' | 'seal';
  roleTitle: string;
  signatoryName: string;
  designation: string;
  description: string;
  inkColor: string;
  svgPath: string;
  previewSvg: string;
}

/**
 * Generates a clean PNG Data URL from an SVG string using an offscreen canvas
 */
export function svgToPngDataUrl(svgString: string, width = 450, height = 150): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobUrl = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(blobUrl);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(blobUrl);
          resolve('');
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        // Fallback: draw directly with canvas 2D
        resolve(fallbackDrawPresetPng(svgString, width, height));
      };

      img.src = blobUrl;
    } catch {
      resolve(fallbackDrawPresetPng(svgString, width, height));
    }
  });
}

function fallbackDrawPresetPng(label: string, width = 450, height = 150): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.clearRect(0, 0, width, height);
  ctx.font = 'italic bold 34px "Brush Script MT", "Snell Roundhand", cursive, sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText(label.includes('Vance') ? 'E. Vance' : label.includes('Kimani') ? 'S. Kimani' : 'M. Thorne', 40, 85);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(35, 100);
  ctx.bezierCurveTo(120, 90, 260, 115, 380, 95);
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

/**
 * Creates a synchronous high-res PNG signature or seal image directly via Canvas 2D
 */
export function createSynchronousPresetPng(
  role: 'hoi' | 'bursar' | 'coordinator' | 'class_teacher' | 'seal',
  name: string,
  inkColor = '#1e3a8a'
): string {
  if (typeof document === 'undefined') return '';

  if (role === 'seal') {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = inkColor;

    // Outer dashed ring
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.arc(150, 150, 138, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid double ring
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(150, 150, 128, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(150, 150, 96, 0, Math.PI * 2);
    ctx.stroke();

    // Center emblem shield
    ctx.fillStyle = inkColor;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MWIVONA COMPREHENSIVE', 150, 36);
    ctx.fillText('OFFICIAL RATIFIED SEAL', 150, 264);

    // Center star & shield
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('★ 2026 ★', 150, 150);
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.fillText('MOE/KNEC CERTIFIED', 150, 168);
    ctx.fillText('AUTHENTICATED', 150, 132);

    return canvas.toDataURL('image/png');
  }

  // Draw cursive signature
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 450, 150);
  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (role === 'hoi') {
    // Dr. Evelyn Vance signature
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    // Big E loop
    ctx.moveTo(45, 95);
    ctx.bezierCurveTo(35, 50, 55, 30, 80, 38);
    ctx.bezierCurveTo(95, 45, 65, 85, 55, 90);
    ctx.bezierCurveTo(75, 90, 105, 65, 125, 55);
    // V & cursive Vance
    ctx.moveTo(175, 38);
    ctx.bezierCurveTo(185, 35, 195, 100, 205, 102);
    ctx.bezierCurveTo(215, 104, 235, 45, 245, 42);
    ctx.bezierCurveTo(255, 40, 260, 85, 275, 75);
    ctx.bezierCurveTo(285, 70, 295, 60, 305, 72);
    ctx.bezierCurveTo(315, 80, 325, 60, 335, 70);
    ctx.bezierCurveTo(345, 75, 355, 62, 365, 72);
    ctx.stroke();

    // Underline flourish
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(45, 108);
    ctx.bezierCurveTo(120, 102, 230, 118, 380, 96);
    ctx.stroke();

    // Dots
    ctx.beginPath();
    ctx.arc(365, 52, 2.5, 0, Math.PI * 2);
    ctx.arc(395, 98, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (role === 'bursar') {
    // Sarah Kimani, CPA signature
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    // S
    ctx.moveTo(85, 45);
    ctx.bezierCurveTo(65, 35, 45, 50, 48, 70);
    ctx.bezierCurveTo(50, 85, 80, 90, 85, 105);
    ctx.bezierCurveTo(90, 120, 60, 125, 45, 115);
    // K
    ctx.moveTo(120, 30);
    ctx.lineTo(122, 108);
    ctx.moveTo(165, 45);
    ctx.lineTo(122, 75);
    ctx.lineTo(175, 108);
    // mani
    ctx.moveTo(180, 82);
    ctx.bezierCurveTo(190, 70, 205, 70, 215, 85);
    ctx.bezierCurveTo(225, 70, 235, 70, 245, 85);
    ctx.bezierCurveTo(255, 70, 270, 70, 280, 82);
    ctx.lineTo(290, 85);
    ctx.stroke();

    // CPA flourish
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(115, 118);
    ctx.bezierCurveTo(180, 114, 260, 122, 380, 108);
    ctx.stroke();
  } else {
    // General elegant cursive
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(50, 105);
    ctx.lineTo(55, 40);
    ctx.lineTo(85, 85);
    ctx.lineTo(115, 42);
    ctx.lineTo(120, 105);
    // T
    ctx.moveTo(160, 48);
    ctx.bezierCurveTo(175, 42, 220, 40, 235, 46);
    ctx.moveTo(195, 45);
    ctx.lineTo(195, 105);
    // cursive
    ctx.moveTo(230, 78);
    ctx.bezierCurveTo(240, 70, 255, 70, 260, 85);
    ctx.bezierCurveTo(270, 70, 280, 70, 290, 85);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(50, 116);
    ctx.bezierCurveTo(140, 110, 240, 120, 370, 104);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Official Presidential & Executive Signature Presets for Kenyan School Leaders
 */
export const OFFICIAL_SIGNATURE_PRESETS: SignaturePreset[] = [
  {
    id: 'preset-hoi-vance',
    role: 'hoi',
    roleTitle: 'Head of Institution / Chief Principal',
    signatoryName: 'Dr. Evelyn Vance, Ph.D',
    designation: 'Chief Principal & Head of Institution',
    description: 'Executive fluid cursive calligraphy with ascending flourish and ratification mark',
    inkColor: '#1e3a8a', // Midnight fountain pen blue
    svgPath: '',
    previewSvg: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 150" width="450" height="150">
        <defs>
          <linearGradient id="ink-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a" />
            <stop offset="100%" stop-color="#1e40af" />
          </linearGradient>
        </defs>
        <!-- Initial E loop & flourish -->
        <path d="M 45 95 C 35 60, 50 30, 75 35 C 100 40, 70 85, 55 90 C 80 90, 110 70, 125 55 C 130 50, 120 85, 135 75 C 145 68, 155 58, 165 72 C 175 80, 185 60, 195 70" 
              fill="none" stroke="url(#ink-grad-1)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Big Vance V -->
        <path d="M 205 35 C 220 30, 230 95, 238 98 C 248 100, 265 48, 275 45 C 285 42, 290 85, 305 75 C 315 70, 325 60, 335 72 C 345 80, 355 60, 365 70 C 375 75, 385 62, 395 72" 
              fill="none" stroke="url(#ink-grad-1)" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Crossbar and flourish tail -->
        <path d="M 50 108 C 120 102, 220 118, 385 96 C 410 92, 425 80, 410 70 C 395 62, 380 90, 415 110" 
              fill="none" stroke="url(#ink-grad-1)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Two sharp authentication dots -->
        <circle cx="395" cy="52" r="2.8" fill="#1e3a8a" />
        <circle cx="422" cy="112" r="2.2" fill="#1e3a8a" />
      </svg>
    `,
  },
  {
    id: 'preset-bursar-kimani',
    role: 'bursar',
    roleTitle: 'Chief Bursar & Treasury Controller',
    signatoryName: 'Sarah Kimani, CPA',
    designation: 'Chief Bursar & Head of Finance',
    description: 'Sharply drafted financial controller script with CPA endorsement stroke',
    inkColor: '#0f172a', // Slate black official ink
    svgPath: '',
    previewSvg: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 150" width="450" height="150">
        <defs>
          <linearGradient id="ink-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
        </defs>
        <!-- Stylized S with top hook -->
        <path d="M 85 45 C 65 35, 45 50, 48 70 C 50 85, 80 90, 85 105 C 90 120, 60 125, 45 115" 
              fill="none" stroke="url(#ink-grad-2)" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Kimani K with sharp angular downstroke -->
        <path d="M 120 30 L 122 108 M 165 45 L 122 75 L 175 108" 
              fill="none" stroke="url(#ink-grad-2)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Flowing cursive mani -->
        <path d="M 180 82 C 190 70, 205 70, 215 85 C 225 70, 235 70, 245 85 C 255 70, 270 70, 280 82 L 290 85 C 300 70, 310 85, 325 82 L 340 75" 
              fill="none" stroke="url(#ink-grad-2)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        <!-- CPA flourish underline -->
        <path d="M 115 118 C 180 114, 260 122, 380 108 C 400 105, 395 125, 370 125" 
              fill="none" stroke="url(#ink-grad-2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="282" cy="62" r="2.8" fill="#0f172a" />
      </svg>
    `,
  },
  {
    id: 'preset-coordinator-thorne',
    role: 'coordinator',
    roleTitle: 'Academic Coordinator / Exam Council Chair',
    signatoryName: 'Mr. Marcus Thorne',
    designation: 'Senior Academic Coordinator & Examinations Council',
    description: 'Disciplined academic cursive script with balanced proportion',
    inkColor: '#3730a3', // Royal indigo ink
    svgPath: '',
    previewSvg: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 150" width="450" height="150">
        <defs>
          <linearGradient id="ink-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3730a3" />
            <stop offset="100%" stop-color="#4338ca" />
          </linearGradient>
        </defs>
        <!-- Capital M with tall loops -->
        <path d="M 50 105 L 55 40 L 85 85 L 115 42 L 120 105" 
              fill="none" stroke="url(#ink-grad-3)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Dot after initial -->
        <circle cx="132" cy="102" r="2.8" fill="#3730a3" />
        <!-- Big T Thorne -->
        <path d="M 160 48 C 175 42, 220 40, 235 46 M 195 45 L 195 105 C 195 115, 185 118, 175 112" 
              fill="none" stroke="url(#ink-grad-3)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- horne cursive -->
        <path d="M 230 45 L 230 105 M 230 78 C 240 70, 255 70, 260 85 C 270 70, 280 70, 290 85 C 300 70, 315 70, 325 82 C 335 70, 350 85, 365 80" 
              fill="none" stroke="url(#ink-grad-3)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Underline flourish -->
        <path d="M 160 115 C 230 110, 310 118, 410 102" 
              fill="none" stroke="url(#ink-grad-3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
  },
  {
    id: 'preset-class-teacher',
    role: 'class_teacher',
    roleTitle: 'Class Tutor / Teacher Endorsement',
    signatoryName: 'Ms. Clara Sterling',
    designation: 'Senior Class Tutor & Formative Evaluator',
    description: 'Flowing legible educator endorsement signature',
    inkColor: '#1e3a8a',
    svgPath: '',
    previewSvg: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 150" width="450" height="150">
        <defs>
          <linearGradient id="ink-grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a" />
            <stop offset="100%" stop-color="#2563eb" />
          </linearGradient>
        </defs>
        <!-- C Sterling -->
        <path d="M 90 45 C 55 35, 40 75, 45 95 C 50 115, 80 115, 95 105" 
              fill="none" stroke="url(#ink-grad-4)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
        <!-- S loop -->
        <path d="M 135 45 C 115 35, 105 55, 110 70 C 115 85, 135 90, 135 105 C 135 118, 115 120, 105 112" 
              fill="none" stroke="url(#ink-grad-4)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
        <!-- terling cursive chain -->
        <path d="M 145 55 L 145 105 M 138 68 L 155 68 M 160 85 C 170 70, 185 85, 195 82 C 205 70, 215 70, 225 85 C 235 55, 240 105, 245 105 C 255 70, 270 85, 280 82" 
              fill="none" stroke="url(#ink-grad-4)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Underline loop -->
        <path d="M 100 116 C 180 110, 270 120, 395 102 C 415 98, 410 118, 385 118" 
              fill="none" stroke="url(#ink-grad-4)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
  },
  {
    id: 'preset-official-seal',
    role: 'seal',
    roleTitle: 'Official Institutional Seal & Stamp',
    signatoryName: 'Mwivona Comprehensive School Seal',
    designation: 'MoE / KNEC Certified Institutional Ratification Stamp',
    description: 'Circular bilingual embossed seal with center crest, laurel stars and official code',
    inkColor: '#4338ca', // Indigo / Purple official stamp ink
    svgPath: '',
    previewSvg: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <path id="seal-text-path-top" d="M 50 150 A 100 100 0 0 1 250 150" />
          <path id="seal-text-path-bottom" d="M 250 150 A 100 100 0 0 1 50 150" />
        </defs>
        <!-- Outer serrated/dashed ring -->
        <circle cx="150" cy="150" r="138" fill="none" stroke="#4338ca" stroke-width="3.5" stroke-dasharray="6 3" opacity="0.85" />
        <!-- Solid outer border -->
        <circle cx="150" cy="150" r="128" fill="none" stroke="#4338ca" stroke-width="3" />
        <!-- Inner ring -->
        <circle cx="150" cy="150" r="92" fill="none" stroke="#4338ca" stroke-width="2" />
        
        <!-- Curving Text Top: MWIVONA COMPREHENSIVE SCHOOL -->
        <text font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="900" fill="#4338ca" letter-spacing="2">
          <textPath href="#seal-text-path-top" startOffset="50%" text-anchor="middle">
            MWIVONA COMPREHENSIVE SCHOOL
          </textPath>
        </text>
        
        <!-- Curving Text Bottom: MOE/KNEC CENTER REG: 04812 -->
        <text font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" fill="#4338ca" letter-spacing="1.5">
          <textPath href="#seal-text-path-bottom" startOffset="50%" text-anchor="middle">
            ★ VERIFIED & RATIFIED 2026 ★
          </textPath>
        </text>

        <!-- Center Emblem / Shield & Stars -->
        <g transform="translate(150, 150)">
          <!-- Center Shield -->
          <path d="M 0 -45 L 30 -25 L 30 15 C 30 38, 0 52, 0 52 C 0 52, -30 38, -30 15 L -30 -25 Z" 
                fill="#eef2ff" stroke="#4338ca" stroke-width="2.5" />
          <!-- Open Book inside shield -->
          <path d="M -16 -5 C -8 -10, 0 -8, 0 -2 C 0 -8, 8 -10, 16 -5 L 16 18 C 8 12, 0 14, 0 20 C 0 14, -8 12, -16 18 Z" 
                fill="#4338ca" />
          <!-- Quill / Flame -->
          <path d="M 0 -34 L 5 -20 L -5 -20 Z" fill="#4338ca" />
          <!-- Stars on sides -->
          <text x="-48" y="5" font-size="14" fill="#4338ca" text-anchor="middle">★</text>
          <text x="48" y="5" font-size="14" fill="#4338ca" text-anchor="middle">★</text>
          <!-- Date -->
          <text x="0" y="36" font-family="Arial, sans-serif" font-size="8.5" font-weight="900" fill="#4338ca" text-anchor="middle">
            OFFICIAL
          </text>
        </g>
      </svg>
    `,
  },
];
