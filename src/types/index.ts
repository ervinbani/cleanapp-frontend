export type Language = "en" | "es" | "it" | "sq";

export interface TenantLanguage {
  lang: string;
  label?: string;
  active: boolean;
  isDefault: boolean;
}

export interface AvailableLanguage {
  lang: string;
  label: string;
}
export type UserRole =
  | "owner"
  | "director"
  | "manager_operations"
  | "manager_hr"
  | "staff"
  | "worker";
export type JobStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "void";
export type CustomerStatus = "lead" | "active" | "inactive";

export interface User {
  id: string;
  _id?: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  preferredLanguage: Language;
  phone?: string;
  isActive: boolean;
  emailVerified?: boolean;
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
  languages: TenantLanguage[];
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
  basePrice?: number;
  priceUnit?: "per_hour" | "per_job" | "per_day";
  overtime?: {
    isEnabled: boolean;
    unit?: "per_hour" | "per_job" | "per_day";
    extraPercentage?: number;
  };
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
  priceUnit?: "per_hour" | "per_job" | "per_day";
  overtimeHours?: number;
  timeDuration?: number;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description?: string;
  serviceType?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  priceUnit?: string;
  total?: number;
}

export interface Invoice {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  jobId?: string | Job;
  jobIds?: (string | Job)[];
  invoiceNumber: string;
  customerSnapshot?: {
    name?: string;
    email?: string;
    address?: string;
    vatNumber?: string;
  };
  issuedDate?: string;
  dueDate?: string;
  servicePeriod?: {
    from?: string;
    to?: string;
  };
  items: InvoiceItem[];
  subtotal?: number;
  discount?: { type: "percentage" | "fixed"; value: number; amount?: number };
  taxRate?: number;
  tax?: number;
  total?: number;
  currency: string;
  status: InvoiceStatus;
  sentAt?: string;
  paidAt?: string;
  paymentMethod?:
    | "cash"
    | "card"
    | "bank_transfer"
    | "stripe"
    | "paypal"
    | "other";
  notes?: string;
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

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface RecurringRule {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  serviceId?: string | Service;
  frequency: RecurringFrequency;
  daysOfWeek: number[]; // 0=Sun … 6=Sat, at least one required for weekly
  monthsOfYear?: number[]; // 1-12, empty/absent = every month
  dayOfMonth?: number; // 1-31 (monthly)
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime: string; // HH:MM UTC
  timeDuration?: number; // hours
  title?: string;
  price?: number;
  priceUnit?: "per_hour" | "per_job" | "per_day";
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  assignedUsers: (string | User)[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

// Roles & Permissions
export type PermissionAction = "read" | "create" | "update" | "delete";
export type PermissionResource =
  | "users"
  | "jobs"
  | "services"
  | "invoices"
  | "roles"
  | "permissions"
  | "documents";

export interface Permission {
  _id: string;
  key?: string;
  entity: PermissionResource;
  action: PermissionAction;
  description?: string;
  isActive?: boolean;
}

export interface Role {
  _id: string;
  name: string;
  code: UserRole;
  description?: string;
  isActive?: boolean;
  isSystem?: boolean;
  permissions: (Permission | string)[];
}

// Messages
export interface MessageUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface InternalMessage {
  _id: string;
  tenantId: string;
  fromUserId: MessageUser | string;
  toUserId: MessageUser | string;
  body: string;
  subject?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  toUserId: string;
  body: string;
  subject?: string;
}
