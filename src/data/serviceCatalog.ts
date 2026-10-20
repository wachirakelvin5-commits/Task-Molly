import React from 'react';
import {
  IndoorCleaningIcon,
  OutdoorServicesIcon,
  OfficeCleaningIcon,
  MovingCleaningIcon,
  MomsHelperIcon,
  ElderCareIcon,
  AirbnbCleaningIcon,
  LaundryIroningIcon,
  DogWalkingIcon,
  ExpressCleaningIcon,
  ExtraCareIcon,
  MamaFuaIcon,
  PlumbingIcon,
  ElectricalIcon,
  FundiHandymanIcon,
  GardeningIcon,
  PaintingIcon,
  MoversIcon,
  PestControlIcon,
  CookMealIcon,
  SofaCarpetIcon,
  ApplianceRepairIcon,
  SecurityCctvIcon,
  CarWashIcon,
  TvMountingIcon,
  ErrandRunnerIcon,
  OtherServiceIcon
} from '../components/ServiceIcons';
import type { ServiceCategory } from '../lib/requestModel';

export interface ServiceItem {
  id: string;
  name: string;
  category: 'cleaning' | 'care' | 'repairs' | 'outdoor' | 'general';
  isFromImage?: boolean;
  IconComponent: React.ComponentType<{ className?: string; size?: number }>;
}

export const ALL_SERVICES_CATALOG: ServiceItem[] = [
  // 1-11: EXACT OPTIONS FROM THE ATTACHED IMAGE (Retained first as requested)
  {
    id: 'indoor_cleaning',
    name: 'Indoor Cleaning',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: IndoorCleaningIcon
  },
  {
    id: 'outdoor_services',
    name: 'Outdoor Services',
    category: 'outdoor',
    isFromImage: true,
    IconComponent: OutdoorServicesIcon
  },
  {
    id: 'office_cleaning',
    name: 'Office Cleaning',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: OfficeCleaningIcon
  },
  {
    id: 'moving_cleaning',
    name: 'Moving Cleaning',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: MovingCleaningIcon
  },
  {
    id: 'moms_helper',
    name: "Mom's Helper",
    category: 'care',
    isFromImage: true,
    IconComponent: MomsHelperIcon
  },
  {
    id: 'elder_care',
    name: 'Elder Care',
    category: 'care',
    isFromImage: true,
    IconComponent: ElderCareIcon
  },
  {
    id: 'airbnb_cleaning',
    name: 'Airbnb Cleaning',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: AirbnbCleaningIcon
  },
  {
    id: 'laundry_ironing',
    name: 'Laundry & Ironing',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: LaundryIroningIcon
  },
  {
    id: 'dog_walking',
    name: 'Dog Walking',
    category: 'care',
    isFromImage: true,
    IconComponent: DogWalkingIcon
  },
  {
    id: 'express_cleaning',
    name: 'Express Cleaning',
    category: 'cleaning',
    isFromImage: true,
    IconComponent: ExpressCleaningIcon
  },
  {
    id: 'extra_care',
    name: 'Extra Care',
    category: 'care',
    isFromImage: true,
    IconComponent: ExtraCareIcon
  },

  // 12+: OPTIONS FROM THE DROPDOWN (Retained & styled in the exact same design)
  {
    id: 'mama_fua',
    name: 'Mama Fua Care',
    category: 'cleaning',
    IconComponent: MamaFuaIcon
  },
  {
    id: 'carpet_sofa_cleaning',
    name: 'Carpet & Sofa Cleaning',
    category: 'cleaning',
    IconComponent: SofaCarpetIcon
  },
  {
    id: 'cook_meal',
    name: 'Cook & Meal Preparation',
    category: 'care',
    IconComponent: CookMealIcon
  },
  {
    id: 'plumbing_repairs',
    name: 'Plumbing & Water Repairs',
    category: 'repairs',
    IconComponent: PlumbingIcon
  },
  {
    id: 'electrical_solar',
    name: 'Electrician & Wiring',
    category: 'repairs',
    IconComponent: ElectricalIcon
  },
  {
    id: 'fundi_handyman',
    name: 'Fundi & Handyman Fixes',
    category: 'repairs',
    IconComponent: FundiHandymanIcon
  },
  {
    id: 'appliance_repair',
    name: 'Appliance Repair',
    category: 'repairs',
    IconComponent: ApplianceRepairIcon
  },
  {
    id: 'gardening_landscaping',
    name: 'Gardener & Compound',
    category: 'outdoor',
    IconComponent: GardeningIcon
  },
  {
    id: 'house_painting',
    name: 'House Painting',
    category: 'outdoor',
    IconComponent: PaintingIcon
  },
  {
    id: 'movers_relocation',
    name: 'Movers & Relocation',
    category: 'outdoor',
    IconComponent: MoversIcon
  },
  {
    id: 'pest_control',
    name: 'Pest Control & Fumigation',
    category: 'outdoor',
    IconComponent: PestControlIcon
  },
  {
    id: 'car_wash',
    name: 'Car Wash Detailing',
    category: 'cleaning',
    IconComponent: CarWashIcon
  },
  {
    id: 'tv_mounting',
    name: 'TV Mounting & Brackets',
    category: 'repairs',
    IconComponent: TvMountingIcon
  },
  {
    id: 'security_cctv',
    name: 'Security & CCTV Setup',
    category: 'repairs',
    IconComponent: SecurityCctvIcon
  },
  {
    id: 'errand_runner',
    name: 'Errand Runner & Concierge',
    category: 'general',
    IconComponent: ErrandRunnerIcon
  },

  // LAST OPTION AS EXPLICITLY REQUESTED: "Let the last option be other."
  {
    id: 'other',
    name: 'Other',
    category: 'general',
    IconComponent: OtherServiceIcon
  }
];

export const POPULAR_LOCATIONS = [
  'Kilimani',
  'Westlands',
  'Kileleshwa',
  'Lavington',
  'Karen',
  'South C',
  'South B',
  'Parklands',
  'Roysambu',
  'Lang\'ata',
  'Runda',
  'Ngong Road',
  'Riverside',
  'Muthaiga',
  'Upper Hill',
  'Kasarani',
  'Syokimau'
];

// Which provider category (see SERVICE_CATEGORIES in lib/serviceRequests.ts) receives each service.
// "Other" has none: its category is worked out from the title the client types.
const GROUP_CATEGORY: Record<ServiceItem['category'], ServiceCategory | undefined> = {
  cleaning: 'Cleaning & Domestic',
  care: 'Cleaning & Domestic',
  repairs: 'Repairs & Fundi',
  outdoor: 'Outdoor & Relocation',
  general: undefined,
};

const SERVICE_CATEGORY_OVERRIDES: Record<string, ServiceCategory> = {
  plumbing_repairs: 'Plumbing & Water',
  electrical_solar: 'Electrical & Solar',
  security_cctv: 'Electrical & Solar',
  errand_runner: 'Outdoor & Relocation',
};

export function getCatalogServiceCategory(service: ServiceItem): ServiceCategory | undefined {
  return SERVICE_CATEGORY_OVERRIDES[service.id] ?? GROUP_CATEGORY[service.category];
}
