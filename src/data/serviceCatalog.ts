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
  OtherServiceIcon,
  ShoppingIcon,
  GroceryIcon,
  CarpenterIcon,
  DriverIcon,
  GasIcon,
  InternetIcon,
  MakeupIcon,
} from '../components/ServiceIcons';
import type { ServiceCategory } from '../lib/requestModel';

export interface ServiceItem {
  id: string;
  name: string;
  category: 'cleaning' | 'care' | 'repairs' | 'outdoor' | 'general';
  IconComponent: React.ComponentType<{ className?: string; size?: number }>;
  /** What the first (description) box on the request form says. Default: "Task description". */
  descriptionPrompt?: string;
  /** Show the description box as a lined notepad (for lists). */
  notepad?: boolean;
}

/**
 * The services offered, in the order they are shown: on the home page's Request tab, the
 * request page, the task-molly provider list (pen icon) and the provider's services page.
 * "Other" is always last.
 */
export const REQUEST_SERVICES: ServiceItem[] = [
  { id: 'errand_runner', name: 'Errand Runner & Concierge', category: 'general', IconComponent: ErrandRunnerIcon, descriptionPrompt: 'List your errands' },
  { id: 'shopping', name: 'Shopping', category: 'general', IconComponent: ShoppingIcon, descriptionPrompt: 'Type your list', notepad: true },
  { id: 'grocery_shopping', name: 'Grocery Shopping', category: 'general', IconComponent: GroceryIcon, descriptionPrompt: 'Type your list', notepad: true },
  { id: 'mama_fua', name: 'Mama Fua Care', category: 'cleaning', IconComponent: MamaFuaIcon },
  { id: 'carpet_sofa_cleaning', name: 'Carpet & Sofa Cleaning', category: 'cleaning', IconComponent: SofaCarpetIcon },
  { id: 'laundry_ironing', name: 'Laundry & Ironing', category: 'cleaning', IconComponent: LaundryIroningIcon },
  { id: 'indoor_cleaning', name: 'Indoor Cleaning', category: 'cleaning', IconComponent: IndoorCleaningIcon },
  { id: 'cook_meal', name: 'Cook & Meal Preparation', category: 'care', IconComponent: CookMealIcon },
  { id: 'plumbing_repairs', name: 'Plumbing & Water Repairs', category: 'repairs', IconComponent: PlumbingIcon },
  { id: 'electrical_solar', name: 'Electrician & Wiring', category: 'repairs', IconComponent: ElectricalIcon },
  { id: 'fundi_handyman', name: 'Fundi & Handyman Fixes', category: 'repairs', IconComponent: FundiHandymanIcon },
  { id: 'carpenter', name: 'Carpenter', category: 'repairs', IconComponent: CarpenterIcon },
  { id: 'appliance_repair', name: 'Appliances Repair', category: 'repairs', IconComponent: ApplianceRepairIcon },
  { id: 'tv_mounting', name: 'TV Mounting & Brackets', category: 'repairs', IconComponent: TvMountingIcon },
  { id: 'movers_relocation', name: 'Movers & Relocation', category: 'outdoor', IconComponent: MoversIcon },
  { id: 'pest_control', name: 'Pest Control & Fumigation', category: 'outdoor', IconComponent: PestControlIcon },
  { id: 'gardening_landscaping', name: 'Gardener & Compound', category: 'outdoor', IconComponent: GardeningIcon },
  { id: 'security_cctv', name: 'Security & CCTV Setup', category: 'repairs', IconComponent: SecurityCctvIcon },
  { id: 'house_painting', name: 'House Painting', category: 'outdoor', IconComponent: PaintingIcon },
  { id: 'airbnb_cleaning', name: 'AirBnB Cleaning', category: 'cleaning', IconComponent: AirbnbCleaningIcon },
  { id: 'dog_walking', name: 'Dog Walking', category: 'care', IconComponent: DogWalkingIcon },
  { id: 'elder_care', name: 'Elder Care', category: 'care', IconComponent: ElderCareIcon },
  { id: 'moms_helper', name: "Mom's Helper (Babysitting & Child Care)", category: 'care', IconComponent: MomsHelperIcon },
  { id: 'driver', name: 'Driver', category: 'general', IconComponent: DriverIcon },
  { id: 'gas', name: 'Gas', category: 'repairs', IconComponent: GasIcon },
  { id: 'internet_installation', name: 'Internet Installation', category: 'general', IconComponent: InternetIcon },
  { id: 'makeup_professional', name: 'Make-up Professional', category: 'care', IconComponent: MakeupIcon },
  { id: 'other', name: 'Other', category: 'general', IconComponent: OtherServiceIcon },
];

/**
 * Services no longer offered. Kept only so requests and provider verifications saved
 * with these ids still show the right name and category; they are not listed anywhere.
 */
const RETIRED_SERVICES: ServiceItem[] = [
  { id: 'outdoor_services', name: 'Outdoor Services', category: 'outdoor', IconComponent: OutdoorServicesIcon },
  { id: 'office_cleaning', name: 'Office Cleaning', category: 'cleaning', IconComponent: OfficeCleaningIcon },
  { id: 'moving_cleaning', name: 'Moving Cleaning', category: 'cleaning', IconComponent: MovingCleaningIcon },
  { id: 'express_cleaning', name: 'Express Cleaning', category: 'cleaning', IconComponent: ExpressCleaningIcon },
  { id: 'extra_care', name: 'Extra Care', category: 'care', IconComponent: ExtraCareIcon },
  { id: 'car_wash', name: 'Car Wash Detailing', category: 'cleaning', IconComponent: CarWashIcon },
];

/** Every service id the app knows, for looking up saved data. To list services, use REQUEST_SERVICES. */
export const ALL_SERVICES_CATALOG: ServiceItem[] = [...REQUEST_SERVICES, ...RETIRED_SERVICES];

/** The services on the task-molly provider list (pen icon): every service except "Other". */
export const PROVIDER_LIST_SERVICES: ServiceItem[] = REQUEST_SERVICES.filter((s) => s.id !== 'other');

export function findService(idOrName: string | null | undefined): ServiceItem | null {
  if (!idOrName) return null;
  const key = idOrName.trim().toLowerCase();
  return ALL_SERVICES_CATALOG.find((s) => s.id === idOrName || s.name.toLowerCase() === key) || null;
}

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
  shopping: 'Outdoor & Relocation',
  grocery_shopping: 'Outdoor & Relocation',
  driver: 'Outdoor & Relocation',
  internet_installation: 'Outdoor & Relocation',
};

export function getCatalogServiceCategory(service: ServiceItem): ServiceCategory | undefined {
  return SERVICE_CATEGORY_OVERRIDES[service.id] ?? GROUP_CATEGORY[service.category];
}
