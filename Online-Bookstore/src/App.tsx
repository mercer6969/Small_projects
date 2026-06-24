import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Pencil, Trash2, X, Search, BookOpen } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  genre: string | null;
  description: string | null;
  cover_url: string | null;
}

type BookFormData = Omit<Book, 'id'>;

const emptyForm: BookFormData = {
  title: '',
  author: '',
  price: 0,
  genre: '',
  description: '',
  cover_url: '',
};

const GENRES = [
  'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy',
  'Mystery', 'Thriller', 'Romance', 'Biography',
  'History', 'Science', 'Self-Help', 'Poetry'
];

function BookForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial: BookFormData;
  onSubmit: (data: BookFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<BookFormData>(initial);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{submitLabel} Book</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Author</label>
            <input type="text" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
              className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Price ($)</label>
              <input type="number" step="0.01" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Genre</label>
              <select value={form.genre || ''} onChange={(e) => setForm({ ...form, genre: e.target.value || null })}
                className="w-full border border-gray-300 px-3 py-1.5 text-sm bg-white">
                <option value="">-</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })}
              className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Cover URL</label>
            <input type="url" value={form.cover_url || ''} onChange={(e) => setForm({ ...form, cover_url: e.target.value || null })}
              className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-gray-800 text-white py-1.5 text-sm hover:bg-gray-900">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchBooks(); }, []);

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setBooks(data || []);
    setLoading(false);
  }

  async function handleAdd(data: BookFormData) {
    const { error } = await supabase.from('books').insert(data);
    if (error) { setError(error.message); return; }
    setShowForm(false);
    fetchBooks();
  }

  async function handleEdit(data: BookFormData) {
    if (!editingBook) return;
    const { error } = await supabase.from('books').update(data).eq('id', editingBook.id);
    if (error) { setError(error.message); return; }
    setEditingBook(null);
    fetchBooks();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this book?')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    fetchBooks();
  }

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    (b.genre || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={20} />
            <span className="font-medium">Bookstore</span>
          </div>
          <button onClick={() => setShowForm(true)} className="border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">
            + Add book
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, author, genre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">{books.length === 0 ? 'No books yet. Add one.' : 'No matches.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((book) => (
              <div key={book.id} className="border border-gray-200 bg-white">
                <div className="aspect-[2/3] bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen size={24} className="text-gray-300" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{book.author}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">${book.price.toFixed(2)}</span>
                    {book.genre && <span className="text-[10px] text-gray-400">{book.genre}</span>}
                  </div>
                  <div className="flex gap-2 mt-2 pt-1 border-t border-gray-100">
                    <button onClick={() => setEditingBook(book)} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
                    <button onClick={() => handleDelete(book.id)} className="text-xs text-gray-500 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && <BookForm initial={emptyForm} onSubmit={handleAdd} onCancel={() => setShowForm(false)} submitLabel="Add" />}
      {editingBook && <BookForm initial={{
        title: editingBook.title,
        author: editingBook.author,
        price: editingBook.price,
        genre: editingBook.genre,
        description: editingBook.description,
        cover_url: editingBook.cover_url,
      }} onSubmit={handleEdit} onCancel={() => setEditingBook(null)} submitLabel="Save" />}
    </div>
  );
}