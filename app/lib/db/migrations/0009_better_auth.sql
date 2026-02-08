-- Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" boolean DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "type" varchar DEFAULT 'regular';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();

-- Populate name from email for existing users
UPDATE "User" SET "name" = COALESCE("email", 'User') WHERE "name" IS NULL;

-- Make name NOT NULL after population
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- Migrate guest users (email pattern guest-{number})
UPDATE "User" SET "type" = 'guest' WHERE "email" ~ '^guest-[0-9]+$';

-- Create account table
CREATE TABLE IF NOT EXISTS "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"providerId" varchar(255) NOT NULL,
	"password" varchar(255),
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Migrate passwords from User to account
INSERT INTO "account" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "id"::text, 'credential', "password", now(), now()
FROM "User"
WHERE "password" IS NOT NULL
;

-- Add foreign key for account
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Drop password from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";

-- Add unique constraint on email if not exists
DO $$ BEGIN
 ALTER TABLE "User" ADD CONSTRAINT "User_email_unique" UNIQUE ("email");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create session table
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create verification table
CREATE TABLE IF NOT EXISTS "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
