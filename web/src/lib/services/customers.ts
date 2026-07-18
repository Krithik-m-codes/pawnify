/**
 * Customer Service — CRUD, Search, KYC Management
 */

import { Prisma, KycStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

// ==================== Types ====================

export interface CustomerCreateData {
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  photoUrl?: string;
  kycDocuments?: Array<{
    docType: "AADHAAR" | "PAN" | "VOTER_ID" | "PASSPORT" | "DRIVING_LICENSE";
    docNumber: string;
    fileUrl?: string;
  }>;
}

export interface CustomerFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

// ==================== CRUD ====================

export async function createCustomer(data: CustomerCreateData, staffId: string) {
  return await prisma.customer.create({
    data: {
      organizationId: data.organizationId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      dob: data.dob ? new Date(data.dob) : null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      photoUrl: data.photoUrl || null,
      createdById: staffId,
      kycDocuments: data.kycDocuments?.length
        ? {
            create: data.kycDocuments.map((doc) => ({
              organizationId: data.organizationId,
              docType: doc.docType,
              docNumber: doc.docNumber,
              fileUrl: doc.fileUrl || null,
            })),
          }
        : undefined,
    },
    include: { kycDocuments: true },
  });
}

export async function getCustomers(filters: CustomerFilters = {}) {
  const { page = 1, pageSize = 20, search } = filters;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        kycDocuments: { select: { docType: true, status: true } },
        _count: { select: { loans: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(id: string) {
  return await prisma.customer.findUnique({
    where: { id },
    include: {
      kycDocuments: true,
      createdBy: { select: { id: true, name: true } },
      loans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          loanNumber: true,
          loanDate: true,
          dueDate: true,
          gracePeriodDays: true,
          principalAmount: true,
          principalOutstanding: true,
          status: true,
          totalAssessedValue: true,
        },
      },
    },
  });
}

/**
 * Typeahead search for customer selection in loan creation.
 */
export async function searchCustomers(query: string, limit = 10) {
  if (!query || query.length < 2) return [];

  return await prisma.customer.findMany({
    where: {
      OR: [{ fullName: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }],
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
    },
    take: limit,
    orderBy: { fullName: "asc" },
  });
}

// ==================== KYC ====================

export async function updateKycStatus(docId: string, status: KycStatus, verifiedById: string) {
  return await prisma.kycDocument.update({
    where: { id: docId },
    data: {
      status,
      verifiedById: status !== "PENDING" ? verifiedById : null,
    },
  });
}

export async function addKycDocument(
  customerId: string,
  docType: "AADHAAR" | "PAN" | "VOTER_ID" | "PASSPORT" | "DRIVING_LICENSE",
  docNumber: string,
  fileUrl?: string,
  organizationId?: string
) {
  let orgId = organizationId;
  if (!orgId) {
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (cust) orgId = cust.organizationId;
    else throw new Error("Customer not found");
  }
  return await prisma.kycDocument.create({
    data: {
      organizationId: orgId,
      customerId,
      docType,
      docNumber,
      fileUrl: fileUrl || null,
    },
  });
}

/**
 * Check if primary identity document (e.g., PAN / Tax ID / Primary ID) is required
 * based on LoanPolicy threshold or fallback AppSetting.
 */
export async function checkPanRequired(
  customerId: string,
  newPrincipalAmount?: string | number,
  organizationId?: string
): Promise<{
  required: boolean;
  hasPan: boolean;
  threshold: number;
}> {
  let threshold = 50000;
  let primaryDocTypeNames: string[] = ["PAN"];

  if (organizationId) {
    const policy = await prisma.loanPolicy.findUnique({
      where: { organizationId },
    });
    if (policy && policy.mandatoryIdThreshold) {
      threshold = parseFloat(policy.mandatoryIdThreshold.toString());
    }

    const docTypes = await prisma.documentType.findMany({
      where: { organizationId, isPrimaryId: true },
    });
    if (docTypes.length > 0) {
      primaryDocTypeNames = docTypes.map((d) => d.name.toUpperCase());
    }
  } else {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "pan.threshold" },
    });
    if (setting) {
      threshold = parseFloat(setting.value);
    }
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { kycDocuments: { include: { documentType: true } } },
  });

  const hasPrimaryDoc =
    customer?.kycDocuments.some(
      (doc) =>
        doc.docType === "PAN" ||
        (doc.documentType && doc.documentType.isPrimaryId) ||
        primaryDocTypeNames.includes(doc.docNumber.toUpperCase()) ||
        primaryDocTypeNames.includes(doc.docType.toString())
    ) ?? false;

  const activeLoansAggregate = await prisma.loan.aggregate({
    where: { customerId, status: "ACTIVE" },
    _sum: { principalAmount: true },
  });

  const existingTotal = activeLoansAggregate._sum.principalAmount
    ? parseFloat(activeLoansAggregate._sum.principalAmount.toString())
    : 0;
  const addition = newPrincipalAmount ? parseFloat(newPrincipalAmount.toString()) : 0;
  const totalAmount = existingTotal + addition;

  return {
    required: threshold > 0 && totalAmount >= threshold,
    hasPan: hasPrimaryDoc,
    threshold,
  };
}
