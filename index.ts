export type UserRole = 'contador' | 'pyme' | 'empresa' | 'cliente' | 'admin';

export type ClientStatus = 'al_dia' | 'pendiente';

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export type TaskCategory = 'f29' | 'iva' | 'remuneraciones' | 'otro';

export type TaxCategory = 'f29' | 'iva' | 'remuneraciones' | 'renta' | 'entrega_documentos' | 'otro';

export type EventPriority = 'alta' | 'media' | 'baja';

export type BoletaType = 'venta' | 'honorario' | 'factura';

export type ReceptionStatus = 'ppd' | 'aceptada' | 'rechazada' | 'pendiente';

export type DocumentType = 'factura' | 'cartola_bancaria' | 'boleta' | 'remuneraciones' | 'documentos_tributarios' | 'contratos' | 'otro';

export type DocumentStatus = 'pendiente' | 'revisado' | 'rechazado' | 'falta_documento';

export type FeeStatus = 'pagado' | 'pendiente' | 'vencido';

export interface ClientFee {
  id: string;
  accountant_id: string;
  client_id: string;
  description: string;
  amount_clp: number;
  base_amount: number | null;
  iva_amount: number | null;
  includes_iva: boolean;
  reminder_sent: boolean;
  status: FeeStatus;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
}

export type SubscriptionStatus = 'active' | 'expired' | 'pending';

export type AccessCodeStatus = 'active' | 'used' | 'expired';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  month: string;
  status: AccessCodeStatus;
  activated_by: string | null;
  activated_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  accountant_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  amount_clp: number;
  created_at: string;
}

export interface Client {
  id: string;
  accountant_id: string;
  pyme_user_id: string | null;
  business_name: string;
  rut: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  invite_token: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  accountant_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  category: TaskCategory;
  created_at: string;
}

export interface TaxEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  category: TaxCategory;
  priority: EventPriority;
  notes: string | null;
  accountant_id: string | null;
  client_id: string | null;
  notify_pyme: boolean;
  created_at: string;
}

export interface IvaCalculation {
  id: string;
  accountant_id: string;
  client_id: string | null;
  period_month: string;
  sales_net: number;
  purchases_net: number;
  debit_fiscal: number;
  credit_fiscal: number;
  iva_to_pay: number;
  notes: string | null;
  created_at: string;
}

export interface BoletaRecord {
  id: string;
  accountant_id: string;
  client_id: string;
  period_month: string;
  boleta_type: BoletaType;
  total_amount: number;
  count_docs: number;
  reception_status: ReceptionStatus;
  notes: string | null;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  client_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType;
  status: DocumentStatus;
  created_at: string;
}

export interface ClientWithDetails extends Client {
  task_count?: number;
  pending_task_count?: number;
  document_count?: number;
}

export type DocumentRequestStatus = 'pendiente' | 'completada' | 'cancelada';

export interface DocumentRequest {
  id: string;
  accountant_id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: DocumentRequestStatus;
  created_at: string;
}

export type NotificationType = 'info' | 'warning' | 'success' | 'danger';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  sender_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  accountant_id: string;
  client_id: string;
  employee_name: string;
  rut: string | null;
  period_month: string;
  base_salary: number;
  non_imponible: number;
  afp_rate: number;
  afp_amount: number;
  health_rate: number;
  health_amount: number;
  unemployment_rate: number;
  unemployment_amount: number;
  taxable_base: number;
  total_deductions: number;
  net_salary: number;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  client_id: string;
  period_month: string;
  sales: number;
  expenses: number;
  taxes_paid: number;
  payroll_total: number;
  net_result: number;
  notes: string | null;
  created_at: string;
}

export interface AccountantPublicProfile {
  accountant_id: string;
  city: string | null;
  specialties: string[];
  services: string[];
  bio: string | null;
  rating: number;
  review_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
