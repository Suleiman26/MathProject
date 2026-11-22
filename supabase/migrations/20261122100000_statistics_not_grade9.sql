-- Fixes board #99 (Sulaiman, 2026-11-22): "סטטיסטיקה והסתברות" showed in grade 7 and in grade 9;
-- remove it from grade 9 (it stays in grades 7 and 8). Built-in list: src/home/catalog.js.
update public.topics
set grade_ids = array(select g.id from public.grades g where g.name in ('כיתה ז׳','כיתה ח׳') order by g.position)
where page = 'statistics.html';
