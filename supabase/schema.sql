-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  status text NOT NULL DEFAULT 'confirmed'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text])),
  service_id uuid NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);


CREATE TABLE public.blocked_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocked_slots_pkey PRIMARY KEY (id)


);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric NOT NULL CHECK (price >= 0::numeric),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  image text,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);