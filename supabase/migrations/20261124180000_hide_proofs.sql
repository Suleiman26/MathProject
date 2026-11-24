-- Proofs section hidden again (Abed, 2026-11-24: "not clear, messy"; rebuild with a clear plan first).
-- The topic row stays (position, grade, icon) so showing it later is one switch: admin → נושאים, or visible = true.
-- The page itself stays at /topics/proofs (not listed, noindex) for Abed and Sulaiman. Safe to run twice.
update public.topics set visible = false where page = 'proofs.html' and visible;
