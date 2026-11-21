-- Proofs section goes public (Abed, 2026-11-21): "הוכחות" (proofs.html, src/topics/proofs) in the area
-- "גיאומטריה", grade 8, right after "משולשים". Built-in list: src/home/catalog.js.
-- Safe to run twice (nothing is added when the page is already there).

-- make room: the geometry topics after the triangles move one place down
update public.topics set position = position + 1
where category_id = (select id from public.categories where name = 'גיאומטריה')
  and position > (select t.position from public.topics t where t.page = 'triangles.html')
  and not exists (select 1 from public.topics where page = 'proofs.html');

insert into public.topics (name, page, grade_ids, icon, color, category_id, position, status)
select 'הוכחות', 'proofs.html',
       array(select g.id from public.grades g where g.name = 'כיתה ח׳'),
       'proof', 'orange',
       (select c.id from public.categories c where c.name = 'גיאומטריה'),
       (select t.position + 1 from public.topics t where t.page = 'triangles.html'),
       'ready'
where not exists (select 1 from public.topics x where x.page = 'proofs.html');
