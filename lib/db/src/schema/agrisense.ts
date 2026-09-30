import { createInsertSchema } from "drizzle-zod";
import {
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable("agrisense_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const farmsTable = pgTable("agrisense_farms", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  areaHectares: numeric("area_hectares", { precision: 10, scale: 2 }).notNull(),
  primaryCrop: text("primary_crop").notNull(),
  soilType: text("soil_type").notNull(),
  irrigation: text("irrigation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const advisoriesTable = pgTable("agrisense_advisories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  farmId: uuid("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  cropStage: text("crop_stage").notNull(),
  soilMoisture: numeric("soil_moisture", { precision: 5, scale: 2 }).notNull(),
  recentRainfallMm: numeric("recent_rainfall_mm", { precision: 8, scale: 2 }).notNull(),
  temperatureC: numeric("temperature_c", { precision: 5, scale: 2 }).notNull(),
  pestPressure: text("pest_pressure").notNull(),
  budget: text("budget").notNull(),
  riskTolerance: text("risk_tolerance").notNull(),
  notes: text("notes"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default("ready"),
  summary: text("summary").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  weatherNote: text("weather_note").notNull(),
  riskNote: text("risk_note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export const insertFarmSchema = createInsertSchema(farmsTable).omit({
  id: true,
  createdAt: true,
});
export const insertAdvisorySchema = createInsertSchema(advisoriesTable).omit({
  id: true,
  createdAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type Farm = typeof farmsTable.$inferSelect;
export type Advisory = typeof advisoriesTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type InsertAdvisory = z.infer<typeof insertAdvisorySchema>;