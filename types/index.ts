export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration: number // minutes
  image?: string
  category: string
  isActive: boolean
  popular?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Barber {
  id: string
  name: string
  email: string | null
  phone: string | null
  bio: string | null
  avatar: string | null
  rating: number
  reviewCount: number
  title: string | null
  isActive: boolean
  services: Service[]
  workingHours: WorkingHour[]
  specialties?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkingHour {
  id: string
  barberId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorking: boolean
}

export interface Appointment {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  serviceId: string
  barberId: string
  date: Date
  endDate: Date
  status: AppointmentStatus
  notes: string | null
  price: number
  createdAt: Date
  updatedAt: Date
  service?: Service
  barber?: Barber
}

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

export interface TimeSlot {
  time: string
  available: boolean
  barberId: string
}

export interface BookingStepData {
  service?: Service
  barber?: Barber
  date?: Date
  timeSlot?: TimeSlot
  customerDetails?: CustomerDetails
}

export interface CustomerDetails {
  name: string
  phone: string
  email?: string
  notes?: string
}

export interface AdminStats {
  totalAppointments: number
  pendingAppointments: number
  confirmedAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  thisMonthAppointments: number
  lastMonthAppointments: number
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  totalCustomers: number
  totalServices: number
  totalBarbers: number
  revenueChart: { month: string; revenue: number }[]
  appointmentGrowth: number
  revenueGrowth: number
}

export interface RevenueData {
  date: string
  revenue: number
  appointments: number
}

export interface PopularService {
  serviceId: string
  serviceName: string
  count: number
  revenue: number
}

export interface BarberPerformance {
  barberId: string
  barberName: string
  appointments: number
  revenue: number
  rating: number
}