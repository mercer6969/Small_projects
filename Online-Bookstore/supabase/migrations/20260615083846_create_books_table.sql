CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  genre text,
  description text,
  cover_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_select" ON books FOR SELECT TO public USING (true);
CREATE POLICY "books_insert" ON books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "books_update" ON books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "books_delete" ON books FOR DELETE TO authenticated USING (true);
