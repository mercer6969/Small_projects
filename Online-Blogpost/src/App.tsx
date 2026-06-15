import { AuthProvider, useAuth } from './lib/auth';
import { useState, useEffect, FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { LogOut, Plus, Edit3, Trash2, ArrowLeft, BookOpen } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
}

type View = 'home' | 'post' | 'new' | 'edit' | 'auth';

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('home');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [singlePost, setSinglePost] = useState<Post | null>(null);

  useEffect(() => {
    if (view === 'home') fetchPosts();
  }, [view]);

  useEffect(() => {
    if (view === 'post' && selectedPostId) fetchSinglePost(selectedPostId);
  }, [view, selectedPostId]);

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false });
    if (data) setPosts(data as Post[]);
  }

  async function fetchSinglePost(id: string) {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(display_name)')
      .eq('id', id)
      .single();
    if (data) setSinglePost(data as Post);
  }

  function goToPost(id: string) {
    setSelectedPostId(id);
    setView('post');
  }

  function goHome() {
    setSelectedPostId(null);
    setSinglePost(null);
    setView('home');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <Header
        view={view}
        setView={setView}
        goHome={goHome}
      />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {view === 'home' && (
          <PostList posts={posts} goToPost={goToPost} />
        )}
        {view === 'post' && singlePost && (
          <PostView
            post={singlePost}
            goHome={goHome}
            setView={setView}
            setSelectedPostId={setSelectedPostId}
            refresh={fetchPosts}
          />
        )}
        {view === 'auth' && (
          <AuthForm onDone={goHome} />
        )}
        {(view === 'new' || view === 'edit') && (
          <PostForm
            mode={view}
            postId={selectedPostId}
            existingPost={view === 'edit' ? singlePost : null}
            onDone={goHome}
          />
        )}
      </main>
    </div>
  );
}

function Header({ view, setView, goHome }: { view: View; setView: (v: View) => void; goHome: () => void }) {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={goHome} className="flex items-center gap-2 text-stone-700 hover:text-stone-900 font-medium">
          <BookOpen size={20} />
          <span>Blog</span>
        </button>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {view === 'home' && (
                <button
                  onClick={() => setView('new')}
                  className="flex items-center gap-1 text-sm bg-stone-800 text-white px-3 py-1.5 rounded hover:bg-stone-700"
                >
                  <Plus size={16} />
                  New post
                </button>
              )}
              <button
                onClick={signOut}
                className="text-stone-400 hover:text-stone-600"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('auth')}
              className="text-sm text-stone-600 hover:text-stone-900 underline"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function PostList({ posts, goToPost }: { posts: Post[]; goToPost: (id: string) => void }) {
  const { user } = useAuth();

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-400 mb-2">No posts yet.</p>
        {user && (
          <p className="text-stone-500 text-sm">Click "New post" to write something.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="bg-white rounded border border-stone-200 p-5 hover:border-stone-300 transition-colors">
          <button
            onClick={() => goToPost(post.id)}
            className="text-left w-full"
          >
            <h2 className="text-lg font-semibold text-stone-800 mb-1 hover:underline">{post.title}</h2>
            <p className="text-sm text-stone-500 mb-3">
              {post.profiles?.display_name || 'Anonymous'} &middot; {formatDate(post.created_at)}
            </p>
            <p className="text-stone-600 leading-relaxed line-clamp-3">
              {post.body}
            </p>
          </button>
        </article>
      ))}
    </div>
  );
}

function PostView({ post, goHome, setView, setSelectedPostId, refresh }: {
  post: Post;
  goHome: () => void;
  setView: (v: View) => void;
  setSelectedPostId: (id: string | null) => void;
  refresh: () => void;
}) {
  const { user } = useAuth();

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    refresh();
    goHome();
  }

  return (
    <div>
      <button onClick={goHome} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} />
        Back
      </button>
      <article>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">{post.title}</h1>
        <p className="text-sm text-stone-500 mb-6">
          {post.profiles?.display_name || 'Anonymous'} &middot; {formatDate(post.created_at)}
          {post.updated_at !== post.created_at && (
            <> &middot; edited {formatDate(post.updated_at)}</>
          )}
        </p>
        <div className="prose prose-stone whitespace-pre-wrap leading-relaxed text-stone-700">
          {post.body}
        </div>
      </article>
      {user?.id === post.user_id && (
        <div className="flex gap-3 mt-8 pt-6 border-t border-stone-200">
          <button
            onClick={() => { setSelectedPostId(post.id); setView('edit'); }}
            className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function PostForm({ mode, postId, existingPost, onDone }: {
  mode: 'new' | 'edit';
  postId: string | null;
  existingPost: Post | null;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(existingPost?.title ?? '');
  const [body, setBody] = useState(existingPost?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <p className="text-stone-400">You need to sign in to write a post.</p>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (mode === 'new') {
        const { error: err } = await supabase
          .from('posts')
          .insert({ title, body, user_id: user.id });
        if (err) throw err;
      } else if (mode === 'edit' && postId) {
        const { error: err } = await supabase
          .from('posts')
          .update({ title, body, updated_at: new Date().toISOString() })
          .eq('id', postId);
        if (err) throw err;
      }
      onDone();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button onClick={onDone} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} />
        Back
      </button>
      <h1 className="text-xl font-bold mb-6">{mode === 'new' ? 'New Post' : 'Edit Post'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Content</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-500 resize-y"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-stone-800 text-white text-sm px-4 py-2 rounded hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'new' ? 'Publish' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function AuthForm({ onDone }: { onDone: () => void }) {
  const { signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        setSuccess('Account created! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email, password);
        onDone();
      }
    } catch {
      setError(isSignUp ? 'Could not create account. Email may already be in use.' : 'Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-6">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-stone-800 text-white text-sm px-4 py-2 rounded hover:bg-stone-700 disabled:opacity-50"
        >
          {busy ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>
      <p className="text-sm text-stone-500 mt-4 text-center">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
          className="text-stone-700 underline"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default App;
