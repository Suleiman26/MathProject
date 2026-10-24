-- Home page groups in curriculum order: numbers, algebra, functions, geometry.
-- Adds a "functions" group and moves the three function topics into it.
-- Safe to run on a database that already has it (no duplicates).

insert into public.categories (name, color, position)
select 'פונקציות', 'blue', 2
where not exists (select 1 from public.categories where name = 'פונקציות');

update public.categories set position = case name
  when 'תחום מספרי' then 0
  when 'אלגברה'     then 1
  when 'פונקציות'   then 2
  when 'גיאומטריה'  then 3
  else position end
where name in ('תחום מספרי', 'אלגברה', 'פונקציות', 'גיאומטריה');

update public.topics
set category_id = (select id from public.categories where name = 'פונקציות'),
    position = case page
      when 'linear-function.html'   then 0
      when 'parabola-practice.html' then 1
      when 'intersection.html'      then 2 end
where page in ('linear-function.html', 'parabola-practice.html', 'intersection.html');

update public.topics
set position = case page
  when 'equation-solver.html'    then 0
  when 'equations-advanced.html' then 1
  when 'inequalities.html'       then 2
  when 'quadratic-solver.html'   then 3 end
where page in ('equation-solver.html', 'equations-advanced.html', 'inequalities.html', 'quadratic-solver.html');
