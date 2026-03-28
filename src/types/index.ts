export type Language = "en" | "es";
export type UserRole = "owner" | "manager" | "staff" | "cleaner";
export type JobStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type CustomerStatus = "lead" | "active" | "inactive";

export interface User {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  preferredLanguage: Language;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  businessType: string;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  timezone: string;
  contactEmail?: string;
  contactPhone?: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  subscription: {
    plan: "trial" | "basic" | "pro" | "enterprise";
    status: "active" | "past_due" | "canceled";
    renewalDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredLanguage: Language;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: { lat: number; lng: number };
  };
  notes?: string;
  tags: string[];
  status: CustomerStatus;
  source: "manual" | "website" | "phone" | "referral" | "facebook" | "google";
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  tenantId: string;
  name: { en: string; es: string };
  description: { en?: string; es?: string };
  durationMinutes?: number;
  basePrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  serviceId?: string | Service;
  title?: string;
  propertyAddress: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: { lat: number; lng: number };
  };
  scheduledStart: string;
  scheduledEnd?: string;
  status: JobStatus;
  assignedUsers: (string | User)[];
  checklist: { label: { en: string; es: string }; completed: boolean }[];
  notesInternal?: string;
  notesCustomer?: string;
  recurringRuleId?: string;
  price?: number;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface Invoice {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  jobId?: string | Job;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency: string;
  status: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "stripe" | "other";
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalCustomers: number;
  jobsToday: number;
  jobsThisWeek: number;
  revenueMonth: number;
  pendingInvoices: number;
  recentJobs: Job[];
  statusBreakdown: Record<JobStatus, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  tenantName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthData {
  token: string;
  user: User;
}
