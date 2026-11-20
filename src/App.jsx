
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, ChevronLeft, ChevronRight, Moon, Sun,
  Type, Download, Share2, Lock, LogOut, Plus, Pencil,
  Trash2, X, Music, Menu, ArrowUp, ArrowDown
} from 'lucide-react';

export default function App() {
  const [songs, setSongs] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState('English');
  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState('');
  const [fontSize, setFontSize] = useState(19);
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    lyrics: '',
    language: 'Malayalam',
    category: 'Christmas'
  });
  const [saving, setSaving] = useState(false);

  const loadSongs = async () => {
    const { data, error: fetchError } = await supabase
      .from('songs')
      .select('*')
      .order('song_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSongs(data || []);
      setError('');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSongs();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => setSession(currentSession)
    );

    const channel = supabase
      .channel('carol-book-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => loadSongs()
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

 
const filteredSongs = useMemo(() => {
  const term = search.trim().toLowerCase();

  return songs.filter(song => {
    const songLanguage = (song.language || '').toLowerCase();

    const matchesLanguage =
      activeLanguage === 'English'
        ? songLanguage === 'english' || songLanguage === 'malayalam & english'
        : songLanguage === 'malayalam' || songLanguage === 'malayalam & english';

    const matchesSearch = !term ||
      `${song.title} ${song.lyrics} ${song.category} ${song.language}`
        .toLowerCase()
        .includes(term);

    return matchesLanguage && matchesSearch;
  });
}, [songs, search, activeLanguage]);


  const currentSong = filteredSongs[selected] || null;

  useEffect(() => {
  setSelected(0);
}, [search, activeLanguage]);

  const changeSong = (direction) => {
    setSelected(index =>
      Math.max(0, Math.min(filteredSongs.length - 1, index + direction))
    );
  };

  const login = async (event) => {
    event.preventDefault();
    setLoginError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    });

    if (authError) {
      setLoginError(authError.message);
    } else {
      setAdminOpen(false);
      setLoginPassword('');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdminOpen(false);
  };

  const openNewSong = () => {
    setEditing(null);
    setForm({
      title: '',
      lyrics: '',
      language: 'Malayalam',
      category: 'Christmas'
    });
    setFormOpen(true);
  };

  const openEditSong = (song) => {
    setEditing(song);
    setForm({
      title: song.title || '',
      lyrics: song.lyrics || '',
      language: song.language || 'Malayalam',
      category: song.category || 'Christmas'
    });
    setFormOpen(true);
  };

  const saveSong = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.lyrics.trim()) return;

    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      lyrics: form.lyrics,
      language: form.language,
      category: form.category
    };

    let result;

    if (editing) {
      result = await supabase
        .from('songs')
        .update(payload)
        .eq('id', editing.id);
    } else {
      const nextOrder = songs.length
        ? Math.max(...songs.map(song => Number(song.song_order) || 0)) + 1
        : 1;

      result = await supabase
        .from('songs')
        .insert([{ ...payload, song_order: nextOrder }]);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setFormOpen(false);
    await loadSongs();
  };

  const deleteSong = async (song) => {
    if (!window.confirm(`Delete "${song.title}"? This cannot be undone.`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('songs')
      .delete()
      .eq('id', song.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await loadSongs();
      setSelected(0);
    }
  };

  const moveSong = async (song, direction) => {
    const index = songs.findIndex(item => item.id === song.id);
    const other = songs[index + direction];
    if (!other) return;

    const firstOrder = song.song_order;
    const secondOrder = other.song_order;

    const { error: firstError } = await supabase
      .from('songs')
      .update({ song_order: secondOrder })
      .eq('id', song.id);

    const { error: secondError } = await supabase
      .from('songs')
      .update({ song_order: firstOrder })
      .eq('id', other.id);

    if (firstError || secondError) {
      setError(firstError?.message || secondError?.message);
    } else {
      await loadSongs();
    }
  };

  const shareSong = async () => {
    const url = window.location.href;
    const text = currentSong
      ? `${currentSong.title}\n\n${currentSong.lyrics}\n\nSMOC Carols 2K26`
      : 'SMOC Carols 2K26 – Digital Carol Book';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'SMOC Carols 2K26', text, url });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      alert('Carol and link copied!');
    }
  };

  const downloadPDF = () => {
    window.print();
  };
  
