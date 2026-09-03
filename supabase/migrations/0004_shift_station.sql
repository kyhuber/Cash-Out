-- Which bar or lounge inside a venue a shift was worked at.
--
-- Kai works the Verizon Lounge and the Moët Lounge inside Climate Pledge Arena,
-- and a rotating set of bars at Lumen Field. The hourly wage is identical
-- across them, so these are NOT separate workplaces — a workplace is the thing
-- that carries a wage and a pay period. What differs is tips, and comparing
-- tips between stations is the whole reason to record it.
--
-- It gets its own column rather than a key in optional_field_values because
-- that comparison means grouping by it, same reasoning as tip_out.
--
-- Safe to run more than once.

alter table shifts add column if not exists station text;

-- Free text, but constrained enough that a stray empty string can't become a
-- distinct "station" that splits a total in two.
alter table shifts drop constraint if exists station_not_blank;
alter table shifts add constraint station_not_blank
  check (station is null or length(trim(station)) > 0);

-- Grouping tips by station is the query this exists for.
create index if not exists shifts_workplace_station_idx on shifts (workplace_id, station)
  where station is not null;

-- Only workplaces that opt in are asked for it, so 'station' joins the list of
-- known optional field keys.
alter table workplaces drop constraint if exists optional_fields_known;
alter table workplaces add constraint optional_fields_known
  check (optional_fields <@ array['total_sales', 'tip_out', 'shift_type', 'guest_count', 'notes', 'station']::text[]);
