-- Migration: create card-images storage bucket

insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

-- Allow anyone to read images (public bucket)
create policy "Public read card images"
  on storage.objects for select
  using (bucket_id = 'card-images');

-- Allow anyone to upload images
create policy "Anyone can upload card images"
  on storage.objects for insert
  with check (bucket_id = 'card-images');

-- Allow anyone to delete images
create policy "Anyone can delete card images"
  on storage.objects for delete
  using (bucket_id = 'card-images');
