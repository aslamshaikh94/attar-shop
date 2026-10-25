export interface Partner {
  id: number
  name: string
  role: string
  share_percent: number
  created_at: string
}

export interface Product {
  id: number
  name: string
  type: string
  category: string | null
  buying_price: number
  selling_price: number
  stock_qty: number
  unit: string
  created_at: string
}

export interface Purchase {
  id: number
  product_id: number
  qty: number
  unit_price: number
  total_price: number
  supplier: string | null
  date: string
  created_at: string
  product_name?: string
}

export interface Sale {
  id: number
  product_id: number
  qty: number
  unit_price: number
  total_price: number
  customer: string | null
  date: string
  created_at: string
  product_name?: string
}

export interface Expense {
  id: number
  title: string
  amount: number
  category: string | null
  date: string
  note: string | null
  created_at: string
}

export interface Drawing {
  id: number
  partner_id: number
  amount: number
  date: string
  note: string | null
  created_at: string
  partner_name?: string
}

export interface ReportSummary {
  period: { from: string; to: string }
  totalSales: number
  totalPurchases: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  partners: Array<{
    id: number
    name: string
    role: string
    share_percent: number
    share_amount: number
    drawings: number
    due: number
  }>
}

export interface ProductMovement {
  id: number
  name: string
  type: string
  stock_qty: number
  unit: string
  bought: number
  sold: number
  revenue: number
  cost: number
}
