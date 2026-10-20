create table public.pop_asset_sharing (
  id uuid not null default gen_random_uuid (),
  asset_id uuid not null,
  household_id uuid not null,
  sharing_enabled boolean null default false,
  sharing_radius integer null,
  allow_borrowing boolean null default false,
  requires_approval boolean null default true,
  deposit_required boolean null default false,
  deposit_amount numeric(12, 2) null,
  max_borrow_days integer null default 7,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  sharing_scope text not null default 'household'::text,
  listed_at timestamp with time zone null,
  delisted_at timestamp with time zone null,
  expired_at timestamp with time zone null,
  constraint pop_asset_sharing_pkey primary key (id),
  constraint pop_asset_sharing_asset_id_key unique (asset_id),
  constraint pop_asset_sharing_household_id_fkey foreign KEY (household_id) references pop_households (id) on delete CASCADE,
  constraint pop_asset_sharing_asset_id_fkey foreign KEY (asset_id) references pop_assets (id) on delete CASCADE,
  constraint pop_asset_sharing_scope_check check (
    (
      sharing_scope = any (
        array[
          'household'::text,
          'network'::text,
          'public'::text
        ]
      )
    )
  ),
  constraint pop_asset_sharing_deposit_check check (
    (
      (
        (deposit_required = false)
        and (deposit_amount is null)
      )
      or (
        (deposit_required = true)
        and (deposit_amount is not null)
        and (deposit_amount >= (0)::numeric)
      )
    )
  ),
  constraint pop_asset_sharing_max_borrow_days_check check (
    (
      (max_borrow_days is null)
      or (max_borrow_days > 0)
    )
  ),
  constraint pop_asset_sharing_radius_check check (
    (
      (sharing_radius is null)
      or (sharing_radius > 0)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_asset_id on public.pop_asset_sharing using btree (asset_id) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_household_id on public.pop_asset_sharing using btree (household_id) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_scope on public.pop_asset_sharing using btree (sharing_scope) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_enabled on public.pop_asset_sharing using btree (sharing_enabled) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_borrowing on public.pop_asset_sharing using btree (allow_borrowing) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_listed_at on public.pop_asset_sharing using btree (listed_at desc) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_delisted_at on public.pop_asset_sharing using btree (delisted_at) TABLESPACE pg_default;

create index IF not exists idx_pop_asset_sharing_expired_at on public.pop_asset_sharing using btree (expired_at) TABLESPACE pg_default;

create trigger pop_asset_sharing_updated_at BEFORE
update on pop_asset_sharing for EACH row
execute FUNCTION pop_set_updated_at ();