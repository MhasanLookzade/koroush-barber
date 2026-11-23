"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPrice } from "@/lib/utils"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Trash,
  PlusCircle,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Service {
  id: string
  name: string
  isActive: boolean
}

interface WorkingHour {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorking: boolean
}

interface Barber {
  id: string
  name: string
  email: string | null
  phone: string | null
  bio: string | null
  avatar: string | null
  isActive: boolean
  services: Service[]
  workingHours: WorkingHour[]
  createdAt: string
  updatedAt: string
}

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isWorking: z.boolean().default(true),
})

const barberSchema = z.object({
  name: z.string().min(1, "نام آرایشگر الزامی است"),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
  workingHours: z.array(workingHoursSchema).default([]),
})

type BarberFormData = z.infer<typeof barberSchema>

const daysOfWeek = [
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنج‌شنبه" },
  { value: 5, label: "جمعه" },
  { value: 6, label: "شنبه" },
]

export function AdminBarbersClient() {
  const { toast } = useToast()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<BarberFormData>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bio: "",
      avatar: "",
      isActive: true,
      serviceIds: [],
      workingHours: daysOfWeek.map(d => ({
        dayOfWeek: d.value,
        startTime: "09:00",
        endTime: "21:00",
        isWorking: d.value !== 5,
      })),
    },
  })

  const { fields: workingHoursFields, append, remove } = useFieldArray({
    control,
    name: "workingHours",
  })

  const watchedWorkingHours = watch("workingHours")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [barbersRes, servicesRes] = await Promise.all([
        fetch("/api/barbers"),
        fetch("/api/services"),
      ])
      if (barbersRes.ok) {
        const data = await barbersRes.json()
        setBarbers(data)
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data.filter((s: Service) => s.isActive))
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber)
      reset({
        name: barber.name,
        email: barber.email || "",
        phone: barber.phone || "",
        bio: barber.bio || "",
        avatar: barber.avatar || "",
        isActive: barber.isActive,
        serviceIds: barber.services.map(s => s.id),
        workingHours: barber.workingHours.length > 0
          ? barber.workingHours
          : daysOfWeek.map(d => ({
              dayOfWeek: d.value,
              startTime: "09:00",
              endTime: "21:00",
              isWorking: d.value !== 5,
            })),
      })
    } else {
      setEditingBarber(null)
      reset({
        name: "",
        email: "",
        phone: "",
        bio: "",
        avatar: "",
        isActive: true,
        serviceIds: [],
        workingHours: daysOfWeek.map(d => ({
          dayOfWeek: d.value,
          startTime: "09:00",
          endTime: "21:00",
          isWorking: d.value !== 5,
        })),
      })
    }
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: BarberFormData) => {
    try {
      const url = editingBarber ? `/api/barbers/${editingBarber.id}` : "/api/barbers"
      const method = editingBarber ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "خطا در ذخیره")
      }

      toast({
        title: editingBarber ? "آرایشگر به‌روزرسانی شد" : "آرایشگر ایجاد شد",
        description: editingBarber
          ? `آرایشگر "${data.name}" با موفقیت به‌روزرسانی شد.`
          : `آرایشگر "${data.name}" با موفقیت اضافه شد.`,
      })

      fetchData()
      setIsDialogOpen(false)
      setEditingBarber(null)
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "خطای ناشناخته",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این آرایشگر اطمینان دارید؟")) return

    try {
      const res = await fetch(`/api/barbers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("خطا در حذف")

      toast({
        title: "حذف شد",
        description: "آرایشگر با موفقیت حذف شد.",
      })
      fetchData()
    } catch (err) {
      toast({
        title: "خطا",
        description: "خطا در حذف آرایشگر",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (barber: Barber) => {
    try {
      const res = await fetch(`/api/barbers/${barber.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !barber.isActive }),
      })
      if (!res.ok) throw new Error("خطا در تغییر وضعیت")
      fetchData()
    } catch (err) {
      toast({
        title: "خطا",
        description: "خطا در تغییر وضعیت",
        variant: "destructive",
      })
    }
  }

  const filteredBarbers = barbers.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.phone?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت آرایشگرها</h1>
          <p className="text-muted-foreground">افزودن، ویرایش و مدیریت آرایشگرهای آرایشگاه</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              آرایشگر جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBarber ? "ویرایش آرایشگر" : "آرایشگر جدید"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">اطلاعات اصلی</TabsTrigger>
                  <TabsTrigger value="schedule">ساعات کاری</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">نام آرایشگر *</Label>
                    <Input id="name" {...register("name")} placeholder="مثال: علی محمدی" />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">ایمیل</Label>
                      <Input id="email" type="email" {...register("email")} placeholder="ali@example.com" />
                      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">شماره تماس</Label>
                      <Input id="phone" type="tel" {...register("phone")} placeholder="09xxxxxxxxx" dir="ltr" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar">لینک آواتار</Label>
                    <Input id="avatar" type="url" {...register("avatar")} placeholder="https://example.com/avatar.jpg" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">بیوگرافی</Label>
                    <textarea
                      id="bio"
                      {...register("bio")}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="توضیحات کوتاه درباره آرایشگر..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>خدمات</Label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-background">
                      {services.map(service => (
                        <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={watch("serviceIds")?.includes(service.id)}
                            onCheckedChange={checked => {
                              const current = watch("serviceIds") || []
                              if (checked) {
                                setValue("serviceIds", [...current, service.id], { shouldValidate: true })
                              } else {
                                setValue("serviceIds", current.filter((id: string) => id !== service.id), { shouldValidate: true })
                              }
                            }}
                          />
                          <span className="text-sm">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">فعال</Label>
                    <Switch id="isActive" checked={errors.isActive ? false : true} />
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>ساعات کاری هفتگی</Label>
                    <p className="text-sm text-muted-foreground">برای هر روز هفته، ساعات کاری را تعیین کنید</p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {workingHoursFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-24 font-medium text-sm">{daysOfWeek[index].label}</div>
                        <div className="flex-1 flex items-center gap-2">
                          <Switch
                            checked={watchedWorkingHours[index]?.isWorking}
                            onCheckedChange={checked => setValue(`workingHours.${index}.isWorking`, checked)}
                            aria-label={`${daysOfWeek[index].label} working`}
                          />
                          <Input
                            type="time"
                            {...register(`workingHours.${index}.startTime`)}
                            disabled={!watchedWorkingHours[index]?.isWorking}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">تا</span>
                          <Input
                            type="time"
                            {...register(`workingHours.${index}.endTime`)}
                            disabled={!watchedWorkingHours[index]?.isWorking}
                            className="w-32"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {editingBarber ? "به‌روزرسانی" : "ایجاد"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            لیست آرایشگرها
          </CardTitle>
          <CardDescription>{filteredBarbers.length} از {barbers.length} آرایشگر</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="جستجو در آرایشگرها..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">هیچ آرایشگری یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">آواتار</TableHead>
                    <TableHead>نام</TableHead>
                    <TableHead>تماس</TableHead>
                    <TableHead>خدمات</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="w-40">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBarbers.map(barber => (
                    <TableRow key={barber.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={barber.avatar || ""} alt={barber.name} />
                          <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{barber.name}</p>
                        {barber.bio && <p className="text-sm text-muted-foreground line-clamp-1">{barber.bio}</p>}
                      </TableCell>
                      <TableCell>
                        {barber.email && <p className="text-sm">{barber.email}</p>}
                        {barber.phone && <p className="text-sm text-muted-foreground dir-ltr">{barber.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {barber.services.map(s => (
                            <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                          ))}
                          {barber.services.length === 0 && (
                            <Badge variant="outline" className="text-xs">بدون خدمت</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={barber.isActive ? "success" : "secondary"}>
                          {barber.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              فعال
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              غیرفعال
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(barber)}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              ویرایش
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(barber)}
                              className="flex items-center gap-2"
                            >
                              {barber.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4" />
                                  غیرفعال کردن
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  فعال کردن
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(barber.id)}
                              className="flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}