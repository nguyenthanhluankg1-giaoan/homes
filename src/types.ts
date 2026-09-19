export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  theme?: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  adminSecret?: string;
}

export interface Link {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  url: string;
  iconUrl: string;
  order: number;
  adminSecret?: string;
}

export interface ThemeConfig {
  primary: string;
  background: string;
  text: string;
  card: string;
}
