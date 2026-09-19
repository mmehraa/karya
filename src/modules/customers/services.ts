import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SerializedCustomer } from "./types";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./validation";

/**
 * Serializes a Prisma Customer record into the plain structure
 * used across Server → Client boundaries.
 */
function serializeCustomer(customer: {
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
}): SerializedCustomer {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

/**
 * Retrieves all customers for a business in deterministic order.
 *
 * businessId is supplied by the server-side caller and is never taken
 * from client input.
 */
export async function getCustomers(
  businessId: string
): Promise<SerializedCustomer[]> {
  const customers = await db.customer.findMany({
    where: {
      businessId,
    },
    orderBy: [
      { name: "asc" },
      { createdAt: "desc" },
    ],
  });

  return customers.map(serializeCustomer);
}

/**
 * Retrieves a single customer within the specified business.
 */
export async function getCustomerById(
  businessId: string,
  customerId: string
): Promise<SerializedCustomer | null> {
  const customer = await db.customer.findUnique({
    where: {
      businessId_id: {
        businessId,
        id: customerId,
      },
    },
  });

  return customer ? serializeCustomer(customer) : null;
}

/**
 * Creates a customer for the specified business.
 *
 * businessId is injected server-side to preserve tenant isolation.
 */
export async function createCustomer(
  businessId: string,
  input: CreateCustomerInput
): Promise<SerializedCustomer> {
  const created = await db.customer.create({
    data: {
      businessId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      notes: input.notes ?? null,
    },
  });

  return serializeCustomer(created);
}

/**
 * Updates an existing customer within the specified business.
 *
 * The composite businessId + id key guarantees that an update cannot
 * cross the tenant boundary.
 */
export async function updateCustomer(
  businessId: string,
  input: UpdateCustomerInput
): Promise<SerializedCustomer> {
  const { id, ...fields } = input;

  const updateData: Prisma.CustomerUpdateInput = {};

  if (fields.name !== undefined) {
    updateData.name = fields.name;
  }

  if (fields.email !== undefined) {
    updateData.email = fields.email;
  }

  if (fields.phone !== undefined) {
    updateData.phone = fields.phone;
  }

  if (fields.city !== undefined) {
    updateData.city = fields.city;
  }

  if (fields.state !== undefined) {
    updateData.state = fields.state;
  }

  if (fields.notes !== undefined) {
    updateData.notes = fields.notes;
  }

  const updated = await db.customer.update({
    where: {
      businessId_id: {
        businessId,
        id,
      },
    },
    data: updateData,
  });

  return serializeCustomer(updated);
}