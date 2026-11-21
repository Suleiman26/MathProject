-- Fixes board #84 (Sulaiman, 2026-11-21): two new topics on the home page, made from chapters of the
-- "חדש" module (src/topics/statistics, src/topics/systems; built-in list: src/home/catalog.js).
--   • "סטטיסטיקה והסתברות" (statistics.html): area "תחום מספרי", after "חזקות ושורשים", grades 7–9
--   • "מערכת משוואות"      (systems.html):    area "אלגברה", right after the linear equations, grade 8
-- Safe to run twice (nothing is added when the page is already there).

-- make room: the algebra topics after the linear equations move one place down
update public.topics set position = position + 1
where category_id = (select id from public.categories where name = 'אלגברה')
  and position >= 1
  and not exists (select 1 from public.topics where page = 'systems.html');

insert into public.topics (name, page, grade_ids, icon, color, category_id, position, status)
select t.name, t.page,
       array(select g.id from public.grades g where g.name = any (t.grades) order by g.position),
       t.icon, t.color,
       (select c.id from public.categories c where c.name = t.cat),
       t.pos, 'ready'
from (values
  ('מערכת משוואות',      'systems.html',    array['כיתה ח׳'],                     'system', 'indigo', 'אלגברה',     1),
  ('סטטיסטיקה והסתברות', 'statistics.html', array['כיתה ז׳','כיתה ח׳','כיתה ט׳'], 'chart',  'orange', 'תחום מספרי',
     coalesce((select max(position) + 1 from public.topics where category_id = (select id from public.categories where name = 'תחום מספרי')), 0))
) as t (name, page, grades, icon, color, cat, pos)
where not exists (select 1 from public.topics x where x.page = t.page);
