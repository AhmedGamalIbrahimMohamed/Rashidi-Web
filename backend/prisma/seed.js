/**
 * Seeds the database with the admin account, the machinery taxonomy, a
 * representative catalogue and every editable copy block the website reads.
 *
 * Safe to re-run: everything upserts on a natural key, so existing records are
 * refreshed rather than duplicated, and machine photos uploaded through the
 * dashboard are never touched.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import 'dotenv/config';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = [
  {
    slug: 'injection-molding',
    nameEn: 'Injection Molding',
    nameAr: 'حقن البلاستيك',
    descriptionEn:
      'Servo and hydraulic injection molding machines from 90 to 3,800 tonnes clamping force, for technical parts, packaging and household production.',
    descriptionAr:
      'مكابس حقن البلاستيك الهيدروليكية والسيرفو بقوة إغلاق من ٩٠ إلى ٣٨٠٠ طن، لإنتاج القطع الفنية والتعبئة والمنتجات المنزلية.',
    sortOrder: 1,
  },
  {
    slug: 'blow-molding',
    nameEn: 'Blow Molding',
    nameAr: 'نفخ البلاستيك',
    descriptionEn:
      'PET stretch blow, extrusion blow and automatic bottle lines for water, beverage, detergent and industrial containers.',
    descriptionAr:
      'خطوط نفخ PET والنفخ بالبثق والخطوط الأوتوماتيكية لعبوات المياه والمشروبات والمنظفات والحاويات الصناعية.',
    sortOrder: 2,
  },
  {
    slug: 'extrusion-lines',
    nameEn: 'Extrusion Lines',
    nameAr: 'خطوط البثق',
    descriptionEn:
      'Complete single and twin screw extrusion lines for pipes, profiles, sheets and blown film production.',
    descriptionAr:
      'خطوط بثق كاملة بلولب مفرد ومزدوج لإنتاج الأنابيب والبروفيلات والألواح والأفلام المنفوخة.',
    sortOrder: 3,
  },
  {
    slug: 'recycling-systems',
    nameEn: 'Recycling Systems',
    nameAr: 'أنظمة إعادة التدوير',
    descriptionEn:
      'Washing lines, granulators, pelletizing systems and complete turnkey plants for PE, PP and PET recovery.',
    descriptionAr:
      'خطوط الغسيل والطواحين وأنظمة التحبيب والمصانع المتكاملة لإعادة تدوير PE و PP و PET.',
    sortOrder: 4,
  },
  {
    slug: 'auxiliary-equipment',
    nameEn: 'Auxiliary Equipment',
    nameAr: 'المعدات المساندة',
    descriptionEn:
      'Chillers, dryers, material loaders, mold temperature controllers and compressors that keep a production hall running.',
    descriptionAr:
      'المبردات والمجففات وأنظمة تغذية المواد ووحدات التحكم بحرارة القوالب والضواغط التي تُبقي خط الإنتاج يعمل.',
    sortOrder: 5,
  },
  {
    slug: 'heavy-industrial',
    nameEn: 'Heavy Industrial Equipment',
    nameAr: 'المعدات الصناعية الثقيلة',
    descriptionEn:
      'Hydraulic presses, balers, industrial generators and large-format machinery for heavy manufacturing.',
    descriptionAr:
      'المكابس الهيدروليكية ومكابس البالات والمولدات الصناعية والآلات كبيرة الحجم للصناعات الثقيلة.',
    sortOrder: 6,
  },
];

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

const spec = (labelEn, labelAr, valueEn, valueAr, groupEn = null, groupAr = null) => ({
  labelEn,
  labelAr,
  valueEn,
  valueAr,
  groupEn,
  groupAr,
});

export const machines = [
  {
    slug: 'servo-plastic-injection-molding-machine-380t',
    category: 'injection-molding',
    nameEn: 'Servo Injection Molding Machine — 380 Tonne',
    nameAr: 'ماكينة حقن بلاستيك سيرفو — ٣٨٠ طن',
    shortDescriptionEn:
      'High-precision servo-hydraulic press with 380T clamping force and closed-loop energy recovery.',
    shortDescriptionAr:
      'مكبس سيرفو هيدروليكي عالي الدقة بقوة إغلاق ٣٨٠ طن ونظام استرجاع طاقة مغلق الحلقة.',
    descriptionEn:
      'A workhorse press built for continuous three-shift production. The servo-driven hydraulic system holds injection pressure within ±0.5% shot to shot, which keeps dimensional tolerances stable across long runs of technical parts. Energy consumption sits 45–60% below an equivalent fixed-pump machine, and the wide tie-bar spacing accepts large multi-cavity tools without an oversized frame.\n\nFully inspected, load-tested under production conditions and delivered with the original tooling plates, manuals and a commissioning visit anywhere in the region.',
    descriptionAr:
      'مكبس إنتاجي مصمم للعمل المتواصل على ثلاث ورديات. يحافظ النظام الهيدروليكي المُدار بالسيرفو على ضغط الحقن ضمن ±٠٫٥٪ بين الطلقة والأخرى، مما يُبقي التفاوتات الأبعادية ثابتة عبر دفعات الإنتاج الطويلة للقطع الفنية. استهلاك الطاقة أقل بنسبة ٤٥–٦٠٪ من ماكينة مماثلة بمضخة ثابتة، كما أن المسافة الواسعة بين الأعمدة تستوعب القوالب الكبيرة متعددة التجاويف دون الحاجة لهيكل أكبر.\n\nتم فحصها بالكامل واختبارها تحت ظروف الإنتاج الفعلية، وتُسلّم مع ألواح القوالب الأصلية والأدلة الفنية وزيارة تركيب وتشغيل في أي مكان بالمنطقة.',
    technicalInfoEn:
      'Requires a 400V / 50Hz three-phase supply and a chilled water circuit rated at 45 kW heat rejection. Foundation drawings and a full electrical schematic are supplied before shipment.',
    technicalInfoAr:
      'تتطلب مصدر تغذية ثلاثي الأطوار ٤٠٠ فولت / ٥٠ هرتز ودائرة مياه مبردة بقدرة طرد حراري ٤٥ كيلوواط. تُزوَّد مخططات الأساسات والمخطط الكهربائي الكامل قبل الشحن.',
    status: 'AVAILABLE',
    brand: 'Haitian',
    modelNumber: 'MA3800 II',
    manufactureYear: 2021,
    countryOfOrigin: 'China',
    condition: 'Excellent — inspected & load tested',
    isFeatured: true,
    sortOrder: 1,
    specifications: [
      spec('Clamping Force', 'قوة الإغلاق', '3,800 kN (380 T)', '٣٨٠٠ كيلونيوتن (٣٨٠ طن)', 'Clamping Unit', 'وحدة الإغلاق'),
      spec('Tie-bar Distance', 'المسافة بين الأعمدة', '710 × 710 mm', '٧١٠ × ٧١٠ مم', 'Clamping Unit', 'وحدة الإغلاق'),
      spec('Mold Opening Stroke', 'شوط فتح القالب', '750 mm', '٧٥٠ مم', 'Clamping Unit', 'وحدة الإغلاق'),
      spec('Screw Diameter', 'قطر اللولب', '70 mm', '٧٠ مم', 'Injection Unit', 'وحدة الحقن'),
      spec('Shot Weight (PS)', 'وزن الطلقة', '1,150 g', '١١٥٠ غرام', 'Injection Unit', 'وحدة الحقن'),
      spec('Injection Pressure', 'ضغط الحقن', '186 MPa', '١٨٦ ميجاباسكال', 'Injection Unit', 'وحدة الحقن'),
      spec('Motor Power', 'قدرة المحرك', '37 kW servo', '٣٧ كيلوواط سيرفو', 'Power', 'الطاقة'),
      spec('Machine Dimensions', 'أبعاد الماكينة', '7.2 × 2.1 × 2.4 m', '٧٫٢ × ٢٫١ × ٢٫٤ م', 'General', 'عام'),
      spec('Machine Weight', 'وزن الماكينة', '14,500 kg', '١٤٥٠٠ كجم', 'General', 'عام'),
    ],
  },
  {
    slug: 'pet-stretch-blow-molding-machine-6-cavity',
    category: 'blow-molding',
    nameEn: 'Automatic PET Stretch Blow Molding Machine — 6 Cavity',
    nameAr: 'ماكينة نفخ PET أوتوماتيكية — ٦ تجاويف',
    shortDescriptionEn:
      'Linear six-cavity blow line producing up to 12,000 bottles per hour from 200ml to 2L.',
    shortDescriptionAr:
      'خط نفخ خطي بستة تجاويف بإنتاجية تصل إلى ١٢٠٠٠ عبوة في الساعة بأحجام من ٢٠٠ مل إلى ٢ لتر.',
    descriptionEn:
      'A complete bottle-forming cell: preform hopper, infrared conditioning oven, stretch blow station and discharge conveyor arrive as one pre-aligned line. Mold changeover takes under 40 minutes with the quick-clamp cavity system, which makes short runs of multiple SKUs practical rather than painful.\n\nThe infrared oven uses zoned lamp control so wall thickness stays even from neck to base — the difference between a bottle that passes a top-load test and one that does not.',
    descriptionAr:
      'خلية تشكيل عبوات متكاملة: قادوس البريفورم، وفرن التكييف بالأشعة تحت الحمراء، ومحطة النفخ بالشد، وناقل التفريغ — تصل كخط واحد مُحاذى مسبقاً. يستغرق تغيير القالب أقل من ٤٠ دقيقة بفضل نظام التثبيت السريع للتجاويف، مما يجعل الإنتاج بكميات صغيرة لأصناف متعددة أمراً عملياً.\n\nيستخدم فرن الأشعة تحت الحمراء تحكماً مناطقياً بالمصابيح للحفاظ على سماكة جدار متساوية من العنق حتى القاعدة — وهو الفارق بين عبوة تجتاز اختبار التحميل العلوي وأخرى لا تجتازه.',
    technicalInfoEn:
      'Supplied with a 40 bar high-pressure air compressor and air recovery system that returns roughly 30% of blowing air to the low-pressure circuit.',
    technicalInfoAr:
      'تُسلَّم مع ضاغط هواء عالي الضغط ٤٠ بار ونظام استرجاع هواء يعيد نحو ٣٠٪ من هواء النفخ إلى الدائرة منخفضة الضغط.',
    status: 'IN_STOCK',
    brand: 'Jomar / Sidel-compatible',
    modelNumber: 'SBM-6L',
    manufactureYear: 2022,
    countryOfOrigin: 'Turkey',
    condition: 'Refurbished — new heating lamps',
    isFeatured: true,
    sortOrder: 2,
    specifications: [
      spec('Cavities', 'عدد التجاويف', '6', '٦', 'Output', 'الإنتاجية'),
      spec('Max Output', 'أقصى إنتاجية', '12,000 bottles / hour', '١٢٠٠٠ عبوة / ساعة', 'Output', 'الإنتاجية'),
      spec('Bottle Volume Range', 'نطاق حجم العبوة', '200 ml – 2,000 ml', '٢٠٠ مل – ٢٠٠٠ مل', 'Output', 'الإنتاجية'),
      spec('Max Neck Diameter', 'أقصى قطر للعنق', '38 mm', '٣٨ مم', 'Output', 'الإنتاجية'),
      spec('Blowing Pressure', 'ضغط النفخ', '35 – 40 bar', '٣٥ – ٤٠ بار', 'Air System', 'نظام الهواء'),
      spec('Heating Lamps', 'مصابيح التسخين', '72 × 2.5 kW infrared', '٧٢ × ٢٫٥ كيلوواط أشعة تحت حمراء', 'Oven', 'الفرن'),
      spec('Total Power', 'إجمالي القدرة', '96 kW', '٩٦ كيلوواط', 'Power', 'الطاقة'),
      spec('Line Footprint', 'مساحة الخط', '9.5 × 3.2 m', '٩٫٥ × ٣٫٢ م', 'General', 'عام'),
    ],
  },
  {
    slug: 'twin-screw-plastic-extruder-line',
    category: 'extrusion-lines',
    nameEn: 'Parallel Twin Screw Extruder Line',
    nameAr: 'خط بثق بلولبين متوازيين',
    shortDescriptionEn:
      'Co-rotating twin screw compounding line with side feeder, vacuum degassing and underwater pelletizer.',
    shortDescriptionAr:
      'خط تركيب بلولبين متوازيين مع مغذٍ جانبي ونزع غازات بالتفريغ ونظام تحبيب تحت الماء.',
    descriptionEn:
      'Built for masterbatch and filled compound production where dispersion quality decides the product. The segmented screw design lets the mixing profile be rebuilt for a new formulation in an afternoon instead of specifying a new barrel.\n\nTwin vacuum ports pull moisture and volatiles out of the melt, so CaCO₃-filled PP comes off the die without the surface pitting that ruins a batch.',
    descriptionAr:
      'مُصمم لإنتاج الماستر باتش والمركبات المعبأة حيث تحدد جودة التشتت جودة المنتج. يتيح تصميم اللولب المقسّم إعادة بناء منحنى الخلط لتركيبة جديدة خلال ساعات بدلاً من طلب أسطوانة جديدة.\n\nيسحب منفذا التفريغ المزدوجان الرطوبة والمواد المتطايرة من المصهور، فيخرج البولي بروبلين المعبأ بكربونات الكالسيوم من الفوهة خالياً من التنقر السطحي الذي يفسد الدفعة.',
    technicalInfoEn:
      'Screw configuration drawings for the current formulation, torque curves and a spare barrel liner set are included with the sale.',
    technicalInfoAr:
      'تشمل الصفقة مخططات تكوين اللولب للتركيبة الحالية ومنحنيات العزم ومجموعة بطانة أسطوانة احتياطية.',
    status: 'AVAILABLE',
    brand: 'Coperion-type',
    modelNumber: 'TSE-75',
    manufactureYear: 2020,
    countryOfOrigin: 'Germany',
    condition: 'Very good — rebuilt gearbox',
    isFeatured: true,
    sortOrder: 3,
    specifications: [
      spec('Screw Diameter', 'قطر اللولب', '75 mm', '٧٥ مم', 'Extruder', 'الباثق'),
      spec('L/D Ratio', 'نسبة الطول للقطر', '48:1', '٤٨:١', 'Extruder', 'الباثق'),
      spec('Max Screw Speed', 'أقصى سرعة للولب', '600 rpm', '٦٠٠ لفة/دقيقة', 'Extruder', 'الباثق'),
      spec('Throughput', 'معدل الإنتاج', '450 – 700 kg/h', '٤٥٠ – ٧٠٠ كجم/ساعة', 'Output', 'الإنتاجية'),
      spec('Main Motor', 'المحرك الرئيسي', '160 kW AC', '١٦٠ كيلوواط تيار متردد', 'Power', 'الطاقة'),
      spec('Heating Zones', 'مناطق التسخين', '11 zones', '١١ منطقة', 'Extruder', 'الباثق'),
      spec('Pelletizing', 'نظام التحبيب', 'Underwater, 8-blade', 'تحت الماء، ٨ شفرات', 'Downstream', 'المعدات اللاحقة'),
    ],
  },
  {
    slug: 'pe-pp-plastic-washing-recycling-line',
    category: 'recycling-systems',
    nameEn: 'PE / PP Washing & Recycling Line — 1000 kg/h',
    nameAr: 'خط غسيل وإعادة تدوير PE / PP — ١٠٠٠ كجم/ساعة',
    shortDescriptionEn:
      'Turnkey post-consumer film recycling plant: shredder, friction washer, float tank, dryer and pelletizer.',
    shortDescriptionAr:
      'مصنع متكامل لإعادة تدوير الأفلام: فرّامة، غسالة احتكاكية، حوض فصل بالطفو، مجفف، ووحدة تحبيب.',
    descriptionEn:
      'A complete line that takes baled agricultural and packaging film in one end and delivers dry, clean pellets at the other. The three-stage wash removes sand and organic load that would otherwise destroy screen changers downstream.\n\nWater consumption is held near 1.5 m³/tonne through a closed-loop filtration circuit — a decisive figure where water is metered or scarce.',
    descriptionAr:
      'خط متكامل يستقبل بالات الأفلام الزراعية وأفلام التغليف من طرف ويُخرج حبيبات نظيفة وجافة من الطرف الآخر. تزيل مراحل الغسيل الثلاث الرمل والأحمال العضوية التي تدمر مغيّرات الشبك في المراحل اللاحقة.\n\nيبقى استهلاك المياه قرب ١٫٥ م³ لكل طن بفضل دائرة ترشيح مغلقة — وهو رقم حاسم حيث تكون المياه مُقننة أو شحيحة.',
    technicalInfoEn:
      'Delivered with the full water treatment skid, a 60-day commissioning programme and operator training on site.',
    technicalInfoAr:
      'يُسلَّم مع وحدة معالجة المياه الكاملة وبرنامج تشغيل تجريبي لمدة ٦٠ يوماً وتدريب المشغلين في الموقع.',
    status: 'AVAILABLE',
    brand: 'Rashidi Engineering',
    modelNumber: 'RWL-1000',
    manufactureYear: 2023,
    countryOfOrigin: 'Italy',
    condition: 'New',
    isFeatured: true,
    sortOrder: 4,
    specifications: [
      spec('Capacity', 'الطاقة الإنتاجية', '1,000 kg/h', '١٠٠٠ كجم/ساعة', 'Output', 'الإنتاجية'),
      spec('Input Material', 'المادة الداخلة', 'PE / PP film, 5–12% contamination', 'أفلام PE / PP، تلوث ٥–١٢٪', 'Output', 'الإنتاجية'),
      spec('Output Moisture', 'رطوبة الناتج', '< 3%', 'أقل من ٣٪', 'Output', 'الإنتاجية'),
      spec('Water Consumption', 'استهلاك المياه', '1.5 m³ / tonne', '١٫٥ م³ / طن', 'Utilities', 'المرافق'),
      spec('Installed Power', 'القدرة المركبة', '285 kW', '٢٨٥ كيلوواط', 'Power', 'الطاقة'),
      spec('Line Length', 'طول الخط', '42 m', '٤٢ م', 'General', 'عام'),
      spec('Operators Required', 'عدد المشغلين', '3 per shift', '٣ لكل وردية', 'General', 'عام'),
    ],
  },
  {
    slug: 'hdpe-ldpe-film-blowing-machine',
    category: 'extrusion-lines',
    nameEn: 'HDPE / LDPE Film Blowing Machine',
    nameAr: 'ماكينة نفخ أفلام HDPE / LDPE',
    shortDescriptionEn:
      'Three-layer co-extrusion film line with rotating die head and automatic thickness control.',
    shortDescriptionAr:
      'خط أفلام ثلاثي الطبقات بالبثق المشترك مع رأس دوّار وتحكم أوتوماتيكي بالسماكة.',
    descriptionEn:
      'Produces barrier and heavy-duty film up to 1,600 mm lay-flat width. The rotating die head distributes gauge variation around the roll instead of stacking it in one place, which is what keeps large rolls cylindrical and usable on automatic packing lines.\n\nAutomatic gauge control trims film thickness tolerance to ±4%, saving material on every metre produced.',
    descriptionAr:
      'ينتج أفلاماً عازلة وثقيلة بعرض مسطح يصل إلى ١٦٠٠ مم. يوزع الرأس الدوّار تباين السماكة حول اللفة بدلاً من تراكمه في موضع واحد، وهو ما يُبقي اللفات الكبيرة أسطوانية وصالحة للاستخدام على خطوط التعبئة الأوتوماتيكية.\n\nيقلّص التحكم الأوتوماتيكي بالسماكة التفاوت إلى ±٤٪، مما يوفر المواد في كل متر يُنتج.',
    technicalInfoEn:
      'Includes corona treater, dual-station winder and an IBC (internal bubble cooling) system.',
    technicalInfoAr:
      'يشمل وحدة معالجة كورونا ولافّة ثنائية المحطة ونظام تبريد الفقاعة الداخلي (IBC).',
    status: 'IN_STOCK',
    brand: 'Kung Hsing',
    modelNumber: 'FB-1600/3',
    manufactureYear: 2019,
    countryOfOrigin: 'Taiwan',
    condition: 'Good — fully operational',
    sortOrder: 5,
    specifications: [
      spec('Max Lay-flat Width', 'أقصى عرض مسطح', '1,600 mm', '١٦٠٠ مم', 'Output', 'الإنتاجية'),
      spec('Film Thickness', 'سماكة الفيلم', '0.02 – 0.20 mm', '٠٫٠٢ – ٠٫٢٠ مم', 'Output', 'الإنتاجية'),
      spec('Output', 'معدل الإنتاج', '220 kg/h', '٢٢٠ كجم/ساعة', 'Output', 'الإنتاجية'),
      spec('Layers', 'عدد الطبقات', '3 (co-extrusion)', '٣ (بثق مشترك)', 'Extruder', 'الباثق'),
      spec('Screw Diameters', 'أقطار اللوالب', '50 / 65 / 50 mm', '٥٠ / ٦٥ / ٥٠ مم', 'Extruder', 'الباثق'),
      spec('Total Power', 'إجمالي القدرة', '175 kW', '١٧٥ كيلوواط', 'Power', 'الطاقة'),
    ],
  },
  {
    slug: 'heavy-duty-plastic-granulator-crusher',
    category: 'recycling-systems',
    nameEn: 'Heavy-Duty Plastic Granulator',
    nameAr: 'طاحونة بلاستيك ثقيلة',
    shortDescriptionEn:
      'Soundproofed claw-cutter granulator for purgings, sprues and thick-wall rejects up to 600 kg/h.',
    shortDescriptionAr:
      'طاحونة بشفرات مخلبية معزولة صوتياً للمخلفات والقنوات والقطع سميكة الجدار حتى ٦٠٠ كجم/ساعة.',
    descriptionEn:
      'Sits beside a press and swallows what it is fed — purgings, runners, rejected thick-wall parts — without stalling. The claw-type rotor grips oversized pieces that a straight blade would simply push around the chamber.\n\nThe acoustic enclosure brings operating noise down to 82 dB, low enough to run inside the production hall rather than banished to a separate room.',
    descriptionAr:
      'توضع بجانب المكبس وتبتلع ما يُغذّى إليها — مخلفات التنظيف والقنوات والقطع سميكة الجدار المرفوضة — دون تعطل. يُمسك الدوار المخلبي بالقطع كبيرة الحجم التي تكتفي الشفرة المستقيمة بدفعها داخل الحجرة.\n\nيخفض الغلاف العازل ضجيج التشغيل إلى ٨٢ ديسيبل، وهو مستوى يسمح بتشغيلها داخل صالة الإنتاج بدلاً من عزلها في غرفة منفصلة.',
    status: 'SOLD',
    brand: 'Zerma',
    modelNumber: 'GSL-500',
    manufactureYear: 2021,
    countryOfOrigin: 'Germany',
    condition: 'Excellent',
    sortOrder: 6,
    specifications: [
      spec('Throughput', 'معدل الإنتاج', 'up to 600 kg/h', 'حتى ٦٠٠ كجم/ساعة', 'Output', 'الإنتاجية'),
      spec('Rotor Diameter', 'قطر الدوار', '500 mm', '٥٠٠ مم', 'Cutting Chamber', 'حجرة القطع'),
      spec('Rotor Knives', 'شفرات الدوار', '3 claw-type', '٣ مخلبية', 'Cutting Chamber', 'حجرة القطع'),
      spec('Screen Size', 'مقاس الشبكة', '8 mm', '٨ مم', 'Cutting Chamber', 'حجرة القطع'),
      spec('Motor', 'المحرك', '45 kW', '٤٥ كيلوواط', 'Power', 'الطاقة'),
      spec('Noise Level', 'مستوى الضجيج', '82 dB(A)', '٨٢ ديسيبل', 'General', 'عام'),
    ],
  },
  {
    slug: 'industrial-water-chiller-60-ton',
    category: 'auxiliary-equipment',
    nameEn: 'Industrial Water Chiller — 60 Tonne',
    nameAr: 'مبرد مياه صناعي — ٦٠ طن تبريد',
    shortDescriptionEn:
      'Screw-compressor chiller with dual circuits, sized for a hall of injection or blow molding machines.',
    shortDescriptionAr:
      'مبرد بضاغط لولبي ودائرتين مستقلتين، مُصمم لخدمة صالة كاملة من مكابس الحقن أو النفخ.',
    descriptionEn:
      'Two independent refrigeration circuits mean a compressor fault halves capacity instead of stopping the hall. Cooling output is controlled by a PID loop on return water temperature, holding mold coolant within ±0.8 °C — stability that shows up directly in part shrinkage consistency.',
    descriptionAr:
      'دائرتا تبريد مستقلتان تعنيان أن عطل أحد الضواغط يخفض القدرة إلى النصف بدلاً من إيقاف الصالة بالكامل. تُدار قدرة التبريد بحلقة تحكم PID على حرارة المياه العائدة، فتبقى حرارة تبريد القالب ضمن ±٠٫٨ درجة مئوية — وهو ثبات ينعكس مباشرة على انتظام انكماش القطع.',
    status: 'AVAILABLE',
    brand: 'Carrier-type',
    modelNumber: 'IWC-60D',
    manufactureYear: 2022,
    countryOfOrigin: 'UAE',
    condition: 'Excellent',
    sortOrder: 7,
    specifications: [
      spec('Cooling Capacity', 'قدرة التبريد', '211 kW (60 TR)', '٢١١ كيلوواط (٦٠ طن تبريد)', 'Performance', 'الأداء'),
      spec('Refrigerant', 'غاز التبريد', 'R-134a', 'R-134a', 'Performance', 'الأداء'),
      spec('Circuits', 'عدد الدوائر', '2 independent', 'دائرتان مستقلتان', 'Performance', 'الأداء'),
      spec('Water Flow', 'تدفق المياه', '36 m³/h', '٣٦ م³/ساعة', 'Hydraulics', 'الدائرة المائية'),
      spec('Temperature Stability', 'ثبات الحرارة', '± 0.8 °C', '± ٠٫٨ درجة مئوية', 'Performance', 'الأداء'),
      spec('Power Input', 'القدرة الكهربائية', '62 kW', '٦٢ كيلوواط', 'Power', 'الطاقة'),
    ],
  },
  {
    slug: 'hydraulic-baling-press-industrial',
    category: 'heavy-industrial',
    nameEn: 'Horizontal Hydraulic Baling Press',
    nameAr: 'مكبس بالات هيدروليكي أفقي',
    shortDescriptionEn:
      'Automatic channel baler for plastic film, PET and cardboard with a 60-tonne pressing force.',
    shortDescriptionAr:
      'مكبس بالات أوتوماتيكي للأفلام البلاستيكية و PET والكرتون بقوة كبس ٦٠ طن.',
    descriptionEn:
      'Compresses loose film and bottles into transport-density bales, which is where recycling economics are usually won or lost — a full trailer instead of a half-empty one. Automatic wire tying handles five strands without an operator at the machine.',
    descriptionAr:
      'يكبس الأفلام والعبوات السائبة إلى بالات بكثافة نقل مناسبة، وهي النقطة التي تُكسب أو تُخسر فيها جدوى إعادة التدوير اقتصادياً — مقطورة ممتلئة بدل أخرى نصف فارغة. يتولى الربط الأوتوماتيكي خمسة أسلاك دون وجود مشغل عند الماكينة.',
    status: 'IN_STOCK',
    brand: 'Rashidi Engineering',
    modelNumber: 'HBP-60A',
    manufactureYear: 2023,
    countryOfOrigin: 'Turkey',
    condition: 'New',
    sortOrder: 8,
    specifications: [
      spec('Pressing Force', 'قوة الكبس', '600 kN (60 T)', '٦٠٠ كيلونيوتن (٦٠ طن)', 'Press', 'المكبس'),
      spec('Bale Size', 'مقاس البالة', '1,100 × 750 × variable mm', '١١٠٠ × ٧٥٠ × متغير مم', 'Output', 'الإنتاجية'),
      spec('Bale Weight', 'وزن البالة', '350 – 500 kg', '٣٥٠ – ٥٠٠ كجم', 'Output', 'الإنتاجية'),
      spec('Throughput', 'معدل المعالجة', 'up to 6 t/h', 'حتى ٦ طن/ساعة', 'Output', 'الإنتاجية'),
      spec('Tying', 'نظام الربط', 'Automatic, 5 wires', 'أوتوماتيكي، ٥ أسلاك', 'Press', 'المكبس'),
      spec('Motor Power', 'قدرة المحرك', '30 kW', '٣٠ كيلوواط', 'Power', 'الطاقة'),
    ],
  },
  {
    slug: 'pvc-pipe-extrusion-line-complete',
    category: 'extrusion-lines',
    nameEn: 'PVC Pipe Extrusion Line — 20 to 250 mm',
    nameAr: 'خط بثق أنابيب PVC — ٢٠ إلى ٢٥٠ مم',
    shortDescriptionEn:
      'Complete pipe line with conical twin extruder, vacuum calibration tank, haul-off and planetary cutter.',
    shortDescriptionAr:
      'خط أنابيب متكامل بباثق مخروطي مزدوج وحوض معايرة بالتفريغ وساحبة وقاطعة كوكبية.',
    descriptionEn:
      'Handles the full municipal and plumbing size range on one frame. Changing diameter means swapping the calibration sleeve and die — a shift changeover, not a project.\n\nThe vacuum tank holds pipe ovality inside the ISO 1452 tolerance band straight off the line, so certification testing stops being a source of rejected batches.',
    descriptionAr:
      'يغطي كامل نطاق المقاسات البلدية والصحية على هيكل واحد. تغيير القطر يعني استبدال كُم المعايرة والفوهة — عملية تتم خلال وردية، لا مشروعاً قائماً بذاته.\n\nيُبقي حوض التفريغ بيضاوية الأنبوب ضمن نطاق تفاوت ISO 1452 مباشرة عند الخروج من الخط، فيتوقف اختبار الاعتماد عن كونه مصدراً لرفض الدفعات.',
    status: 'AVAILABLE',
    brand: 'Battenfeld-Cincinnati type',
    modelNumber: 'PPL-250',
    manufactureYear: 2018,
    countryOfOrigin: 'Austria',
    condition: 'Good — new screws fitted 2023',
    sortOrder: 9,
    specifications: [
      spec('Pipe Diameter Range', 'نطاق قطر الأنبوب', '20 – 250 mm', '٢٠ – ٢٥٠ مم', 'Output', 'الإنتاجية'),
      spec('Wall Thickness', 'سماكة الجدار', '1.5 – 20 mm', '١٫٥ – ٢٠ مم', 'Output', 'الإنتاجية'),
      spec('Max Line Speed', 'أقصى سرعة للخط', '18 m/min', '١٨ م/دقيقة', 'Output', 'الإنتاجية'),
      spec('Extruder Type', 'نوع الباثق', 'Conical twin screw 65/132', 'لولب مخروطي مزدوج ٦٥/١٣٢', 'Extruder', 'الباثق'),
      spec('Output', 'معدل الإنتاج', '450 kg/h', '٤٥٠ كجم/ساعة', 'Output', 'الإنتاجية'),
      spec('Total Line Length', 'إجمالي طول الخط', '34 m', '٣٤ م', 'General', 'عام'),
    ],
  },
  {
    slug: 'plastic-thermoforming-machine-automatic',
    category: 'injection-molding',
    nameEn: 'Automatic Thermoforming Machine',
    nameAr: 'ماكينة تشكيل حراري أوتوماتيكية',
    shortDescriptionEn:
      'Inline form-cut-stack thermoformer for PP, PS and PET food packaging at 35 cycles per minute.',
    shortDescriptionAr:
      'ماكينة تشكيل حراري متكاملة (تشكيل-قص-تكديس) لعبوات الطعام PP و PS و PET بمعدل ٣٥ دورة/دقيقة.',
    descriptionEn:
      'Forms, cuts and stacks in a single pass, so finished cups or trays leave the machine ready for packing. Servo-driven forming and cutting stations hold registration to ±0.3 mm, which matters when a lid has to seal on a rim every time.',
    descriptionAr:
      'تُشكّل وتقص وتُكدّس في مرور واحد، فتخرج الأكواب أو الصواني جاهزة للتعبئة مباشرة. تحافظ محطات التشكيل والقص المُدارة بالسيرفو على تطابق بدقة ±٠٫٣ مم، وهو أمر حاسم حين يتوجب على الغطاء أن يُحكم الإغلاق على الحافة في كل مرة.',
    status: 'IN_STOCK',
    brand: 'Kiefel-type',
    modelNumber: 'TF-780',
    manufactureYear: 2020,
    countryOfOrigin: 'Italy',
    condition: 'Very good',
    sortOrder: 10,
    specifications: [
      spec('Forming Area', 'مساحة التشكيل', '780 × 580 mm', '٧٨٠ × ٥٨٠ مم', 'Forming', 'التشكيل'),
      spec('Max Cycles', 'أقصى عدد دورات', '35 / min', '٣٥ / دقيقة', 'Output', 'الإنتاجية'),
      spec('Sheet Width', 'عرض اللوح', 'up to 800 mm', 'حتى ٨٠٠ مم', 'Forming', 'التشكيل'),
      spec('Sheet Thickness', 'سماكة اللوح', '0.2 – 2.0 mm', '٠٫٢ – ٢٫٠ مم', 'Forming', 'التشكيل'),
      spec('Materials', 'المواد', 'PP, PS, PET, PLA', 'PP، PS، PET، PLA', 'Forming', 'التشكيل'),
      spec('Installed Power', 'القدرة المركبة', '88 kW', '٨٨ كيلوواط', 'Power', 'الطاقة'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Editable site copy
// ---------------------------------------------------------------------------

export const siteContent = [
  {
    key: 'home.hero',
    group: 'home',
    labelEn: 'Home — hero section',
    labelAr: 'الصفحة الرئيسية — القسم الرئيسي',
    sortOrder: 1,
    valueEn: {
      eyebrow: 'Import · Export · Industrial Supply',
      headlineLine1: 'Industrial Machinery.',
      headlineLine2: 'Global Solutions.',
      description:
        'Rashidi Import & Export supplies plastic processing and heavy industrial machinery to manufacturers across the region — sourced, inspected and commissioned by people who have run these machines themselves.',
      primaryCta: 'Explore Machinery',
      secondaryCta: 'Contact Us',
    },
    valueAr: {
      eyebrow: 'استيراد · تصدير · توريد صناعي',
      headlineLine1: 'آلات صناعية.',
      headlineLine2: 'حلول عالمية.',
      description:
        'تورّد الراشيدي للاستيراد والتصدير آلات معالجة البلاستيك والمعدات الصناعية الثقيلة للمصانع في جميع أنحاء المنطقة — يتم اختيارها وفحصها وتشغيلها على يد مختصين شغّلوا هذه الآلات بأنفسهم.',
      primaryCta: 'استعرض الآلات',
      secondaryCta: 'تواصل معنا',
    },
  },
  {
    key: 'home.stats',
    group: 'home',
    labelEn: 'Home — key figures',
    labelAr: 'الصفحة الرئيسية — الأرقام',
    sortOrder: 2,
    valueEn: {
      items: [
        { value: '20+', label: 'Years in industrial trade' },
        { value: '30+', label: 'Countries sourced from' },
        { value: '500+', label: 'Machines delivered' },
        { value: '24/7', label: 'Technical support' },
      ],
    },
    valueAr: {
      items: [
        { value: '+٢٠', label: 'عاماً في التجارة الصناعية' },
        { value: '+٣٠', label: 'دولة نستورد منها' },
        { value: '+٥٠٠', label: 'آلة تم تسليمها' },
        { value: '٢٤/٧', label: 'دعم فني' },
      ],
    },
  },
  {
    key: 'home.capabilities',
    group: 'home',
    labelEn: 'Home — what we do',
    labelAr: 'الصفحة الرئيسية — ماذا نقدم',
    sortOrder: 3,
    valueEn: {
      title: 'Built around how factories actually buy machinery',
      subtitle:
        'Sourcing a production line is a long decision. We handle every step that sits between a requirement and a running machine.',
      items: [
        {
          index: '01',
          title: 'Sourcing & Inspection',
          body: 'We locate machines through a network built over two decades and inspect every unit under power before it is offered — not from a photograph.',
        },
        {
          index: '02',
          title: 'Import & Logistics',
          body: 'Customs documentation, certificates of origin, marine insurance and heavy-lift transport are arranged as one package to your factory gate.',
        },
        {
          index: '03',
          title: 'Installation & Commissioning',
          body: 'Our engineers position, level, connect and run the machine into production, then train your operators on the actual product you make.',
        },
        {
          index: '04',
          title: 'Spare Parts & Service',
          body: 'Screws, barrels, heaters, hydraulic components and control boards sourced on short lead times, long after the sale.',
        },
      ],
    },
    valueAr: {
      title: 'مصمَّم وفق الطريقة التي تشتري بها المصانع آلاتها فعلياً',
      subtitle:
        'شراء خط إنتاج قرار طويل الأمد. نحن نتولى كل خطوة تقع بين تحديد الحاجة وتشغيل الآلة.',
      items: [
        {
          index: '٠١',
          title: 'التوريد والفحص',
          body: 'نعثر على الآلات عبر شبكة بنيناها على مدى عقدين، ونفحص كل وحدة أثناء تشغيلها قبل عرضها — لا من خلال صورة.',
        },
        {
          index: '٠٢',
          title: 'الاستيراد والشحن',
          body: 'المستندات الجمركية وشهادات المنشأ والتأمين البحري ونقل الأحمال الثقيلة تُرتَّب كحزمة واحدة حتى بوابة مصنعك.',
        },
        {
          index: '٠٣',
          title: 'التركيب والتشغيل',
          body: 'يقوم مهندسونا بوضع الآلة وضبط استوائها وتوصيلها وتشغيلها إنتاجياً، ثم تدريب مشغليكم على منتجكم الفعلي.',
        },
        {
          index: '٠٤',
          title: 'قطع الغيار والصيانة',
          body: 'اللوالب والأسطوانات والسخانات والمكونات الهيدروليكية ولوحات التحكم تُورَّد بمهل قصيرة، وبعد البيع بوقت طويل.',
        },
      ],
    },
  },
  {
    key: 'about.main',
    group: 'about',
    labelEn: 'About — main copy',
    labelAr: 'من نحن — النص الرئيسي',
    sortOrder: 1,
    valueEn: {
      eyebrow: 'About Us',
      title: 'Two decades between the factory floor and the shipping manifest',
      lead: 'Rashidi Import & Export is an industrial machinery trading company specialising in plastic processing equipment and large-format industrial plant.',
      paragraphs: [
        'We began as a supplier of spare parts to plastic factories, and that origin still shapes how we work. We were the people receiving the call when a screw seized at two in the morning, which taught us exactly what separates a machine worth importing from one that will sit idle waiting for a part.',
        'Today we source, import, inspect and commission complete production lines — injection molding presses, blow molding systems, extrusion lines, recycling plants and the auxiliary equipment that keeps them all running. Our network of suppliers spans Europe, Turkey, the Far East and the Gulf.',
        'Every machine we offer is inspected under power before it is listed. We provide the technical documentation, the electrical schematics and the foundation drawings a factory actually needs to plan an installation, and our engineers stay until the line is producing sellable parts.',
      ],
      values: [
        {
          title: 'Inspected, not described',
          body: 'No machine reaches our catalogue on the strength of a seller’s photographs. If we list it, we have run it.',
        },
        {
          title: 'Complete technical handover',
          body: 'Schematics, manuals, foundation and utility drawings — the documents that decide whether an installation goes smoothly.',
        },
        {
          title: 'International sourcing',
          body: 'Direct supplier relationships across Europe, Turkey, China, Taiwan and the Gulf, built over twenty years of trade.',
        },
        {
          title: 'Support that outlasts the sale',
          body: 'Spare parts, technical advice and service availability years after commissioning.',
        },
      ],
    },
    valueAr: {
      eyebrow: 'من نحن',
      title: 'عقدان بين أرضية المصنع وبيان الشحن',
      lead: 'الراشيدي للاستيراد والتصدير شركة تجارة آلات صناعية متخصصة في معدات معالجة البلاستيك والمنشآت الصناعية كبيرة الحجم.',
      paragraphs: [
        'بدأنا كمورّد لقطع الغيار لمصانع البلاستيك، وما يزال هذا الأصل يشكّل طريقة عملنا. كنّا الجهة التي تتلقى الاتصال حين يتوقف اللولب في الثانية فجراً، وهو ما علّمنا بدقة ما يفصل بين آلة تستحق الاستيراد وأخرى ستبقى متوقفة بانتظار قطعة غيار.',
        'اليوم نقوم بتوريد واستيراد وفحص وتشغيل خطوط إنتاج كاملة — مكابس حقن البلاستيك وأنظمة النفخ وخطوط البثق ومصانع إعادة التدوير والمعدات المساندة التي تُبقيها جميعاً تعمل. تمتد شبكة موردينا عبر أوروبا وتركيا والشرق الأقصى والخليج.',
        'كل آلة نعرضها يتم فحصها أثناء التشغيل قبل إدراجها. نوفّر الوثائق الفنية والمخططات الكهربائية ومخططات الأساسات التي يحتاجها المصنع فعلياً لتخطيط التركيب، ويبقى مهندسونا حتى ينتج الخط قطعاً قابلة للبيع.',
      ],
      values: [
        {
          title: 'مفحوصة، لا موصوفة',
          body: 'لا تصل أي آلة إلى كتالوجنا اعتماداً على صور البائع. إذا أدرجناها، فقد شغّلناها.',
        },
        {
          title: 'تسليم فني متكامل',
          body: 'المخططات والأدلة ورسومات الأساسات والمرافق — الوثائق التي تحدد ما إذا كان التركيب سيمضي بسلاسة.',
        },
        {
          title: 'توريد دولي',
          body: 'علاقات مباشرة مع موردين في أوروبا وتركيا والصين وتايوان والخليج، بُنيت عبر عشرين عاماً من التجارة.',
        },
        {
          title: 'دعم يتجاوز عملية البيع',
          body: 'قطع غيار ومشورة فنية وخدمة متاحة بعد سنوات من التشغيل.',
        },
      ],
    },
  },
  {
    key: 'contact.details',
    group: 'contact',
    labelEn: 'Contact — details',
    labelAr: 'تواصل معنا — البيانات',
    sortOrder: 1,
    valueEn: {
      eyebrow: 'Contact Us',
      title: 'Tell us what you need to produce',
      lead: 'Send us the part, the output rate and the material — we will tell you which machine fits and what it costs delivered.',
      phone: '+971 50 000 0000',
      phoneSecondary: '+971 4 000 0000',
      whatsapp: '+971500000000',
      email: 'info@rashidi-ie.com',
      salesEmail: 'sales@rashidi-ie.com',
      addressLine1: 'Industrial Area 3, Warehouse 14',
      addressLine2: 'Dubai, United Arab Emirates',
      mapUrl: 'https://maps.google.com/?q=Dubai+Industrial+Area',
      workingHours: 'Saturday – Thursday, 08:00 – 18:00 (GST)',
      formCta: 'Send Inquiry',
    },
    valueAr: {
      eyebrow: 'تواصل معنا',
      title: 'أخبرنا بما تحتاج إنتاجه',
      lead: 'أرسل لنا القطعة ومعدل الإنتاج والمادة — وسنحدد لك الآلة المناسبة وتكلفتها واصلة إليك.',
      phone: '+971 50 000 0000',
      phoneSecondary: '+971 4 000 0000',
      whatsapp: '+971500000000',
      email: 'info@rashidi-ie.com',
      salesEmail: 'sales@rashidi-ie.com',
      addressLine1: 'المنطقة الصناعية ٣، مستودع ١٤',
      addressLine2: 'دبي، الإمارات العربية المتحدة',
      mapUrl: 'https://maps.google.com/?q=Dubai+Industrial+Area',
      workingHours: 'السبت – الخميس، ٠٨:٠٠ – ١٨:٠٠ (بتوقيت الخليج)',
      formCta: 'إرسال الطلب',
    },
  },
  {
    key: 'contact.social',
    group: 'contact',
    labelEn: 'Contact — social links',
    labelAr: 'تواصل معنا — روابط التواصل',
    sortOrder: 2,
    valueEn: {
      items: [
        { platform: 'LinkedIn', url: 'https://linkedin.com/company/rashidi-import-export' },
        { platform: 'Instagram', url: 'https://instagram.com/rashidi.import.export' },
        { platform: 'Facebook', url: 'https://facebook.com/rashidi.import.export' },
        { platform: 'YouTube', url: 'https://youtube.com/@rashidi-import-export' },
      ],
    },
    valueAr: {
      items: [
        { platform: 'لينكد إن', url: 'https://linkedin.com/company/rashidi-import-export' },
        { platform: 'إنستغرام', url: 'https://instagram.com/rashidi.import.export' },
        { platform: 'فيسبوك', url: 'https://facebook.com/rashidi.import.export' },
        { platform: 'يوتيوب', url: 'https://youtube.com/@rashidi-import-export' },
      ],
    },
  },
  {
    key: 'site.meta',
    group: 'general',
    labelEn: 'Site — SEO defaults',
    labelAr: 'الموقع — إعدادات SEO',
    sortOrder: 1,
    valueEn: {
      siteName: 'Rashidi Import & Export',
      tagline: 'Industrial & Plastic Machinery',
      defaultTitle: 'Rashidi Import & Export — Industrial & Plastic Machinery',
      defaultDescription:
        'Import, export and supply of plastic processing machinery and heavy industrial equipment. Injection molding, blow molding, extrusion, recycling lines and auxiliary equipment — inspected, delivered and commissioned.',
    },
    valueAr: {
      siteName: 'الراشيدي للاستيراد والتصدير',
      tagline: 'آلات صناعية وآلات البلاستيك',
      defaultTitle: 'الراشيدي للاستيراد والتصدير — آلات صناعية وآلات البلاستيك',
      defaultDescription:
        'استيراد وتصدير وتوريد آلات معالجة البلاستيك والمعدات الصناعية الثقيلة. مكابس الحقن والنفخ وخطوط البثق وإعادة التدوير والمعدات المساندة — مفحوصة ومُسلَّمة ومُشغَّلة.',
    },
  },
  {
    key: 'footer.main',
    group: 'footer',
    labelEn: 'Footer',
    labelAr: 'التذييل',
    sortOrder: 1,
    valueEn: {
      blurb:
        'Industrial and plastic machinery, sourced and commissioned for manufacturers across the region.',
      copyright: 'Rashidi Import & Export. All rights reserved.',
    },
    valueAr: {
      blurb: 'آلات صناعية وآلات بلاستيك، تُورَّد وتُشغَّل لمصانع المنطقة.',
      copyright: 'الراشيدي للاستيراد والتصدير. جميع الحقوق محفوظة.',
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'rashidi@admin.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '0122221724';
  const name = process.env.ADMIN_NAME || 'Rashidi Administrator';

  const existing = await prisma.user.findUnique({ where: { email } });

  // An existing account keeps its password: re-running the seed must never
  // silently reset live credentials. Use `npm run admin:set` to change them.
  if (existing) {
    console.log(`  · admin account already present (${email}) — password left unchanged`);
    console.log('    run `npm run admin:set` to reset it');
    return;
  }

  await prisma.user.create({
    data: { email, name, role: 'ADMIN', password: await bcrypt.hash(password, 12) },
  });

  console.log(`  · admin account created — ${email} / ${password}`);
}

async function main() {
  console.log('\nSeeding Rashidi Import & Export…\n');

  await seedAdmin();

  const categoryIds = {};
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: category,
    });
    categoryIds[category.slug] = saved.id;
  }
  console.log(`  · ${categories.length} categories`);

  for (const machine of machines) {
    const { category, specifications, ...data } = machine;

    const saved = await prisma.machine.upsert({
      where: { slug: machine.slug },
      create: { ...data, categoryId: categoryIds[category] },
      update: { ...data, categoryId: categoryIds[category] },
    });

    // Specs are authored here, so replace them wholesale on every run.
    await prisma.machineSpecification.deleteMany({ where: { machineId: saved.id } });
    await prisma.machineSpecification.createMany({
      data: specifications.map((item, index) => ({
        ...item,
        machineId: saved.id,
        sortOrder: index,
      })),
    });
  }
  console.log(`  · ${machines.length} machines with specifications`);

  for (const block of siteContent) {
    await prisma.siteContent.upsert({
      where: { key: block.key },
      create: block,
      update: block,
    });
  }
  console.log(`  · ${siteContent.length} site content blocks`);

  console.log('\nDone. Upload machine photographs from the admin dashboard.\n');
}

// Only seed when this file is the entry point. The data arrays above are
// exported, so other tooling can import them without opening a database
// connection or writing anything.
const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main()
    .catch((error) => {
      console.error('\nSeed failed:\n', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
