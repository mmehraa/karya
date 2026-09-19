/**
 * Serialized representation of a Customer.
 *
 * Kept as a plain data structure so customer records can safely
 * cross the Server Component → Client Component boundary.
 */
export interface SerializedCustomer {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}