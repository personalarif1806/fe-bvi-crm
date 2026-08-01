import {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  Package,
  ClipboardList,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  PackageCheck,
  UserCheck,
  Tags,
  Boxes,
  LayoutGrid,
  Gauge,
  UserPlus2,
  Building2,
  Contact2,
  Handshake,
  CalendarClock,
  SlidersHorizontal,
  UsersRound,
  Radar,
  CalendarDays,
} from 'lucide-react'

// Visibilitas menu berbasis peran internal. Aplikasi ini khusus CRM.
const CRM = ['Administrator', 'Sales']

export const navItems = [
  { label: 'Dashboard', icon: Gauge, to: '/crm', exact: true, section: 'CRM', roles: CRM, badge: null },
  { label: 'Leads', icon: UserPlus2, to: '/crm/leads', section: 'Komersial', roles: CRM, badge: null },
  { label: 'Accounts', icon: Building2, to: '/crm/accounts', section: 'Komersial', roles: CRM, badge: null },
  { label: 'Kontak', icon: Contact2, to: '/crm/contacts', section: 'Komersial', roles: CRM, badge: null },
  { label: 'Deals', icon: Handshake, to: '/crm/deals', section: 'Komersial', roles: CRM, badge: null },
  { label: 'Price Books', icon: Tags, to: '/crm/price-books', section: 'Komersial', roles: CRM, badge: null },
  // Sites & Import Titik disurfacing sebagai modal di dalam Titik Sampling.
  { label: 'Titik Sampling', icon: Radar, to: '/crm/sampling-points', section: 'Kepatuhan', roles: CRM, badge: null },
  { label: 'Kalender Kepatuhan', icon: CalendarDays, to: '/crm/compliance', section: 'Kepatuhan', roles: CRM, badge: null },
  { label: 'Aktivitas', icon: CalendarClock, to: '/crm/activities', section: 'Lainnya', roles: CRM, badge: null },
  { label: 'Pengaturan Skor', icon: SlidersHorizontal, to: '/crm/settings/scoring', section: 'Lainnya', roles: CRM, badge: null },
]

export const stats = [
  {
    id: 'users',
    label: 'Total Users',
    value: '24,582',
    growth: 12.4,
    trend: 'up',
    icon: Users,
    accent: 'text-brand-600',
    bg: 'bg-brand-50',
    spark: [12, 18, 14, 22, 19, 27, 24, 31, 29, 36],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    value: '$128,430',
    growth: 8.9,
    trend: 'up',
    icon: DollarSign,
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    spark: [20, 22, 19, 25, 28, 24, 30, 33, 31, 38],
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '3,841',
    growth: -2.3,
    trend: 'down',
    icon: ShoppingCart,
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    spark: [30, 28, 32, 27, 25, 29, 24, 26, 23, 22],
  },
  {
    id: 'conversion',
    label: 'Conversion Rate',
    value: '4.78%',
    growth: 1.7,
    trend: 'up',
    icon: TrendingUp,
    accent: 'text-violet-600',
    bg: 'bg-violet-50',
    spark: [10, 12, 11, 14, 13, 16, 15, 18, 17, 20],
  },
]

// Monthly revenue bars (relative heights in %)
export const revenueChart = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 55 },
  { month: 'Mar', value: 48 },
  { month: 'Apr', value: 70 },
  { month: 'May', value: 62 },
  { month: 'Jun', value: 85 },
  { month: 'Jul', value: 78 },
  { month: 'Aug', value: 92 },
  { month: 'Sep', value: 74 },
  { month: 'Oct', value: 88 },
  { month: 'Nov', value: 96 },
  { month: 'Dec', value: 100 },
]

// User growth area-style line points (0-100)
export const userGrowth = [18, 26, 22, 34, 30, 45, 41, 52, 60, 56, 72, 80]

export const activities = [
  {
    id: 1,
    type: 'user',
    title: 'New user registered',
    desc: 'Siti Nurhaliza created an account',
    time: '2 min ago',
    icon: UserPlus,
    color: 'bg-brand-50 text-brand-600',
  },
  {
    id: 2,
    type: 'order',
    title: 'New order placed',
    desc: 'Order #ORD-7741 · 3 items',
    time: '24 min ago',
    icon: ShoppingCart,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    id: 3,
    type: 'payment',
    title: 'Payment received',
    desc: '$1,290.00 from Budi Santoso',
    time: '1 hour ago',
    icon: CreditCard,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 4,
    type: 'product',
    title: 'Product updated',
    desc: 'Aurora Headphones — stock & price',
    time: '3 hours ago',
    icon: PackageCheck,
    color: 'bg-violet-50 text-violet-600',
  },
]

export const orders = [
  {
    id: '#ORD-7741',
    customer: 'Budi Santoso',
    email: 'budi@mail.com',
    product: 'Aurora Headphones',
    status: 'Success',
    amount: '$1,290.00',
  },
  {
    id: '#ORD-7740',
    customer: 'Siti Nurhaliza',
    email: 'siti@mail.com',
    product: 'Nimbus Pro Keyboard',
    status: 'Pending',
    amount: '$189.00',
  },
  {
    id: '#ORD-7739',
    customer: 'Andi Wijaya',
    email: 'andi@mail.com',
    product: 'Vertex 4K Monitor',
    status: 'Success',
    amount: '$612.50',
  },
  {
    id: '#ORD-7738',
    customer: 'Dewi Lestari',
    email: 'dewi@mail.com',
    product: 'Pulse Smartwatch',
    status: 'Cancelled',
    amount: '$249.00',
  },
  {
    id: '#ORD-7737',
    customer: 'Rizky Pratama',
    email: 'rizky@mail.com',
    product: 'Lumen Desk Lamp',
    status: 'Success',
    amount: '$74.00',
  },
]

export const notifications = [
  { id: 1, title: 'New comment on your report', time: '5m ago', unread: true },
  { id: 2, title: 'Server backup completed', time: '1h ago', unread: true },
  { id: 3, title: 'Weekly analytics ready', time: '4h ago', unread: false },
]
