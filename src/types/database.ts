// ============================================================
// TIPOS DE BASE DE DATOS - Generados desde el schema de Supabase
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Currency = 'ARS' | 'USD' | 'USDT' | 'BTC' | 'ETH'
export type ExchangeRateType = 'mep' | 'ccl' | 'blue' | 'oficial'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type AccountType = 'bank' | 'broker' | 'crypto' | 'cash' | 'savings'
export type AssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'on' | 'fci' | 'cedear' | 'fixed_term' | 'cash_usd'
export type ProjectType = 'savings' | 'expense'
export type ProjectStatus = 'active' | 'completed' | 'paused'
export type SharedExpenseStatus = 'pending' | 'partial' | 'settled'
export type TradeType = 'buy' | 'sell' | 'dividend' | 'interest' | 'staking'
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'
export type AlertType = 'expense_over_income' | 'credit_card_due' | 'fixed_term_maturity' | 'pending_debt_overdue'
export type PatrimonioAssetType = 'property' | 'vehicle' | 'business' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ExchangeRate {
  id: string
  rate_type: ExchangeRateType
  from_currency: string
  to_currency: string
  rate: number
  date: string
  source: string
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  platform: string | null
  currency: Currency
  initial_balance: number
  color: string
  icon: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  bank: string | null
  last_four: string | null
  limit_amount: number | null
  currency: Currency
  closing_day: number
  due_day: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  subcategories?: Subcategory[]
}

export interface Subcategory {
  id: string
  user_id: string
  category_id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  type: ProjectType
  description: string | null
  // savings
  target_amount: number | null
  target_currency: Currency | null
  target_date: string | null
  linked_account_id: string | null
  // expense
  budget_amount: number | null
  budget_currency: Currency | null
  color: string
  icon: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount_original: number
  currency_original: Currency
  amount_ars: number
  amount_usd: number
  exchange_rate: number | null
  exchange_rate_type: ExchangeRateType | null
  category_id: string | null
  subcategory_id: string | null
  account_id: string | null
  credit_card_id: string | null
  transfer_to_account_id: string | null
  description: string | null
  date: string
  receipt_url: string | null
  is_recurring: boolean
  recurrence_frequency: RecurrenceFrequency | null
  recurrence_end_date: string | null
  parent_transaction_id: string | null
  has_installments: boolean
  total_installments: number | null
  current_installment: number | null
  project_id: string | null
  created_at: string
  updated_at: string
  // joins
  category?: Category
  subcategory?: Subcategory
  account?: Account
  credit_card?: CreditCard
}

export interface InstallmentPlan {
  id: string
  user_id: string
  transaction_id: string
  credit_card_id: string
  installment_number: number
  total_installments: number
  amount_ars: number
  amount_usd: number
  due_date: string
  is_paid: boolean
  created_at: string
}

export interface InvestmentPosition {
  id: string
  user_id: string
  account_id: string
  ticker: string | null
  name: string
  asset_type: AssetType
  quantity: number
  avg_purchase_price: number
  purchase_currency: Currency
  current_price: number | null
  current_price_usd: number | null
  price_source: 'yahoo' | 'coingecko' | 'manual' | null
  last_price_update: string | null
  manual_return_pct: number | null
  fixed_term_start: string | null
  fixed_term_end: string | null
  fixed_term_tna: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // computed
  account?: Account
}

export interface InvestmentTrade {
  id: string
  user_id: string
  position_id: string
  type: TradeType
  quantity: number | null
  price: number
  currency: Currency
  amount_ars: number | null
  amount_usd: number | null
  commission: number
  date: string
  notes: string | null
  created_at: string
}

export interface Person {
  id: string
  user_id: string
  name: string
  relationship: 'partner' | 'friend' | 'family' | 'other' | null
  contact: string | null
  created_at: string
}

export interface SharedExpense {
  id: string
  user_id: string
  transaction_id: string | null
  person_id: string
  description: string
  amount_ars: number
  amount_usd: number
  due_date: string | null
  status: SharedExpenseStatus
  created_at: string
  updated_at: string
  // joins
  person?: Person
  transaction?: Transaction
  payments?: SharedExpensePayment[]
}

export interface SharedExpensePayment {
  id: string
  shared_expense_id: string
  amount_ars: number
  amount_usd: number | null
  date: string
  notes: string | null
  created_at: string
}

export interface AlertSetting {
  id: string
  user_id: string
  type: AlertType
  is_enabled: boolean
  days_before: number
  created_at: string
}

// ────────────────────────────────────────────────
// Tipos de utilidad para el frontend
// ────────────────────────────────────────────────

export interface DashboardSummary {
  total_income_ars: number
  total_income_usd: number
  total_expense_ars: number
  total_expense_usd: number
  net_ars: number
  net_usd: number
  net_worth_ars: number
  net_worth_usd: number
  pending_installments_ars: number
  pending_debts_ars: number
}

export interface PatrimonioAsset {
  id: string
  user_id: string
  name: string
  type: PatrimonioAssetType
  description: string | null
  value: number
  currency: 'ARS' | 'USD'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MonthlyData {
  month: string
  income_ars: number
  expense_ars: number
  income_usd: number
  expense_usd: number
}
