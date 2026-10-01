import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SerializedCustomer } from "./types";
import type { CreateCustomerInput, UpdateCustomerInput } from "./validation";

function serializeCustomer(customer: {
  id: string; businessId: string; name: string;
  email: string | null; phone: string | null;
  addressLine1: string | null; addressLine2: string | null;
  city: string | null; state: string | null;
  postalCode: string | null; country: string | null;
  notes: string | null; createdAt: Date; updatedAt: Date;
}): SerializedCustomer {
  return {
    id: customer.id, businessId: customer.businessId, name: customer.name,
    email: customer.email, phone: customer.phone,
    addressLine1: customer.addressLine1, addressLine2: customer.addressLine2,
    city: customer.city, state: customer.state,
    postalCode: customer.postalCode, country: customer.country,
    notes: customer.notes, createdAt: customer.createdAt, updatedAt: customer.updatedAt,
  };
}

export async function getCustomers(businessId: string): Promise<SerializedCustomer[]> {
  const customers = await db.customer.findMany({
    where: { businessId },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
  return customers.map(serializeCustomer);
}

export async function getCustomerById(
  businessId: string, customerId: string
): Promise<SerializedCustomer | null> {
  const customer = await db.customer.findUnique({
    where: { businessId_id: { businessId, id: customerId } },
  });
  return customer ? serializeCustomer(customer) : null;
}

export async function createCustomer(
  businessId: string, input: CreateCustomerInput
): Promise<SerializedCustomer> {
  const created = await db.customer.create({
    data: {
      businessId, name: input.name,
      email: input.email ?? null, phone: input.phone ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null, state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? "India",
      notes: input.notes ?? null,
    },
  });
  return serializeCustomer(created);
}

export async function updateCustomer(
  businessId: string, input: UpdateCustomerInput
): Promise<SerializedCustomer> {
  const { id, ...fields } = input;
  const updateData: Prisma.CustomerUpdateInput = {};
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.email !== undefined) updateData.email = fields.email;
  if (fields.phone !== undefined) updateData.phone = fields.phone;
  if (fields.addressLine1 !== undefined) updateData.addressLine1 = fields.addressLine1;
  if (fields.addressLine2 !== undefined) updateData.addressLine2 = fields.addressLine2;
  if (fields.city !== undefined) updateData.city = fields.city;
  if (fields.state !== undefined) updateData.state = fields.state;
  if (fields.postalCode !== undefined) updateData.postalCode = fields.postalCode;
  if (fields.country !== undefined) updateData.country = fields.country;
  if (fields.notes !== undefined) updateData.notes = fields.notes;

  const updated = await db.customer.update({
    where: { businessId_id: { businessId, id } },
    data: updateData,
  });
  return serializeCustomer(updated);
}
