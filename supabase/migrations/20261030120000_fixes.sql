-- Fixes board (admin → תיקונים): Sulaiman and Abed write what to fix per topic,
-- Claude fixes it and marks it "for review", they approve it or send it back.
-- Replaces sending PDF lists. Admin only (PIN session), nothing public.

create table if not exists public.fix_items (
  id         bigint generated always as identity primary key,
  topic      text not null,                -- topic slug, e.g. 'powers-roots' ('general' = whole site)
  section    text,                         -- sub-chapter, free text
  body       text not null,
  status     text not null default 'new'
             check (status in ('new','working','review','reopened','done','later')),
  author     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fix_comments (
  id         bigint generated always as identity primary key,
  item_id    bigint not null references public.fix_items(id) on delete cascade,
  author     text not null,
  body       text not null default '',
  status     text check (status in ('new','working','review','reopened','done','later')), -- set when the comment changed the status
  created_at timestamptz not null default now()
);
create index if not exists fix_comments_item on public.fix_comments(item_id, created_at);

alter table public.fix_items enable row level security;
alter table public.fix_comments enable row level security;
revoke all on public.fix_items, public.fix_comments from anon, authenticated;

-- all items with their comments, newest activity first
create or replace function public.admin_fixes(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((
    select json_agg(row_to_json(x) order by x.updated_at desc)
    from (
      select i.*, coalesce((select json_agg(c order by c.created_at)
                            from (select id, author, body, status, created_at from fix_comments where item_id = i.id) c), '[]') as comments
      from fix_items i
    ) x
  ), '[]');
end $$;

create or replace function public.admin_fix_add(tok uuid, topic text, section text, body text, author text)
returns json language plpgsql security definer set search_path = public as $$
declare r fix_items;
begin
  perform admin_guard(tok);
  if coalesce(trim(body), '') = '' or coalesce(trim(topic), '') = '' then return json_build_object('error', 'empty'); end if;
  insert into fix_items (topic, section, body, author)
  values (trim(topic), nullif(trim(section), ''), trim(body), left(coalesce(nullif(trim(author), ''), 'צוות'), 40))
  returning * into r;
  return row_to_json(r);
end $$;

-- a comment, a status change, or both (e.g. "still not right" + reopened)
create or replace function public.admin_fix_comment(tok uuid, item_id bigint, author text, body text, new_status text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if new_status is not null and new_status not in ('new','working','review','reopened','done','later') then
    return json_build_object('error', 'status');
  end if;
  if coalesce(trim(body), '') = '' and new_status is null then return json_build_object('error', 'empty'); end if;
  if not exists (select 1 from fix_items where id = item_id) then return json_build_object('error', 'missing'); end if;
  insert into fix_comments (item_id, author, body, status)
  values (item_id, left(coalesce(nullif(trim(author), ''), 'צוות'), 40), coalesce(trim(body), ''), new_status);
  update fix_items set status = coalesce(new_status, status), updated_at = now() where id = item_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_fix_edit(tok uuid, item_id bigint, topic text, section text, body text)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if coalesce(trim(body), '') = '' then return json_build_object('error', 'empty'); end if;
  update fix_items set topic = trim(topic), section = nullif(trim(section), ''), body = trim(body), updated_at = now() where id = item_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_fix_delete(tok uuid, item_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  delete from fix_items where id = item_id;
  return json_build_object('ok', true);
end $$;

revoke execute on function public.admin_fixes(uuid), public.admin_fix_add(uuid, text, text, text, text),
  public.admin_fix_comment(uuid, bigint, text, text, text), public.admin_fix_edit(uuid, bigint, text, text, text),
  public.admin_fix_delete(uuid, bigint) from public;
grant execute on function public.admin_fixes(uuid), public.admin_fix_add(uuid, text, text, text, text),
  public.admin_fix_comment(uuid, bigint, text, text, text), public.admin_fix_edit(uuid, bigint, text, text, text),
  public.admin_fix_delete(uuid, bigint) to anon, authenticated;

-- ── Sulaiman's list from the PDF (2026-10-29 / 30) ───────────────────────────
-- Already fixed items start as "for review" with a note of what changed.
do $$
declare
  rid bigint;
  seed jsonb := $j$[
    ["triangles","מבנה וסדר","זוויות לא פרופורציונאליות. יש לתקן.","review","הזוויות מצוירות עכשיו לפי המידה האמיתית (נמדד: 0° סטייה בכל השרטוטים)."],
    ["triangles","מבנה וסדר","גיוון","later",""],
    ["triangles","מבנה וסדר","אופי פתירת המשוואות היו טוב יותר לפני העדכון","later",""],
    ["triangles","סוגי משולשים","במקום להציג את הכל כחתיכה אחת אפשר לעשות אחד אחד עם שלבים להמשך.","review","ההסבר מחולק ל-3 שלבים עם כפתור ״המשך״."],
    ["triangles","סוגי משולשים","בתרגול יש בנייה של משולש לפי תנאים. להוסיף גריד מאחורי המשולש.","review","נוסף גריד מאחורי שרטוט הבנייה."],
    ["triangles","משולשים מיוחדים","חישוב שטח משולש יש זווית: יש להדגיש את השטח.","review","השטח צבוע ומסומן ב-S."],
    ["triangles","שווה שוקיים / הגדרות ותכונות","כדאי לשים שוק חסר לפני זווית חסרה.","review","הסדר עכשיו: זיהוי, שוק חסר, זווית חסרה."],
    ["triangles","שווה שוקיים / גובה לבסיס","ההגדרות נהרסו לאחר העדכון. יש לתקן את כל תת הפרק.","review","תוקן: השרטוט והסימונים חזרו לשבת נכון."],
    ["triangles","חפיפה","יש להוסיף דוגמה לכל משפט.","review","לחיצה על כל משפט מציגה דוגמה עם שרטוט."],
    ["triangles","חפיפה","יש להוסיף תת פרק של תרגול חפיפת משולשים. אך לא פה אולי, אלא אחרי מרובעים ותכונותיהם כי אז ניתן לבנות המון שאלות.","later",""],
    ["powers-roots","הבנת חזקות","להרחיב את ההסבר ולציין שזה סימן מקוצר לכפל חוזר.","review","ההסבר הורחב: סימן מקוצר לכפל חוזר, דוגמה עם תוויות ״בסיס״ ו״מעריך״, ואזהרה ש-2⁴ זה לא 2·4."],
    ["powers-roots","הבנת חזקות","יש להגדיר: בסיס חזקה ומעריך. אפשר תרגולון קטן של זיהוי כל אחד מהם.","review","נוסף תת-פרק א׳ ״זיהוי בסיס ומעריך״ (מחזקה, ומכפל חוזר לחזקה)."],
    ["powers-roots","הבנת חזקות","בתרגילים לא ברור איך המחשב מבין את החזקה. זה לא ״^״. יש לתת לתלמידים תבנית של בסיס ומעריך ושם הם יכולים להזין.","review","בכל הנושא החזקות מוצגות כמו במחברת (מעריך קטן למעלה), בלי ״^״. התשובות בתבנית בסיס + מעריך."],
    ["powers-roots","חוקי חזקות","יש להוסיף כפתור להוכחה של כל אחד מהחוקים (לתלמידים שזה מעניין אותם). אפשר אפילו: נסה להוכיח.","review","בכל חוק: ״למה זה נכון? נסו להוכיח״ → רמז → ״הצג הוכחה״ + דוגמה."],
    ["powers-roots","פרמטרי","יש רק את x y כפרמטרים. אפשר לגוון.","review","האותיות מתחלפות: x, y, z, a, b, m, n, t."],
    ["powers-roots","פרמטרי","יש להציג את החזקה בלי ״^״","review","מוצג עם מעריך קטן למעלה."],
    ["powers-roots","שורשים","יש לתת דוגמה בשורשים מדויקים. כדאי להציג את האלכסון בטבלת לוח הכפל. יש לציין שעל התלמידים לדעת בעל פה שורשים מדויקים של לפחות עד 100.","review","נוספו דוגמה, לוח הכפל עם האלכסון מודגש, ורשימת √1 עד √100 לזכור בעל פה."],
    ["powers-roots","שורשים","בפישוט שורשים יש לתת דוגמה ולהסביר ששורש של שני מכפילים הוא שורש של הראשון כפול שורש של השני כפי שנובע מחוק 4 בחוקי חזקות - חזקה של מכפלה.","review","נוסף הכלל √(a·b) = √a·√b, ההוכחה שלו מחוק 4, ודוגמה √12 = 2√3."],
    ["powers-roots","הכל יחד","גיוון בתת פרק הכל יחד.","review","נוספו סוגי שאלות: 3 בקל, 4 בבינוני, 6 בקשה, עם אותיות מתחלפות."],
    ["equations-advanced","ליניארית עם מכנה","יש להסביר על פעולת המכנה המשותף: אנחנו מחפשים מספר שאם מכפילים בו את כל המשוואה, כל המכנים מצטמצמים ואז מקבלים משוואה שאין בה שברים.","new",""],
    ["equations-advanced","ליניארית עם מכנה","יש להוסיף משוואה ליניארית עם נעלם במכנה ולדבר כבר שם על תחום ההגדרה (ולא בתת פרק של ריבועית עם מכנה). כלומר גם שם יש תחום הגדרה אבל הם צריכים להבין את זה כבר קודם. אם מקבלים פתרון שאינו נמצא בתחום הוא פסול.","new",""],
    ["equations-advanced","כפל מקוצר","כדאי להציג נוסחה ולהראות פירוק ופיתוח כדוגמה.","new",""],
    ["equations-advanced","כפל מקוצר","לאחר מכן יש שאלות מעורבות בפירוק ופיתוח.","new",""],
    ["equations-advanced","כפל מקוצר","בפירוק יהיו השלבים הבאים: 1. זיהוי הנוסחה 2. זיהוי a b 3. פירוק","new",""],
    ["equations-advanced","כפל מקוצר","השאר בסדר רק יש לעצב את זה לפי רמות קושי.","new",""],
    ["equations-advanced","גורם משותף","בגלל שאנחנו מציגים פה רק משוואה ריבועית, תת פרק זה אפשר להזיז לפתרון משוואה ריבועית. לומר שזה מקרה מיוחד בו c שווה ל-0 וכי יש טריק לאיך לפתור זאת ללא שימוש בנוסחת השורשים.","new",""],
    ["inequalities","","את פתרון האי שוויון יש להשאיר כמו פתרון משוואה (מבלי שתלמיד יזיז ממקום למקום, אלא ממש לכתוב את הפעולה על המשוואה).","new",""],
    ["inequalities","מערכת אי שוויונות","לאחר שפוצרים כל אחת מהאי שוויונות, יש להציג את הפתרונות כדי שהתלמיד ידע לסמן את התחום. אפשר לפתור אחת מימין והשנייה משמאל למסך.","new",""],
    ["quadratic-solver","","הסידור טוב. הפישוט של המשוואה זה מה שצריך להיות בכל המודולים. על התלמיד ללחוץ על איברים מאותו סדר כדי לפשט.","new",""],
    ["quadratic-solver","השלמת המקדמים","יש לדבר על מקרים מיוחדים: a/b/c=0 ועל פתרונם של משוואות אלו. אם אף אחד מהפרמטרים לא מתאפס רק אז עושים את נוסחת השורשים.","new",""],
    ["quadratic-solver","נוסחת השורשים","יש להוסיף דוגמה לפתרון בעזרת נוסחת השורשים, שלב שלב. כשהתלמיד פותר לפי נוסחה זו נותנים לו את התבנית והוא מציב את הפרמטרים במקומות המתאימים. את החישוב המחשב עושה.","new",""],
    ["parabola-practice","השפעת מקדמים","השינוי של הפרמטרים צריך להיות רציף.","new",""],
    ["parabola-practice","השפעת מקדמים","לאחר שינוי כל פרמטר, יש שאלה של כן ולא (כמו שיש עכשיו רק שהתלמיד יכול להזין תשובה).","new",""],
    ["parabola-practice","השפעת מקדמים","לבסוף יש לסכם מה עושה השינוי בכל פרמטר.","new",""],
    ["parabola-practice","מציאת קודקוד","יש להוסיף הסבר ודוגמה לפני התרגול.","new",""],
    ["parabola-practice","שרטוט חופשי","יש לשפר את האלגוריתם.","new",""],
    ["parabola-practice","שורשים","נוסחת השורשים לפי תבנית כמו בפרק של משוואות ריבועיות.","new",""],
    ["parabola-practice","חקירה מלאה","שלב 2: זה לא משנה מי x1 x2. יש באג: אם כותבים תשובה נכונה הוא נותן שלא וצריך להחליף בין המספרים.","new",""],
    ["parabola-practice","חקירה מלאה","תחומי עלייה וירידה: יש להציג את הפרבולה ולסמן עליה את המספרים שעשויים לסייע להם בזיהוי התחום. יש לשנות את אופן כתיבת התחום כי זה לא נראה טוב.","new",""],
    ["intersection","","ברגע שכותבים ומסדרים את המשוואה הריבועית ומגיעים לשלב הזיהוי, המשוואה נעלמת. יש לסדר זאת.","new",""]
  ]$j$;
  e jsonb;
begin
  if exists (select 1 from fix_items) then return; end if;
  for e in select * from jsonb_array_elements(seed) loop
    insert into fix_items (topic, section, body, status, author, created_at, updated_at)
    values (e->>0, nullif(e->>1, ''), e->>2, e->>3, 'סולימאן', '2026-10-29 20:00+02', now())
    returning id into rid;
    if e->>4 <> '' then
      insert into fix_comments (item_id, author, body, status) values (rid, 'Claude', e->>4, 'review');
    end if;
  end loop;
end $$;
