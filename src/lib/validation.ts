import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const propertySchema = z.object({
  name: z.string().trim().min(1, "Укажите название объекта"),
  address: z.string().trim().optional(),
});

export const buildingSchema = z.object({
  name: z.string().trim().min(1, "Укажите название помещения"),
});

export const roomSchema = z.object({
  name: z.string().trim().min(1, "Укажите название комнаты"),
});

export const bedSchema = z.object({
  label: z.string().trim().min(1, "Укажите название места"),
  priceDaily: z.coerce.number().min(0, "Не может быть меньше 0"),
  priceWeekly: z.coerce.number().min(0, "Не может быть меньше 0"),
  priceMonthly: z.coerce.number().min(0, "Не может быть меньше 0"),
});

export const residentSchema = z.object({
  fullName: z.string().trim().min(1, "Укажите имя жильца"),
  phone: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const staySchema = z
  .object({
    bedId: z.string().min(1, "Не выбрано место"),
    residentName: z.string().trim().min(1, "Укажите имя жильца"),
    dateFrom: z.string().min(1, "Укажите дату заезда"),
    dateTo: z.string().min(1, "Укажите дату выезда"),
    rateType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    received: z.coerce.number().min(0, "Сумма не может быть меньше 0"),
  })
  .refine((v) => v.dateTo > v.dateFrom, {
    message: "Дата выезда должна быть позже даты заезда",
    path: ["dateTo"],
  });

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Сумма должна быть больше 0"),
});

export const extendSchema = z.object({
  newDateTo: z.string().min(1, "Укажите новую дату выезда"),
  rateType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  received: z.coerce.number().min(0, "Сумма не может быть меньше 0"),
});

export const checkoutSchema = z.object({
  actualDateTo: z.string().min(1, "Укажите дату выезда"),
  refundRateType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название категории"),
  fixedAmount: z.coerce.number().min(0).optional(),
});

export const expenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive("Сумма должна быть больше 0"),
  spentOn: z.string().min(1, "Укажите дату"),
  note: z.string().trim().optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type BuildingInput = z.infer<typeof buildingSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type BedInput = z.infer<typeof bedSchema>;
export type ResidentInput = z.infer<typeof residentSchema>;
export type StayInput = z.infer<typeof staySchema>;