const printableSongs = songs.filter(song => {
  const lang = (song.language || '').toLowerCase();

  return activeLanguage === 'English'
    ? lang === 'english' || lang === 'malayalam & english'
    : lang === 'malayalam' || lang === 'malayalam & english';
});


  return (
    
<div className={dark ? 'app dark' : 'app'}>
  <header className="topbar">
    <div className="brand">
      <div className="brand-icon">
  ♪
</div>

      <div>
        <h1>SMOC CAROLS</h1>
        <span>CHRISTMAS 2K26</span>
      </div>
    </div>

    <div className="header-actions">
      <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">
        {dark ? <Sun /> : <Moon />}
      </button>

      <button className="icon-btn" onClick={shareSong} title="Share">
        <Share2 />
      </button>

      <button className="icon-btn" onClick={downloadPDF} title="Print or save PDF">
        <Download />
      </button>

      <button className="admin-button" onClick={() => setAdminOpen(true)}>
        <Lock size={16} />
        {session ? 'Admin' : 'Admin Login'}
      </button>
    </div>
  </header>


      <main className="main-content">
        <section className="hero">
          <div className="hero-decoration">
  <img src="/PNG (5).png" alt="SMOC Church Logo" />
</div>
          <p className="eyebrow">ST. MARY'S ORTHODOX CATHEDRAL</p>
          <h2>The Digital<br /><span>Carol Book</span></h2>
          <p className="hero-subtitle">
            Let every heart prepare Him room.
          </p>
          <div className="hero-star">✧　❄　✧</div>
        </section>

        <section className="book-section">
          <div className="section-heading">
            <div>
              <span className="section-label">THE COLLECTION</span>
              <h2>Christmas Carols</h2>
            </div>
            <span className="song-count">{songs.length} SONGS</span>
          </div>
          
<div className="language-selector">
  <button
    className={activeLanguage === 'English' ? 'language-btn active' : 'language-btn'}
    onClick={() => setActiveLanguage('English')}
  >
    English
  </button>

  <button
    className={activeLanguage === 'Malayalam' ? 'language-btn active' : 'language-btn'}
    onClick={() => setActiveLanguage('Malayalam')}
  >
    മലയാളം
  </button>
</div>


          <div className="search-box">
            <Search size={19} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search carol titles or lyrics..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X size={17} /></button>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Opening the carol book...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="empty-state">
              <Music size={35} />
              <h3>{songs.length ? 'No matching carols' : 'Your carol book is waiting'}</h3>
              <p>{songs.length ? 'Try another search.' : 'Carols will appear here once added by the administrator.'}</p>
            </div>
          ) : (
            <div className="book-layout">
              <aside className="song-list">
                <div className="list-heading">SONG INDEX</div>
                {filteredSongs.map((song, index) => (
                  <button
                    key={song.id}
                    className={`song-list-item ${selected === index ? 'active' : ''}`}
                    onClick={() => setSelected(index)}
                  >
                    <span className="song-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="song-list-title">{song.title}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </aside>

              <section className="song-view">
                <AnimatePresence mode="wait">
                  {currentSong && (
                    <motion.article
                      key={currentSong.id}
                      className="song-page"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="song-meta">
                        <span>{currentSong.category || 'CHRISTMAS'}</span>
                        <span>{currentSong.language || 'Malayalam'}</span>
                      </div>

                      <div className="song-title-area">
                        <span className="song-ornament">✧</span>
                        <h2>{currentSong.title}</h2>
                        <span className="song-ornament">✧</span>
                      </div>

                      <div className="lyrics" style={{ fontSize: `${fontSize}px` }}>
                        {currentSong.lyrics}
                      </div>

                      <div className="song-footer">
                        <span>✦　SMOC CAROLS 2K26　✦</span>
                      </div>
                    </motion.article>
                  )}
                </AnimatePresence>

                <div className="reader-controls">
                  <button
                    className="nav-button"
                    onClick={() => changeSong(-1)}
                    disabled={selected === 0}
                  >
                    <ChevronLeft size={18} /> Previous
                  </button>

                  <span className="page-number">
                    {selected + 1} / {filteredSongs.length}
                  </span>

                  <button
                    className="nav-button"
                    onClick={() => changeSong(1)}
                    disabled={selected >= filteredSongs.length - 1}
                  >
                    Next <ChevronRight size={18} />
                  </button>
                </div>

                <div className="reading-tools">
                  <Type size={17} />
                  <span>Text size</span>
                  <button onClick={() => setFontSize(size => Math.max(14, size - 1))}>A−</button>
                  <span className="font-value">{fontSize}</span>
                  <button onClick={() => setFontSize(size => Math.min(30, size + 1))}>A+</button>
                </div>

                {session && (
                  <div className="admin-song-actions">
                    <button onClick={() => openEditSong(currentSong)}>
                      <Pencil size={15} /> Edit song
                    </button>
                    <button className="danger-button" onClick={() => deleteSong(currentSong)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

<div className="print-book">
  {printableSongs.map((song, index) => (
    <article className="print-song" key={song.id}>
      <div className="print-song-header">
        SMOC CAROLS 2K26
      </div>

      <p className="print-song-number">
        {String(index + 1).padStart(2, '0')}
      </p>

      <h1>{song.title}</h1>

      <p className="print-song-category">
        {song.category || 'CHRISTMAS'}
      </p>

      <div className="print-song-lyrics">
        {song.lyrics}
      </div>

      <div className="print-song-footer">
        ST. MARY'S ORTHODOX CATHEDRAL · COIMBATORE
      </div>
    </article>
  ))}
</div>

        {session && (
          <section className="admin-panel">
            <div>
              <span className="section-label">ADMINISTRATION</span>
              <h3>Manage your carols</h3>
              <p>Add songs, update lyrics and arrange the song order.</p>
            </div>
            <button className="primary-button" onClick={openNewSong}>
              <Plus size={18} /> Add New Carol
            </button>

            <div className="admin-order-list">
              {songs.map((song, index) => (
                <div className="admin-order-item" key={song.id}>
                  <span>{index + 1}. {song.title}</span>
                  <div>
                    <button disabled={index === 0} onClick={() => moveSong(song, -1)} title="Move up">
                      <ArrowUp size={16} />
                    </button>
                    <button disabled={index === songs.length - 1} onClick={() => moveSong(song, 1)} title="Move down">
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={() => openEditSong(song)} title="Edit">
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="footer">
          <div className="footer-star">✧</div>
          <p>GLORY TO GOD IN THE HIGHEST</p>
          <span>St. Mary's Orthodox Cathedral · Coimbatore</span>
          <small>SMOC CAROLS 2K26</small>
        </footer>
      </main>

      {adminOpen && (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAdminOpen(false)}>
              <X />
            </button>

            {session ? (
              <>
                <div className="modal-icon"><Lock /></div>
                <h2>Administrator</h2>
                <p>You are signed in to manage the carol book.</p>
                <button className="primary-button full-button" onClick={() => {
                  setAdminOpen(false);
                  document.querySelector('.admin-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Manage Carols
                </button>
                <button className="secondary-button full-button" onClick={logout}>
                  <LogOut size={17} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <div className="modal-icon"><Lock /></div>
                <h2>Admin Login</h2>
                <p>Sign in to manage the Christmas carols.</p>
                <form onSubmit={login}>
                  <input
                    type="email"
                    placeholder="Admin email"
                    value={loginEmail}
                    onChange={event => setLoginEmail(event.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={event => setLoginPassword(event.target.value)}
                    required
                  />
                  {loginError && <p className="error-message">{loginError}</p>}
                  <button className="primary-button full-button" type="submit">
                    Sign In
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div className="modal song-form-modal" onClick={event => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFormOpen(false)}>
              <X />
            </button>
            <div className="modal-icon"><Music /></div>
            <h2>{editing ? 'Edit Carol' : 'Add New Carol'}</h2>
            <form onSubmit={saveSong}>
              <label>Carol title</label>
              <input
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                placeholder="Enter carol title"
                required
              />

              <label>Lyrics</label>
              <textarea
                value={form.lyrics}
                onChange={event => setForm({ ...form, lyrics: event.target.value })}
                placeholder="Enter complete lyrics..."
                rows={10}
                required
              />

              <label>Language</label>
              <select
                value={form.language}
                onChange={event => setForm({ ...form, language: event.target.value })}
              >
                <option>Malayalam</option>
                <option>English</option>
                <option>Malayalam & English</option>
                <option>Other</option>
              </select>

              <label>Category</label>
              <input
                value={form.category}
                onChange={event => setForm({ ...form, category: event.target.value })}
                placeholder="Christmas"
              />

              <button className="primary-button full-button" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Carol'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
