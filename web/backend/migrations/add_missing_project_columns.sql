-- Migration: Add missing columns to the projects table
-- Run this in the Supabase SQL Editor

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category              TEXT,
  ADD COLUMN IF NOT EXISTS online_platform       TEXT,
  ADD COLUMN IF NOT EXISTS online_link           TEXT,
  ADD COLUMN IF NOT EXISTS project_officers      TEXT[],
  ADD COLUMN IF NOT EXISTS project_committee_members TEXT[];
