import { create } from 'zustand';
import { type Category, type NewCategory } from '../db/schema';
import {
  getAllCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
} from '../db/queries/categories';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (data: Omit<NewCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: number, data: Partial<Omit<NewCategory, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  isLoading: false,

  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const result = await getAllCategories();
      set({ categories: result });
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (data) => {
    await insertCategory(data);
    const result = await getAllCategories();
    set({ categories: result });
  },

  updateCategory: async (id, data) => {
    await updateCategory(id, data);
    const result = await getAllCategories();
    set({ categories: result });
  },

  deleteCategory: async (id) => {
    await deleteCategory(id);
    const result = await getAllCategories();
    set({ categories: result });
  },
}));
