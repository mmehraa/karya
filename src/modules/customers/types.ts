/**
 * Serialized customer record used across Server → Client boundaries.
 */
export interface SerializedCustomer {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
