export type CategorySlug =
  | "world"
  | "technology"
  | "politics"
  | "economy"
  | "business"
  | "sport"
  | "science";

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string;
  color: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  coverImage: string;
  sourceUrl: string;
  category: CategorySlug;
  categoryName: string;
  publishedAt: string;
  readingTime: number;
  featured: boolean;
  popular: boolean;
  editorPick: boolean;
  tags: string[];
  likes: number;
  views: number;
  comments: Comment[];
}

export interface CreateArticlePayload {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  sourceUrl: string;
  category: string;
  content: string[];
  tags: string[];
}

export interface DashboardStats {
  totalArticles: number;
  totalViews: number;
  totalComments: number;
}
