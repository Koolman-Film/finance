-- Private bucket for entry attachments (job sheets, payment proofs, expense
-- receipts). Access is gated by our app's server actions (branch scope +
-- month lock), so we use signed URLs and skip Storage RLS for now.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-files',
  'entry-files',
  false,
  10485760,                -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
