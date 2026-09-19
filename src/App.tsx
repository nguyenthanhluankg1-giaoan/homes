import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, GripVertical, ExternalLink, Moon, Sun, Layout, LogIn, LogOut, Settings } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { Category, Link as LinkType } from './types';
import { subscribeCategories, subscribeLinks, addCategory, addLink, deleteLink, deleteCategory, updateLinkOrder } from './lib/db';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { cn, resizeImage } from './lib/utils';

const ICON_API = 'https://www.google.com/s2/favicons?sz=64&domain=';

export default function App() {
  const { user, profile, isAdmin, login, logout, loading, changePassword } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  
  const [newLink, setNewLink] = useState({ title: '', description: '', url: '', categoryId: '', iconUrl: '' });
  const [newCat, setNewCat] = useState({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  React.useEffect(() => {
    const unsubCat = subscribeCategories((data) => {
      setCategories(data);
      setError(null);
    });
    const unsubLinks = subscribeLinks((data) => {
      setLinks(data);
      setError(null);
    });
    return () => {
      unsubCat();
      unsubLinks();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const success = await login(loginForm.username, loginForm.password);
    if (success) {
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không đúng');
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !isAdmin) return;
    
    const { source, destination, draggableId } = result;
    const categoryLinks = links.filter(l => l.categoryId === source.droppableId);
    
    const reorderedLinks: LinkType[] = Array.from(categoryLinks);
    const [removed] = reorderedLinks.splice(source.index, 1);
    reorderedLinks.splice(destination.index, 0, removed);

    const updates = reorderedLinks.map((link: LinkType, index: number) => ({
      id: link.id,
      order: index
    }));

    await updateLinkOrder(updates);
  };

  const filteredLinks = links.filter(link => 
    (selectedCategoryId === 'all' || link.categoryId === selectedCategoryId) &&
    (link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url || !newLink.categoryId) return;
    
    let finalIconUrl = newLink.iconUrl;
    if (!finalIconUrl) {
      try {
        const domain = new URL(newLink.url).hostname;
        finalIconUrl = `${ICON_API}${domain}`;
      } catch (err) {
        finalIconUrl = `https://ui-avatars.com/api/?name=${newLink.title}&background=random`;
      }
    }

    await addLink({
      title: newLink.title,
      description: newLink.description,
      url: newLink.url,
      categoryId: newLink.categoryId,
      iconUrl: finalIconUrl,
      order: links.filter(l => l.categoryId === newLink.categoryId).length
    });
    setNewLink({ title: '', description: '', url: '', categoryId: '', iconUrl: '' });
    setShowAddModal(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name || !user) return;
    await addCategory(newCat.name, categories.length);
    setNewCat({ name: '' });
    setShowCatModal(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    const success = await changePassword(passwordForm.newPassword);
    if (success) {
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } else {
      setPasswordError('Có lỗi xảy ra khi đổi mật khẩu');
    }
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-red-100 dark:border-red-900/30 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Lỗi kết nối</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng kiểm tra quyền truy cập của bạn.</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Tải lại trang
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-zinc-200 border-t-zinc-600 animate-spin" />
        <p className="text-zinc-500 font-medium">Đang tải...</p>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDark ? "dark bg-zinc-950 text-zinc-100" : "bg-[#f0f7ff] text-zinc-900")}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md border-b border-blue-100 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Layout className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block text-blue-600">GIÁO DỤC HIỆN ĐẠI</h1>
          </div>

          <div className="flex-1 max-w-xl relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm kiếm liên kết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-blue-50 dark:bg-zinc-800 border-none rounded-full focus:ring-2 focus:ring-blue-600 dark:focus:ring-white transition-all outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Chuyển chế độ tối"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {isAdmin && (
              <>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn("p-2 rounded-lg transition-colors", isEditing ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
                  title="Quản lý"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Đổi mật khẩu"
                >
                  <LogIn className="w-5 h-5 rotate-90" />
                </button>
              </>
            )}

            {user ? (
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Horizontal Category Navigation */}
        <div className="mb-8 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm",
              selectedCategoryId === 'all' 
                ? "bg-blue-600 text-white dark:bg-blue-500 shadow-blue-200/50" 
                : "bg-white dark:bg-zinc-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 border border-blue-100 dark:border-zinc-800"
            )}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 shadow-sm",
                selectedCategoryId === category.id 
                  ? "bg-blue-600 text-white dark:bg-blue-500 shadow-blue-200/50" 
                  : "bg-white dark:bg-zinc-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 border border-blue-100 dark:border-zinc-800"
              )}
            >
              {category.name}
              {isEditing && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Xóa danh mục "${category.name}" và tất cả liên kết bên trong?`)) {
                      deleteCategory(category.id);
                      if (selectedCategoryId === category.id) setSelectedCategoryId('all');
                    }
                  }}
                  className="p-1 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-16">
            {categories
              .filter(c => selectedCategoryId === 'all' || c.id === selectedCategoryId)
              .map(category => (
                <section key={category.id} className="space-y-6">
                  <Droppable droppableId={category.id} direction="horizontal">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                    >
                      {filteredLinks
                        .filter(l => l.categoryId === category.id)
                        .map((link: LinkType, index: number) => (
                          <React.Fragment key={link.id}>
                            <Draggable 
                              draggableId={link.id} 
                              index={index}
                              isDragDisabled={!isEditing}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "group relative flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white dark:bg-zinc-900 border border-blue-50 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-white transition-all hover:shadow-xl hover:shadow-blue-900/5",
                                    snapshot.isDragging && "shadow-2xl z-50 scale-105"
                                  )}
                                >
                                  {isEditing && (
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="absolute top-2 left-2 p-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-white cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  )}
                                  
                                  <a 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-4 w-full"
                                  >
                                    <div className="w-32 h-32 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                                      <img 
                                        src={link.iconUrl} 
                                        alt={link.title}
                                        className="w-28 h-28 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${link.title}&background=random`;
                                        }}
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-1 w-full px-2">
                                      <span className="text-base font-bold text-center line-clamp-1 w-full text-zinc-700 dark:text-zinc-300 tracking-tight">
                                        {link.title}
                                      </span>
                                      {link.description && (
                                        <span className="text-xs text-center line-clamp-2 w-full text-zinc-500 dark:text-zinc-400 font-medium">
                                          {link.description}
                                        </span>
                                      )}
                                    </div>
                                  </a>

                                  {isEditing && (
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        deleteLink(link.id);
                                      }}
                                      className="absolute top-2 right-2 p-1 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          </React.Fragment>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
      </main>

      {/* Admin Floating Buttons */}
      {isAdmin && isEditing && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4">
          <button 
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-semibold">Thêm danh mục</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-bold">Thêm liên kết mới</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Đăng nhập Admin</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Tài khoản</label>
                  <input 
                    type="text" 
                    required
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Mật khẩu</label>
                  <input 
                    type="password" 
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-500 font-medium">{loginError}</p>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold hover:opacity-90 transition-opacity"
                  >
                    Đăng nhập
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Thêm liên kết mới</h3>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Tên liên kết</label>
                  <input 
                    type="text" 
                    required
                    value={newLink.title}
                    onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                    placeholder="VD: Google"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Mô tả (Mục phụ)</label>
                  <textarea 
                    value={newLink.description}
                    onChange={e => setNewLink({ ...newLink, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none resize-none"
                    placeholder="VD: Công cụ tìm kiếm hàng đầu"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Đường dẫn (URL)</label>
                  <input 
                    type="url" 
                    required
                    value={newLink.url}
                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                    placeholder="https://google.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Biểu tượng (URL hoặc Tải lên)</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={newLink.iconUrl}
                      onChange={e => setNewLink({ ...newLink, iconUrl: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                      placeholder="URL biểu tượng hoặc để trống"
                    />
                    <label className="shrink-0 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <Plus className="w-6 h-6 text-zinc-500" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const resizedDataUrl = await resizeImage(file);
                              setNewLink({ ...newLink, iconUrl: resizedDataUrl });
                            } catch (err) {
                              console.error('Lỗi khi xử lý ảnh:', err);
                              alert('Không thể xử lý hình ảnh này. Vui lòng chọn ảnh khác.');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Danh mục</label>
                  <select 
                    required
                    value={newLink.categoryId}
                    onChange={e => setNewLink({ ...newLink, categoryId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none appearance-none"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold hover:opacity-90 transition-opacity"
                  >
                    Lưu lại
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Thêm danh mục mới</h3>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Tên danh mục</label>
                  <input 
                    type="text" 
                    required
                    value={newCat.name}
                    onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                    placeholder="VD: Học tập"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCatModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold hover:opacity-90 transition-opacity"
                  >
                    Thêm ngay
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">Đổi mật khẩu</h2>
                  <button 
                    onClick={() => setShowPasswordModal(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Mật khẩu mới</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                      placeholder="Ít nhất 6 ký tự"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Xác nhận mật khẩu mới</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-green-500 text-sm font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">{passwordSuccess}</p>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span>Cập nhật mật khẩu</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
