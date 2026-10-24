-- Starting content: today's home page, exactly as it is (names, grades, order).
-- Categories follow the project hub (אלגברה / גיאומטריה / תחום מספרי).
-- Plans start empty: prices are a business decision for the admin.

with g as (
  insert into public.grades (name, position) values
    ('כיתה ז׳', 0), ('כיתה ח׳', 1), ('כיתה ט׳', 2)
  returning id, name
),
c as (
  insert into public.categories (name, color, position) values
    ('אלגברה', 'indigo', 0), ('גיאומטריה', 'sky', 1), ('תחום מספרי', 'teal', 2)
  returning id, name
),
t (name, page, grades, icon, color, cat, pos) as (values
  ('משוואות',          'equation-solver.html',    array['כיתה ז׳','כיתה ח׳'],           'equation',     'teal',   'אלגברה',      0),
  ('משוואות מתקדמות',  'equations-advanced.html', array['כיתה ח׳','כיתה ט׳'],           'fraction',     'indigo', 'אלגברה',      1),
  ('אי־שוויונות',      'inequalities.html',       array['כיתה ח׳','כיתה ט׳'],           'inequality',   'pink',   'אלגברה',      2),
  ('משוואות ריבועיות', 'quadratic-solver.html',   array['כיתה ט׳'],                     'square',       'blue',   'אלגברה',      3),
  ('פונקציה לינארית',  'linear-function.html',    array['כיתה ח׳','כיתה ט׳'],           'line',         'teal',   'אלגברה',      4),
  ('פרבולה',           'parabola-practice.html',  array['כיתה ט׳'],                     'parabola',     'indigo', 'אלגברה',      5),
  ('נקודות חיתוך',     'intersection.html',       array['כיתה ט׳'],                     'intersection', 'blue',   'אלגברה',      6),
  ('מספרים מכוונים',   'directed-numbers.html',   array['כיתה ז׳'],                     'numberline',   'teal',   'תחום מספרי',  0),
  ('יחס ואחוזים',      'ratio-percent.html',      array['כיתה ז׳'],                     'percent',      'teal',   'תחום מספרי',  1),
  ('חזקות ושורשים',    'powers-roots.html',       array['כיתה ח׳','כיתה ט׳'],           'root',         'violet', 'תחום מספרי',  2),
  ('זוויות ומקבילים',  'angles-parallel.html',    array['כיתה ז׳'],                     'parallel',     'teal',   'גיאומטריה',   0),
  ('משולשים',          'triangles.html',          array['כיתה ז׳','כיתה ח׳'],           'triangle',     'sky',    'גיאומטריה',   1),
  ('מרובעים',          'quadrilaterals.html',     array['כיתה ח׳'],                     'quad',         'cyan',   'גיאומטריה',   2),
  ('פיתגורס',          'pythagoras.html',         array['כיתה ח׳'],                     'right',        'indigo', 'גיאומטריה',   3),
  ('דמיון משולשים',    'similar-triangles.html',  array['כיתה ט׳'],                     'similar',      'orange', 'גיאומטריה',   4),
  ('מעגל',             'circle.html',             array['כיתה ט׳'],                     'circle',       'sky',    'גיאומטריה',   5),
  ('גופים',            'solids3d.html',           array['כיתה ז׳','כיתה ח׳','כיתה ט׳'], 'cube',         'teal',   'גיאומטריה',   6)
)
insert into public.topics (name, page, grade_ids, icon, color, category_id, position)
select t.name, t.page,
       array(select g.id from g where g.name = any (t.grades)),
       t.icon, t.color,
       (select c.id from c where c.name = t.cat),
       t.pos
from t;
