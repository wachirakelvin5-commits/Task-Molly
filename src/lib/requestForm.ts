import { auth } from '../firebase';
import { getCatalogServiceCategory, ServiceItem } from '../data/serviceCatalog';
import type { LocationSelection } from '../components/LocationAutocomplete';
import { savePendingRequest } from './pendingRequestService';
import { createServiceRequest } from './serviceRequests';

/** What the request page and request popup collect. */
export interface RequestFormInput {
  service: ServiceItem;
  customTitle: string;
  clientName: string;
  clientPhone: string;
  location: LocationSelection;
  unitOrApartment: string;
  description: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string;
}

function formatScheduledDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function buildRequestPayload(input: RequestFormInput) {
  const isOther = input.service.id === 'other';
  const serviceName = isOther && input.customTitle.trim() ? input.customTitle.trim() : input.service.name;
  const address = input.location.fullAddress || input.location.specificAddress;
  const unit = input.unitOrApartment.trim();

  return {
    title: serviceName,
    serviceType: serviceName,
    serviceId: input.service.id,
    serviceCategory: isOther ? undefined : getCatalogServiceCategory(input.service),
    description: input.description.trim(),
    clientName: input.clientName.trim(),
    clientPhone: input.clientPhone.trim(),
    location: unit ? `${unit}, ${address}` : address,
    neighborhood: input.location.neighborhood || 'Nairobi',
    specificAddress: input.location.specificAddress || input.location.fullAddress,
    unitOrApartment: unit,
    urgency: 'Scheduled',
    scheduledDate: input.scheduledDate,
    scheduledTimeSlot: input.scheduledTimeSlot,
    scheduledTime: `${formatScheduledDate(input.scheduledDate)} • ${input.scheduledTimeSlot}`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    paymentStatus: 'pending',
  };
}

/**
 * Posts the request for the signed-in client. Guests' requests are kept in the browser
 * and posted after they sign in (see finalizePendingRequest).
 */
export async function submitServiceRequest(
  payload: ReturnType<typeof buildRequestPayload>
): Promise<'created' | 'needs-login'> {
  const user = auth.currentUser;
  if (!user) {
    savePendingRequest(payload);
    return 'needs-login';
  }
  await createServiceRequest(user.uid, payload);
  return 'created';
}
